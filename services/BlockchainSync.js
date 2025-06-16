const { Web3 } = require("web3");
const fs = require("fs");
const path = require("path");
const Logger = require("../utils/logger");
const { prepareForLogging } = require("../utils/loggingHelper");

// Serialize BigInt values to strings for MongoDB
function serializeBigInt(obj) {
  if (obj === null || typeof obj !== "object") {
    if (typeof obj === "bigint") {
      return obj.toString();
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  const serialized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "bigint") {
      serialized[key] = value.toString();
    } else if (typeof value === "object") {
      serialized[key] = serializeBigInt(value);
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

class BlockchainSync {
  constructor(mongoClient, dbName) {
    try {
      this.mongoClient = mongoClient;
      this.dbName = dbName;

      this.web3 = new Web3(
        new Web3.providers.HttpProvider("http://127.0.0.1:8545")
      );

      const projectRoot = path.resolve(__dirname, "..");
      const contractsPath = path.join(projectRoot, "public/contracts");

      if (!fs.existsSync(contractsPath)) {
        throw new Error("Contracts directory not found");
      }

      // Load both contracts
      const propertyRegistryPath = path.join(
        contractsPath,
        "contracts/PropertyRegistry.sol/PropertyRegistry.json"
      );
      const documentVerificationPath = path.join(
        contractsPath,
        "contracts/DocumentVerification.sol/DocumentVerification.json"
      );
      const addressesPath = path.join(contractsPath, "contract-addresses.json");

      if (
        !fs.existsSync(propertyRegistryPath) ||
        !fs.existsSync(documentVerificationPath) ||
        !fs.existsSync(addressesPath)
      ) {
        throw new Error("Contract files not found");
      }

      // Read contract addresses
      const addresses = JSON.parse(fs.readFileSync(addressesPath));
      const propertyContractAddress = addresses.PropertyRegistry;
      const documentContractAddress = addresses.DocumentVerification;

      if (!propertyContractAddress || !documentContractAddress) {
        throw new Error("Contract addresses not found");
      }

      // Initialize both contracts
      const propertyRegistryArtifact = JSON.parse(
        fs.readFileSync(propertyRegistryPath)
      );
      const documentVerificationArtifact = JSON.parse(
        fs.readFileSync(documentVerificationPath)
      );

      this.propertyContract = new this.web3.eth.Contract(
        propertyRegistryArtifact.abi,
        propertyContractAddress
      );
      this.documentContract = new this.web3.eth.Contract(
        documentVerificationArtifact.abi,
        documentContractAddress
      );

      // Set the default contract to propertyContract since it's used most frequently
      this.contract = this.propertyContract;

      Logger.success("BlockchainSync initialized successfully");
      Logger.info("PropertyRegistry Address:", propertyContractAddress);
      Logger.info("DocumentVerification Address:", documentContractAddress);
    } catch (error) {
      Logger.error("Failed to initialize BlockchainSync:", error.message);
      throw error;
    }
  }

  generateDeterministicId(propertyData) {
    const input = `${propertyData.propertyId}${propertyData.propertyName}${propertyData.locality}`;
    const hash = this.web3.utils.soliditySha3(input);
    return this.web3.utils.toChecksumAddress("0x" + hash.slice(-40));
  }

  async generateDocumentBlockchainId(docData) {
    const input = `${docData.requestId}${docData.userId}${Date.now()}`;
    const hash = this.web3.utils.soliditySha3(input);
    return this.web3.utils.toChecksumAddress("0x" + hash.slice(-40));
  }

  async getWalletAddress(email) {
    try {
      const db = this.mongoClient.db(this.dbName);
      const user = await db.collection("users").findOne({ email });
      if (
        user?.walletAddress &&
        this.web3.utils.isAddress(user.walletAddress)
      ) {
        return user.walletAddress;
      }
      return null;
    } catch (error) {
      Logger.error("Error fetching wallet address:", error);
      return null;
    }
  }

  async syncPropertyToMongoDB(propertyData, txHash) {
    const logSafeData = prepareForLogging({
      propertyId: propertyData.propertyId,
      blockchainId: propertyData.blockchainId,
      locality: propertyData.locality,
      txHash: txHash,
    });

    Logger.info(
      "🔍 BLOCKCHAIN SYNC: Starting property sync with data:",
      logSafeData
    );

    try {
      if (
        !propertyData ||
        !propertyData.locality ||
        !propertyData.blockchainId
      ) {
        throw new Error("Locality and blockchainId are required");
      }

      const locality = propertyData.locality.trim();
      if (!locality) {
        throw new Error("Locality cannot be empty");
      }

      if (!this.web3.utils.isAddress(propertyData.blockchainId)) {
        throw new Error("Invalid blockchain ID format");
      }

      if (!txHash || typeof txHash !== "string") {
        throw new Error("Invalid transaction hash provided");
      }

      const txReceipt = await this.web3.eth.getTransactionReceipt(txHash);
      if (!txReceipt) {
        throw new Error("Transaction receipt not found");
      }

      const block = await this.web3.eth.getBlock(txReceipt.blockNumber);
      if (!block) {
        throw new Error("Block not found");
      }

      const blockTimestamp = Number(block.timestamp);
      const db = this.mongoClient.db(this.dbName);

      const existingProperty = await db.collection("blockchainTxns").findOne({
        $or: [
          { propertyId: propertyData.propertyId },
          { "blockchainIds.id": propertyData.blockchainId },
        ],
      });

      const blockchainIds = existingProperty?.blockchainIds || [];
      const newBlockchainId = {
        id: propertyData.blockchainId,
        txHash: txHash,
        timestamp: new Date(blockTimestamp * 1000),
      };

      if (
        !blockchainIds.some((entry) => entry.id === propertyData.blockchainId)
      ) {
        blockchainIds.push(newBlockchainId);
      }

      const propertyDoc = {
        type: "PROPERTY",
        propertyId: propertyData.propertyId,
        currentBlockchainId: propertyData.blockchainId,
        blockchainIds: blockchainIds,
        propertyName: propertyData.propertyName || "Name not specified",
        locality: locality,
        propertyType: propertyData.propertyType || "Type not specified",
        owner: propertyData.owner,
        isVerified: propertyData.isVerified || false,
        registrationDate:
          existingProperty?.registrationDate || new Date(blockTimestamp * 1000),
        lastTransferDate: new Date(blockTimestamp * 1000),
        transactions: [
          ...(existingProperty?.transactions || []),
          {
            type: existingProperty ? "UPDATE" : "REGISTRATION",
            from: txReceipt.from,
            to: txReceipt.to,
            transactionHash: txHash,
            blockNumber: txReceipt.blockNumber.toString(),
            timestamp: new Date(blockTimestamp * 1000),
            locality: locality,
            blockchainId: propertyData.blockchainId,
          },
        ],
      };

      await db
        .collection("blockchainTxns")
        .updateOne(
          { propertyId: propertyData.propertyId },
          { $set: propertyDoc },
          { upsert: true }
        );

      await db
        .collection("blockchainTxns")
        .createIndex({ "blockchainIds.id": 1 });
      await db
        .collection("blockchainTxns")
        .createIndex({ "transactions.transactionHash": 1 });
      await db.collection("blockchainTxns").createIndex({ type: 1 });

      const verifyDoc = await db.collection("blockchainTxns").findOne({
        propertyId: propertyData.propertyId,
      });

      if (!verifyDoc) {
        throw new Error("Failed to verify upserted document");
      }

      return {
        ...propertyDoc,
        transactions: propertyDoc.transactions.map((tx) => ({
          ...tx,
          blockNumber: tx.blockNumber.toString(),
          timestamp: tx.timestamp.toISOString(),
        })),
      };
    } catch (error) {
      Logger.error("🚨 Error in syncPropertyToMongoDB:", error);
      throw error;
    }
  }

  async syncDocumentToBlockchain(docData) {
    try {
      Logger.info(
        "Starting document blockchain sync for requestId:",
        docData.requestId
      );

      const blockchainId = await this.generateDocumentBlockchainId(docData);
      const db = this.mongoClient.db(this.dbName);
      const userWalletAddress =
        (await this.getWalletAddress(docData.userId)) || docData.userId;

      await db.collection("verificationRequests").updateOne(
        { requestId: docData.requestId },
        {
          $set: {
            blockchainId: blockchainId,
            lastUpdated: new Date(),
          },
        }
      );

      const blockchainTxnDoc = {
        type: "DOCUMENT_VERIFICATION",
        requestId: docData.requestId,
        currentBlockchainId: blockchainId,
        blockchainIds: [
          {
            id: blockchainId,
            timestamp: new Date(),
          },
        ],
        owner: userWalletAddress,
        isVerified: false,
        documentType: docData.personalInfo.documentType,
        transactions: [
          {
            type: "SUBMISSION",
            timestamp: new Date(),
            blockchainId: blockchainId,
          },
        ],
      };

      await db.collection("blockchainTxns").insertOne(blockchainTxnDoc);

      await db.collection("blockchainTxns").createIndex({ type: 1 });
      await db.collection("blockchainTxns").createIndex({ requestId: 1 });
      await db
        .collection("blockchainTxns")
        .createIndex({ currentBlockchainId: 1 });

      Logger.success("Document synced to blockchain:", {
        requestId: docData.requestId,
        blockchainId: blockchainId,
      });

      return { blockchainId };
    } catch (error) {
      Logger.error("Error in document blockchain sync:", error);
      throw error;
    }
  }

  async restoreBlockchainState() {
    try {
      Logger.info("Starting blockchain state restoration...");
      const db = this.mongoClient.db(this.dbName);
      const transactions = await db
        .collection("blockchainTxns")
        .find({})
        .toArray();
      const accounts = await this.web3.eth.getAccounts();
      const deployer = accounts[0];

      Logger.info(
        `Found ${transactions.length} blockchain transactions to restore`
      );

      for (const record of transactions) {
        try {
          if (!record.currentBlockchainId) {
            Logger.warn("Skipping invalid record:", {
              id: record._id,
              hasBlockchainId: !!record.currentBlockchainId,
              type: record.type,
            });
            continue;
          }

          if (record.type === "DOCUMENT_VERIFICATION") {
            await this.restoreDocument(record, deployer);
          } else {
            await this.restoreProperty(record, deployer);
          }
        } catch (error) {
          Logger.error(
            `Error processing ${record.type} ${
              record.propertyId || record.requestId
            }:`,
            error
          );
        }
      }

      Logger.info("Blockchain state restoration complete");
    } catch (error) {
      Logger.error("Error in blockchain state restoration:", error);
      throw error;
    }
  }

  async restoreProperty(record, deployer) {
    Logger.info(`Processing property ${record.propertyId}`);

    let propertyExists = false;
    try {
      const propertyData = await this.propertyContract.methods
        .properties(record.currentBlockchainId)
        .call();

      propertyExists = propertyData && propertyData.propertyId !== "";
      Logger.info(`Property existence check:`, {
        exists: propertyExists,
        blockchainId: record.currentBlockchainId,
        propertyId: propertyData?.propertyId,
      });
    } catch (e) {
      Logger.warn("Error checking property existence:", e);
      propertyExists = false;
    }

    if (!propertyExists && record.propertyId) {
      Logger.info(`Registering property ${record.propertyId}`);
      try {
        // Get expected blockchainId by calling the same hashing logic
        const expectedId = this.generateDeterministicId({
          propertyId: record.propertyId,
          propertyName: record.propertyName || "Name not specified",
          locality: record.locality || "Locality not specified",
        });

        Logger.info("Expected blockchain ID:", expectedId);

        // Register the property
        const registerTx = await this.propertyContract.methods
          .registerProperty(
            record.propertyId,
            record.propertyName || "Name not specified",
            record.locality || "Locality not specified",
            record.propertyType || "Type not specified"
          )
          .send({
            from: deployer,
            gas: 500000,
          });

        // Get the PropertyRegistered event
        const events = registerTx.events;
        const registeredEvent = events.PropertyRegistered;
        const registeredBlockchainId = registeredEvent
          ? registeredEvent.returnValues.blockchainId
          : null;

        Logger.info("Registration transaction details:", {
          txHash: registerTx.transactionHash,
          events: events ? Object.keys(events) : [],
          registeredBlockchainId: registeredBlockchainId,
        });

        // Wait for confirmation
        Logger.info("Waiting for transaction confirmation...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify the property data using both IDs
        Logger.info("Verifying property registration...");
        let verificationSuccess = false;
        let finalBlockchainId = null;
        const idsToCheck = [
          record.currentBlockchainId,
          expectedId,
          registeredBlockchainId,
        ].filter((id) => id); // Remove null values

        for (let i = 0; i < 3; i++) {
          try {
            // Try each possible blockchain ID
            for (const blockchainId of idsToCheck) {
              Logger.info(`Attempting verification with ID: ${blockchainId}`);
              const verifyData = await this.propertyContract.methods
                .properties(blockchainId)
                .call();

              if (verifyData && verifyData.propertyId === record.propertyId) {
                Logger.info("Property registration verification successful:", {
                  blockchainId: blockchainId,
                  propertyId: verifyData.propertyId,
                  verifyData: verifyData,
                });

                finalBlockchainId = blockchainId;

                // Update the record's blockchainId if it's different
                if (blockchainId !== record.currentBlockchainId) {
                  Logger.info(
                    `Updating blockchainId from ${record.currentBlockchainId} to ${blockchainId}`
                  );
                  await this.updateBlockchainId(record, blockchainId);
                }

                await this.updateTransactionRecord(
                  { ...record, currentBlockchainId: blockchainId },
                  registerTx,
                  deployer,
                  "RESTORATION"
                );

                Logger.success(
                  `Property registered successfully. Transaction hash: ${registerTx.transactionHash}`
                );
                verificationSuccess = true;
                break;
              }
            }

            if (verificationSuccess) break;

            Logger.info(`Verification attempt ${i + 1} failed, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (verifyError) {
            Logger.warn(
              `Verification attempt ${i + 1} failed with error:`,
              verifyError
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (!verificationSuccess) {
          throw new Error(
            "Property verification failed after multiple attempts"
          );
        }

        // Set isVerified flag if the property was verified in the database
        if (record.isVerified === true) {
          await this.verifyPropertyOnBlockchain(
            finalBlockchainId || record.currentBlockchainId,
            deployer
          );
        }
      } catch (error) {
        Logger.error("Error registering property:", error);
        throw error;
      }
    } else {
      Logger.info(`Property ${record.propertyId} already exists on chain`);

      // If property exists but verification status doesn't match what's in MongoDB
      if (record.isVerified === true) {
        try {
          const onChainData = await this.propertyContract.methods
            .properties(record.currentBlockchainId)
            .call();

          if (onChainData && !onChainData.isVerified) {
            Logger.info(
              `Property ${record.propertyId} needs verification status update`
            );
            await this.verifyPropertyOnBlockchain(
              record.currentBlockchainId,
              deployer
            );
          }
        } catch (error) {
          Logger.error("Error checking/updating verification status:", error);
        }
      }
    }

    // Add delay before ownership transfer
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.handleOwnershipTransfer(record, deployer);
  }

  async verifyPropertyOnBlockchain(blockchainId, deployer) {
    try {
      Logger.info(
        `Setting verified status for property with ID ${blockchainId}`
      );

      // Check if the property exists and its current status
      const propertyData = await this.propertyContract.methods
        .properties(blockchainId)
        .call();

      if (!propertyData || !propertyData.propertyId) {
        throw new Error("Property not found on blockchain");
      }

      if (propertyData.isVerified) {
        Logger.info(
          "Property is already verified on blockchain. Skipping verification."
        );
        return;
      }

      // Call the verify function on the contract
      const verifyTx = await this.propertyContract.methods
        .verifyProperty(blockchainId)
        .send({
          from: deployer,
          gas: 200000,
        });

      Logger.success(
        `Property verification successful. Transaction hash: ${verifyTx.transactionHash}`
      );

      // Verify that the property is now marked as verified
      const updatedProperty = await this.propertyContract.methods
        .properties(blockchainId)
        .call();

      if (!updatedProperty.isVerified) {
        throw new Error(
          "Property verification failed - status not updated on blockchain"
        );
      }
    } catch (error) {
      Logger.error("Error verifying property on blockchain:", error);
      throw error;
    }
  }

  // Helper function to update blockchain ID in database
  async updateBlockchainId(record, newBlockchainId) {
    const db = this.mongoClient.db(this.dbName);
    const collection = db.collection("blockchainTxns");

    await collection.updateOne(
      { propertyId: record.propertyId },
      {
        $set: { currentBlockchainId: newBlockchainId },
        $push: {
          blockchainIds: {
            id: newBlockchainId,
            timestamp: new Date(),
          },
        },
      }
    );

    Logger.info("Updated blockchain ID in database");
  }

  async restoreDocument(record, deployer) {
    Logger.info(`Processing document ${record.requestId}`);

    let documentExists = false;
    try {
      const documentId = this.web3.utils.soliditySha3(
        record.currentBlockchainId,
        record.requestId
      );
      await this.documentContract.methods.getDocument(documentId).call();
      documentExists = true;
      Logger.info(`Document ${record.requestId} already exists on chain`);
    } catch (e) {
      documentExists = false;
    }

    if (!documentExists && record.requestId) {
      try {
        Logger.info(`Registering document ${record.requestId}`);
        const documentId = this.web3.utils.soliditySha3(
          record.currentBlockchainId,
          record.requestId
        );

        const registerTx = await this.documentContract.methods
          .verifyDocument(
            record.currentBlockchainId,
            record.documentType || "Document",
            record.owner || deployer,
            Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
            ""
          )
          .send({
            from: deployer,
            gas: 500000,
          });

        await this.updateTransactionRecord(
          record,
          registerTx,
          deployer,
          "RESTORATION"
        );
        Logger.success(
          `Document registered successfully. Transaction hash: ${registerTx.transactionHash}`
        );
      } catch (error) {
        Logger.error(`Error registering document:`, error);
        throw error;
      }
    }

    await this.handleOwnershipTransfer(record, deployer);
  }

  async handleOwnershipTransfer(record, deployer) {
    if (record.owner) {
      let ownerAddress;

      if (this.web3.utils.isAddress(record.owner)) {
        ownerAddress = record.owner;
      } else if (record.owner.includes("@")) {
        ownerAddress = await this.getWalletAddress(record.owner);
      }

      if (ownerAddress) {
        await this.transferOwnership(
          record.currentBlockchainId,
          ownerAddress,
          deployer
        );
      } else {
        Logger.warn(`No valid wallet address found for owner: ${record.owner}`);
      }
    }
  }

  async updateTransactionRecord(record, tx, deployer, type = "RESTORATION") {
    try {
      const db = this.mongoClient.db(this.dbName);
      const collection = db.collection("blockchainTxns");

      // Format transaction data
      const txData = {
        type,
        from: deployer,
        to: tx.to,
        transactionHash: tx.transactionHash,
        blockNumber: String(tx.blockNumber), // Convert to string
        timestamp: new Date(),
        blockchainId: record.currentBlockchainId,
      };

      await collection.updateOne(
        { currentBlockchainId: record.currentBlockchainId },
        {
          $push: {
            transactions: txData,
          },
        }
      );

      Logger.info("Transaction record updated:", txData);
    } catch (error) {
      Logger.error("Error updating transaction record:", error);
      throw error;
    }
  }

  async transferOwnership(propertyId, newOwner, deployer) {
    try {
      const property = await this.propertyContract.methods
        .getProperty(propertyId)
        .call();
      if (property.owner.toLowerCase() !== newOwner.toLowerCase()) {
        await this.propertyContract.methods
          .transferOwnership(propertyId, newOwner)
          .send({
            from: deployer,
            gas: 200000,
          });
        Logger.info(`Ownership transferred to ${newOwner}`);
      }
    } catch (error) {
      Logger.error("Error in ownership transfer:", error);
      throw error;
    }
  }
}

module.exports = BlockchainSync;
