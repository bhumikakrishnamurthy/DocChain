const process = require("process");
process.noDeprecation = true;
require("dotenv").config();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const BlockchainSync = require("../services/BlockchainSync");
const Logger = require("../utils/logger");

async function restoreBlockchain() {
  let client;
  try {
    // Check if files exist before starting
    const contractsPath = path.join(__dirname, "../public/contracts");
    const artifactPath = path.join(
      contractsPath,
      "contracts/PropertyRegistry.sol/PropertyRegistry.json"
    );
    const addressPath = path.join(contractsPath, "contract-addresses.json");

    if (!fs.existsSync(artifactPath)) {
      Logger.error(`Artifact not found at: ${artifactPath}`);
      throw new Error(
        "Contract artifacts not found. Please run npm run compile && npm run deploy first"
      );
    }

    if (!fs.existsSync(addressPath)) {
      Logger.error(`Addresses not found at: ${addressPath}`);
      throw new Error(
        "Contract addresses file not found. Please run npm run compile && npm run deploy first"
      );
    }

    // Ensure MongoDB URI exists
    if (!process.env.MONGO_URI) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    // Connect to MongoDB
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    Logger.success("Connected to MongoDB successfully");

    // Initialize BlockchainSync with the MongoDB client
    const blockchainSync = new BlockchainSync(client, "trustvault");

    // Perform restoration
    await blockchainSync.restoreBlockchainState();

    Logger.success("Blockchain state restored successfully");
  } catch (error) {
    Logger.error("Error in restore script:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

restoreBlockchain();
