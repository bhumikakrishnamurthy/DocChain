const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const Logger = require("../utils/logger");

async function main() {
  Logger.info("Starting deployment...");

  // Ensure the contract artifacts directory exists
  const artifactsDir = path.join(__dirname, "../public/contracts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Deploy PropertyRegistry contract
  const PropertyRegistry = await hre.ethers.getContractFactory(
    "PropertyRegistry"
  );
  const propertyRegistry = await PropertyRegistry.deploy();
  await propertyRegistry.waitForDeployment();
  const propertyAddress = await propertyRegistry.getAddress();
  Logger.info("PropertyRegistry deployed to:", propertyAddress);

  // Deploy DocumentVerification contract
  const DocumentVerification = await hre.ethers.getContractFactory(
    "DocumentVerification"
  );
  const documentVerification = await DocumentVerification.deploy();
  await documentVerification.waitForDeployment();
  const docVerificationAddress = await documentVerification.getAddress();
  Logger.info("DocumentVerification deployed to:", docVerificationAddress);

  // Save the contract addresses
  const addressFile = path.join(artifactsDir, "contract-addresses.json");
  fs.writeFileSync(
    addressFile,
    JSON.stringify(
      {
        PropertyRegistry: propertyAddress,
        DocumentVerification: docVerificationAddress,
      },
      null,
      2
    )
  );
  Logger.success("Contract addresses saved to:", addressFile);

  // Copy the contract artifacts
  const contracts = ["PropertyRegistry", "DocumentVerification"];
  for (const contract of contracts) {
    const artifactSource = path.join(
      hre.config.paths.artifacts,
      `contracts/${contract}.sol/${contract}.json`
    );
    const artifactDest = path.join(
      artifactsDir,
      `contracts/${contract}.sol/${contract}.json`
    );

    fs.mkdirSync(path.dirname(artifactDest), { recursive: true });
    fs.copyFileSync(artifactSource, artifactDest);
    Logger.info(`${contract} artifact copied to:`, artifactDest);
  }

  // Verify contracts if not on localhost
  const network = hre.network.name;
  if (network !== "localhost" && network !== "hardhat") {
    Logger.info("\nVerifying contracts on Etherscan...");

    try {
      await hre.run("verify:verify", {
        address: propertyAddress,
        contract: "contracts/PropertyRegistry.sol:PropertyRegistry",
      });

      await hre.run("verify:verify", {
        address: docVerificationAddress,
        contract: "contracts/DocumentVerification.sol:DocumentVerification",
      });
    } catch (error) {
      Logger.error("Error verifying contracts:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    Logger.error(error);
    process.exit(1);
  });
