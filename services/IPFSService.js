const { create } = require("ipfs-http-client");
const { Buffer } = require("buffer");
const { create: ipfsHttpClient } = require("ipfs-http-client");

class IPFSService {
  constructor() {
    // Connect to local IPFS node
    this.ipfs = ipfsHttpClient({
      host: "localhost",
      port: "5001",
      protocol: "http",
    });
  }

  async uploadDocument(documentBuffer, metadata) {
    try {
      // Upload the document
      const documentResult = await this.ipfs.add(documentBuffer);

      // Create metadata object
      const metadataObj = {
        documentHash: documentResult.path,
        contentType: metadata.contentType,
        timestamp: Date.now(),
        additionalMetadata: metadata,
      };

      // Upload metadata
      const metadataBuffer = Buffer.from(JSON.stringify(metadataObj));
      const metadataResult = await this.ipfs.add(metadataBuffer);

      return {
        documentHash: documentResult.path,
        metadataURI: metadataResult.path,
        size: documentResult.size,
      };
    } catch (error) {
      console.error("Failed to upload to IPFS:", error);
      throw new Error("IPFS upload failed");
    }
  }

  async getDocument(ipfsHash) {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Failed to retrieve from IPFS:", error);
      throw new Error("IPFS retrieval failed");
    }
  }

  async getMetadata(metadataURI) {
    try {
      const metadataBuffer = await this.getDocument(metadataURI);
      return JSON.parse(metadataBuffer.toString());
    } catch (error) {
      console.error("Failed to retrieve metadata:", error);
      throw new Error("Metadata retrieval failed");
    }
  }
}
