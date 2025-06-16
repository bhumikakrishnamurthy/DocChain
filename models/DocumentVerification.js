const mongoose = require("mongoose");

const documentVerificationSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },
  blockchainId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  documentType: String,
  personalInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    idNumber: String,
    permanentAddress: String,
    currentAddress: String,
  },
  documents: {
    document1: {
      originalName: String,
      filename: String,
      mimetype: String,
      size: Number,
      path: String,
    },
    document2: {
      originalName: String,
      filename: String,
      mimetype: String,
      size: Number,
      path: String,
    },
  },
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  ipfsHash: String,
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  verificationDate: Date,
  verificationSteps: [
    {
      step: String,
      status: String,
      timestamp: Date,
    },
  ],
  blockchainTxns: [
    {
      txHash: String,
      blockNumber: String,
      timestamp: Date,
      type: {
        type: String,
        enum: ["SUBMISSION", "VERIFICATION", "IPFS_UPDATE"],
      },
    },
  ],
});

module.exports = mongoose.model(
  "DocumentVerification",
  documentVerificationSchema,
  "documentVerifications"
);
