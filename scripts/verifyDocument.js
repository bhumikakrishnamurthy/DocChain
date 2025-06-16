async function main() {
  // Get signer
  const [deployer] = await ethers.getSigners();

  // Contract address from your deployment
  const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // Initialize service
  const verificationService = new DocumentVerificationService(
    contractAddress,
    deployer
  );
  await verificationService.initialize();

  // Example document verification
  const documentBuffer = Buffer.from("Example document content");
  const result = await verificationService.verifyDocument(documentBuffer, {
    documentType: "Identity",
    issuedTo: "0x123...", // recipient address
    expiryDate: Math.floor(Date.now() / 1000) + 31536000, // 1 year from now
    additionalMetadata: {
      issuerName: "Government Authority",
      documentNumber: "12345",
    },
  });

  console.log("Verification result:", result);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
