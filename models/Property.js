const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  propertyId: {
    type: String,
    required: true,
    unique: true,
  },
  blockchainId: {
    type: String,
    required: true,
    unique: true,
  },
  deterministicId: {
    type: String,
    required: true,
  },
  blockchainIds: [
    {
      type: String,
    },
  ],
  propertyName: String,
  locality: {
    // Changed from location to locality
    type: String,
    required: true,
  },
  propertyType: String,
  owner: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  lastTransferDate: {
    type: Date,
    default: Date.now,
  },
  transactions: [
    {
      type: {
        type: String,
        enum: [
          "REGISTRATION",
          "RE_REGISTRATION",
          "VERIFICATION",
          "TRANSFER",
          "RESTORATION",
        ],
      },
      from: String,
      to: String,
      transactionHash: String,
      blockNumber: Number,
      timestamp: Date,
      locality: String, // Added locality to transactions
    },
  ],
});

// Add pre-save middleware to ensure locality is set
propertySchema.pre("save", function (next) {
  if (!this.locality) {
    const error = new Error("Locality is required");
    next(error);
  }
  next();
});

module.exports = mongoose.model("Property", propertySchema, "blockchainTxns");
