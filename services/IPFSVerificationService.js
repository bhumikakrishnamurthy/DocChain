const { create } = require("ipfs-http-client");
const { Buffer } = require("buffer");
const Logger = require("../utils/logger");

class IPFSVerificationService {
  constructor() {
    this.ipfs = create({
      host: "localhost",
      port: 5001,
      protocol: "http",
    });
  }

  async uploadToIPFS(documentData, metadata) {
    try {
      Logger.info("Preparing document for IPFS upload");

      // Create a metadata object
      const ipfsMetadata = {
        documentType: metadata.documentType || "Unknown",
        verifiedBy: metadata.verifier,
        verificationDate: new Date().toISOString(),
        verificationNotes: metadata.notes,
        originalDocumentId: metadata.documentId,
        ...metadata,
      };

      // Combine document data and metadata
      const ipfsData = {
        document: documentData,
        metadata: ipfsMetadata,
      };

      // Convert to Buffer
      const buffer = Buffer.from(JSON.stringify(ipfsData));

      // Upload to IPFS
      const result = await this.ipfs.add(buffer);
      Logger.success("Document uploaded to IPFS:", result.path);

      return {
        ipfsHash: result.path,
        size: result.size,
        metadata: ipfsMetadata,
      };
    } catch (error) {
      Logger.error("IPFS upload error:", error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  async getFromIPFS(ipfsHash) {
    try {
      Logger.info("Retrieving document from IPFS:", ipfsHash);

      let content = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        content.push(chunk);
      }

      const data = Buffer.concat(content).toString();
      return JSON.parse(data);
    } catch (error) {
      Logger.error("IPFS retrieval error:", error);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  async verifyDocument(documentData, verificationDetails) {
    try {
      Logger.info("Starting document verification process");

      // Upload document and metadata to IPFS
      const ipfsResult = await this.uploadToIPFS(
        documentData,
        verificationDetails
      );

      // Create verification record
      const verificationRecord = {
        documentId: verificationDetails.documentId,
        ipfsHash: ipfsResult.ipfsHash,
        verifiedBy: verificationDetails.verifier,
        verificationDate: new Date(),
        verificationNotes: verificationDetails.notes,
        metadata: ipfsResult.metadata,
      };

      Logger.success("Document verification completed:", ipfsResult.ipfsHash);
      return verificationRecord;
    } catch (error) {
      Logger.error("Document verification error:", error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }
}

module.exports = IPFSVerificationService;
