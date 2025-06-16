require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  paths: {
    artifacts: "./public/contracts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
