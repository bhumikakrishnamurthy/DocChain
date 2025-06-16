class BlockchainTransactionHandler {
  constructor(web3Instance) {
    this.web3 = web3Instance;
  }

  async getPropertyDetails(blockchainId, propertyData) {
    try {
      // First check if we have valid transaction data in the blockchainIds array
      const blockchainEntry = propertyData.blockchainIds?.find(
        (entry) => entry.id === blockchainId
      );

      // Get the latest transaction from the transactions array
      const latestTransaction = propertyData.transactions?.[0];

      // Normalize the transaction data
      let txData = this.normalizeTransactionData(
        latestTransaction,
        blockchainEntry
      );

      // If we have a transaction hash, attempt to get blockchain data
      if (txData.transactionHash) {
        try {
          const web3Data = await this.fetchWeb3TransactionData(
            txData.transactionHash
          );
          txData = {
            ...txData,
            ...web3Data,
          };
        } catch (error) {
          console.warn(
            "Web3 transaction data not found, using database records:",
            error.message
          );
          // Don't throw error - continue with MongoDB data
        }
      } else if (blockchainEntry) {
        // If no transaction hash but we have blockchain entry, create synthetic transaction
        txData = this.createSyntheticTransaction(blockchainEntry);
      }

      // Return normalized data
      return {
        success: true,
        data: {
          ...propertyData,
          ...txData,
          blockchainId: blockchainId,
          originalBlockchainId: propertyData.blockchainIds?.[0]?.id,
          transactionHistory: propertyData.transactions || [],
        },
      };
    } catch (error) {
      console.error("Error in getPropertyDetails:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  normalizeTransactionData(transaction, blockchainEntry) {
    const normalizeTimestamp = (timestamp) => {
      if (!timestamp) return null;
      const timestampNum = Number(timestamp);
      return timestampNum < 1000000000000 ? timestampNum * 1000 : timestampNum;
    };

    return {
      transactionHash: transaction?.transactionHash || blockchainEntry?.txHash,
      blockNumber: transaction?.blockNumber || blockchainEntry?.blockNumber,
      timestamp: normalizeTimestamp(
        transaction?.timestamp || blockchainEntry?.timestamp
      ),
      from: transaction?.from || blockchainEntry?.from,
      to: transaction?.to || blockchainEntry?.to,
      gasUsed: transaction?.gasUsed || blockchainEntry?.gasUsed,
      value: transaction?.value || blockchainEntry?.value || "0",
      status: transaction?.status || "Success",
    };
  }

  async fetchWeb3TransactionData(txHash) {
    let txData = {};

    try {
      // Get transaction and receipt in parallel
      const [transaction, receipt] = await Promise.all([
        this.web3.eth.getTransaction(txHash).catch(() => null),
        this.web3.eth.getTransactionReceipt(txHash).catch(() => null),
      ]);

      if (transaction || receipt) {
        // If either exists, get the block
        const blockNumber = transaction?.blockNumber || receipt?.blockNumber;
        const block = blockNumber
          ? await this.web3.eth.getBlock(blockNumber).catch(() => null)
          : null;

        txData = {
          transactionHash: txHash,
          blockNumber: blockNumber?.toString(),
          timestamp: block?.timestamp ? Number(block.timestamp) * 1000 : null,
          from: transaction?.from || receipt?.from,
          to: transaction?.to || receipt?.to,
          gasUsed: receipt?.gasUsed?.toString(),
          value: transaction
            ? this.web3.utils.fromWei(transaction.value.toString(), "ether")
            : "0",
          status: receipt?.status ? "Success" : "Failed",
        };
      }
    } catch (error) {
      console.error("Error fetching web3 transaction data:", error);
      // Don't throw - return whatever data we have
    }

    return txData;
  }

  createSyntheticTransaction(blockchainEntry) {
    return {
      transactionHash: null,
      blockNumber: blockchainEntry?.blockNumber || null,
      timestamp: blockchainEntry?.timestamp
        ? new Date(blockchainEntry.timestamp).getTime()
        : null,
      from: blockchainEntry?.from || null,
      to: blockchainEntry?.to || null,
      gasUsed: null,
      value: "0",
      status: "Restored",
    };
  }
}

export default BlockchainTransactionHandler;
