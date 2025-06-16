// Contract ABIs
const PROPERTY_REGISTRY_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "_propertyId",
        type: "string",
      },
      {
        internalType: "string",
        name: "_propertyName",
        type: "string",
      },
      {
        internalType: "string",
        name: "_location",
        type: "string",
      },
      {
        internalType: "string",
        name: "_propertyType",
        type: "string",
      },
    ],
    name: "registerProperty",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "properties",
    outputs: [
      {
        internalType: "string",
        name: "propertyId",
        type: "string",
      },
      {
        internalType: "string",
        name: "propertyName",
        type: "string",
      },
      {
        internalType: "string",
        name: "location",
        type: "string",
      },
      {
        internalType: "string",
        name: "propertyType",
        type: "string",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "registrationDate",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isVerified",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "lastTransferDate",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "blockchainId",
        type: "address",
      },
    ],
    name: "getProperty",
    outputs: [
      {
        internalType: "string",
        name: "propertyId",
        type: "string",
      },
      {
        internalType: "string",
        name: "propertyName",
        type: "string",
      },
      {
        internalType: "string",
        name: "location",
        type: "string",
      },
      {
        internalType: "string",
        name: "propertyType",
        type: "string",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "registrationDate",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "isVerified",
        type: "bool",
      },
      {
        internalType: "uint256",
        name: "lastTransferDate",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "blockchainId",
        type: "address",
      },
    ],
    name: "verifyProperty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "blockchainId",
        type: "address",
      },
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    name: "propertyIdToAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "blockchainId",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "propertyId",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "propertyName",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "PropertyRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "blockchainId",
        type: "address",
      },
    ],
    name: "PropertyVerified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "blockchainId",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "transferDate",
        type: "uint256",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
];

const DOCUMENT_VERIFICATION_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "string", name: "documentHash", type: "string" },
      { internalType: "string", name: "documentType", type: "string" },
      { internalType: "address", name: "issuedTo", type: "address" },
      { internalType: "uint256", name: "expiryDate", type: "uint256" },
      { internalType: "string", name: "metadataURI", type: "string" },
    ],
    name: "verifyDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "documentId", type: "bytes32" }],
    name: "revokeDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "documentId", type: "bytes32" },
      { internalType: "string", name: "newMetadataURI", type: "string" },
      { internalType: "uint256", name: "newExpiryDate", type: "uint256" },
    ],
    name: "updateDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "verifier", type: "address" }],
    name: "addVerifier",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Contract addresses
const CONTRACT_ADDRESSES = {
  PropertyRegistry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  DocumentVerification: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

// Network configurations
const NETWORKS = {
  hardhat: {
    chainId: 31337,
    name: "Hardhat Network",
    rpcUrl: "http://127.0.0.1:8545/",
    explorer: "",
  },
};

// Utility function to get the target network based on hostname
function getTargetNetwork() {
  return NETWORKS.hardhat;
}

// MetaMask connection check with retry logic
async function checkMetaMaskConnection(retries = 3) {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed! Please install MetaMask to use this application."
    );
  }

  for (let i = 0; i < retries; i++) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length === 0) {
        const newAccounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        return newAccounts[0];
      }

      return accounts[0];
    } catch (error) {
      if (i === retries - 1) {
        console.error("MetaMask connection error:", error);
        throw new Error(
          "Failed to connect to MetaMask. Please check your MetaMask connection and try again."
        );
      }
      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// Network check and switch if necessary
async function checkNetwork(web3) {
  try {
    const chainId = await web3.eth.getChainId();
    const targetNetwork = getTargetNetwork();

    if (chainId !== targetNetwork.chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${targetNetwork.chainId.toString(16)}` }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${targetNetwork.chainId.toString(16)}`,
                chainName: targetNetwork.name,
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: [targetNetwork.rpcUrl],
                blockExplorerUrls: targetNetwork.explorer
                  ? [targetNetwork.explorer]
                  : [],
              },
            ],
          });
        } else {
          throw new Error(
            `Failed to switch to the correct network. Please manually switch to ${targetNetwork.name} in MetaMask.`
          );
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Network switch error:", error);
    throw error;
  }
}

// Get gas price with safety margin and maximum cap
async function getGasPrice(web3) {
  const gasPrice = await web3.eth.getGasPrice();
  const maxGasPrice = web3.utils.toWei("150", "gwei"); // Maximum gas price cap
  const suggestedGasPrice = Math.ceil(Number(gasPrice) * 1.1); // 10% margin
  return Math.min(suggestedGasPrice, maxGasPrice);
}

// Main initialization function with proper error handling
async function initWeb3() {
  let web3Instance = null;
  let propertyContract = null;
  let documentContract = null;
  let currentAccount = null;

  try {
    // Check MetaMask connection
    currentAccount = await checkMetaMaskConnection();

    // Initialize Web3
    if (window.ethereum) {
      web3Instance = new Web3(window.ethereum);
    } else {
      throw new Error("No Web3 provider found. Please install MetaMask.");
    }

    // Check and switch network if needed
    await checkNetwork(web3Instance);

    // Initialize contracts
    propertyContract = new web3Instance.eth.Contract(
      PROPERTY_REGISTRY_ABI,
      CONTRACT_ADDRESSES.PropertyRegistry
    );

    documentContract = new web3Instance.eth.Contract(
      DOCUMENT_VERIFICATION_ABI,
      CONTRACT_ADDRESSES.DocumentVerification
    );

    // Verify contract deployments
    const [propertyCode, documentCode] = await Promise.all([
      web3Instance.eth.getCode(CONTRACT_ADDRESSES.PropertyRegistry),
      web3Instance.eth.getCode(CONTRACT_ADDRESSES.DocumentVerification),
    ]);

    if (propertyCode === "0x" || documentCode === "0x") {
      throw new Error(
        "One or more contracts not deployed at specified addresses"
      );
    }

    // Setup event listeners with debouncing
    let reloadTimeout;
    const debouncedReload = () => {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => window.location.reload(), 1000);
    };

    window.ethereum.on("chainChanged", debouncedReload);
    window.ethereum.on("accountsChanged", debouncedReload);

    // Return initialized instances
    return {
      web3: web3Instance,
      propertyContract,
      documentContract,
      account: currentAccount,
      initialized: true,
      networkInfo: getTargetNetwork(),
    };
  } catch (error) {
    console.error("Failed to initialize Web3:", error);
    throw new Error(`Blockchain initialization failed: ${error.message}`);
  }
}

// Helper function for contract interactions with retry mechanism
async function executeContractMethod(method, options = {}, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const gasEstimate = await method.estimateGas(options);
      const gasPrice = await getGasPrice(web3);

      return await method.send({
        ...options,
        gas: Math.ceil(gasEstimate * 1.2), // 20% margin
        gasPrice: gasPrice,
      });
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Wait before retrying, with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
    }
  }

  console.error("Contract method execution failed:", lastError);
  throw lastError;
}

// Export everything needed for the application
export {
  initWeb3,
  checkNetwork,
  checkMetaMaskConnection,
  getGasPrice,
  executeContractMethod,
  DOCUMENT_VERIFICATION_ABI,
  PROPERTY_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  NETWORKS,
};
