import { getToken, getAuthHeaders, isAuthenticated } from "./auth.js";
import {
  initWeb3,
  PROPERTY_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  getGasPrice,
} from "./web3-config.js";

let web3Instance;
let contractInstance;

// Initialize Web3 and contract
// Initialize Web3 and contract
async function initializeBlockchain() {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } catch (accessError) {
      console.error("Account access denied:", accessError);
      throw new Error("Please connect and authorize MetaMask");
    }

    web3Instance = new Web3(window.ethereum);
    await checkNetwork(web3Instance);

    const accounts = await web3Instance.eth.getAccounts();
    console.log("Authorized Accounts:", accounts);

    if (!accounts || accounts.length === 0) {
      throw new Error("No blockchain accounts available");
    }

    console.log("Initializing contract with:", {
      contractAddress: CONTRACT_ADDRESSES.PropertyRegistry,
      abiMethods: PROPERTY_REGISTRY_ABI.map((item) => item.name).filter(
        Boolean
      ),
    });

    // Initialize contract with more detailed configuration
    contractInstance = new web3Instance.eth.Contract(
      PROPERTY_REGISTRY_ABI,
      CONTRACT_ADDRESSES.PropertyRegistry,
      {
        from: accounts[0],
        gas: 5000000,
        gasPrice: await web3Instance.eth.getGasPrice(),
      }
    );

    // Verify contract deployment
    const code = await web3Instance.eth.getCode(
      CONTRACT_ADDRESSES.PropertyRegistry
    );
    if (code === "0x") {
      throw new Error("Contract not deployed at specified address");
    }

    console.log("Contract Deployment Code Length:", code.length);

    // Add MetaMask listeners
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());

    return true;
  } catch (error) {
    console.error("Blockchain Initialization Failure:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    throw error;
  }
}

async function checkNetwork(web3) {
  try {
    const chainId = await web3.eth.getChainId();
    console.log("Current Chain ID:", chainId);

    // Hardhat's default local network chainId
    const HARDHAT_CHAIN_ID = 31337;
    const HARDHAT_CHAIN_ID_HEX = "0x7a69";

    if (chainId !== HARDHAT_CHAIN_ID) {
      console.log("Attempting to switch network...");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          console.log("Network not found, attempting to add...");
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: HARDHAT_CHAIN_ID_HEX,
                  chainName: "Hardhat Local Network",
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["http://127.0.0.1:8545/"],
                  blockExplorerUrls: [],
                },
              ],
            });
          } catch (addError) {
            console.error("Failed to add network:", addError);
          }
        } else {
          console.error("Failed to switch network:", switchError);
        }
      }
    }
  } catch (error) {
    console.error("Network check failed:", error);
  }
}

// Set Date Restrictions
function setupDateValidation() {
  // Transaction date setup (for property transaction)
  const transactionDateInput = document.querySelector(
    'section:not(.appointement-details) input[type="date"]'
  ); // More specific selector to avoid picking up appointment date

  if (transactionDateInput) {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const maxDate = `${year}-${month}-${day}`;

    // Set max attribute to today for transaction date
    transactionDateInput.setAttribute("max", maxDate);
    transactionDateInput.value = maxDate;

    // Add event listener for transaction date validation
    transactionDateInput.addEventListener("change", function () {
      const selectedDate = new Date(this.value);
      const currentDate = new Date();

      selectedDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);

      if (selectedDate > currentDate) {
        this.value = maxDate;
        alert("Transaction date cannot be in the future");
      }
    });
  }
}

// Debugs
// async function debugContractMethods() {
//   try {
//     // Detailed network and account logging
//     const chainId = await web3Instance.eth.getChainId();
//     console.log("Current Blockchain Details:", {
//       chainId,
//       networkId: await web3Instance.eth.net.getId(),
//     });

//     const accounts = await web3Instance.eth.getAccounts();
//     console.log("Blockchain Accounts:", {
//       accounts,
//       firstAccount: accounts[0],
//       balance: await web3Instance.eth.getBalance(accounts[0]),
//     });

//     // More robust method for testing property registration
//     try {
//       // Use try-catch with more specific error handling
//       const registerMethod = contractInstance.methods.registerProperty(
//         "TEST_PROPERTY_" + Date.now(),
//         "Test Property",
//         "Test Location",
//         "Residential"
//       );

//       const gasEstimate = await registerMethod.estimateGas({
//         from: accounts[0],
//       });
//       console.log("Gas Estimate for Registration:", gasEstimate);

//       const receipt = await registerMethod.send({
//         from: accounts[0],
//         gas: Math.ceil(gasEstimate * 1.5), // More generous gas limit
//       });

//       console.log("Test Property Registration Successful:", receipt);
//     } catch (registrationError) {
//       console.error("Detailed Registration Error:", {
//         name: registrationError.name,
//         message: registrationError.message,
//         code: registrationError.code,
//         stack: registrationError.stack,
//       });
//     }
//   } catch (error) {
//     console.error("Comprehensive Debug Error:", {
//       name: error.name,
//       message: error.message,
//       stack: error.stack,
//     });
//   }
// }

// Debug function to verify property and contract state
async function debugPropertyTransfer(propertyId) {
  try {
    console.log("Starting property transfer debug for property:", propertyId);

    // Check web3 and contract initialization
    console.log("Web3 initialized:", !!web3Instance);
    console.log("Contract initialized:", !!contractInstance);
    console.log("Contract address:", contractInstance?.options?.address);

    // Rest of the debug function remains the same
    const networkId = await web3Instance.eth.net.getId();
    console.log("Current network ID:", networkId);

    const accounts = await web3Instance.eth.getAccounts();
    console.log("Current account:", accounts[0]);

    const balance = await web3Instance.eth.getBalance(accounts[0]);
    console.log(
      "Account balance:",
      web3Instance.utils.fromWei(balance, "ether"),
      "ETH"
    );

    // Get property registration data
    const response = await fetch(`/api/registrations/${propertyId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    console.log("Property registration data:", data);

    if (data?.propertyInfo?.blockchainId) {
      const blockchainAddress = data.propertyInfo.blockchainId.startsWith("0x")
        ? data.propertyInfo.blockchainId
        : `0x${data.propertyInfo.blockchainId}`;

      console.log(
        "Is valid address:",
        web3Instance.utils.isAddress(blockchainAddress)
      );

      const code = await web3Instance.eth.getCode(
        contractInstance.options.address
      );
      console.log("Contract deployed:", code !== "0x");

      try {
        const propertyInfo = await contractInstance.methods
          .getProperty(blockchainAddress)
          .call();
        console.log("Property info:", propertyInfo);
      } catch (error) {
        console.error("Failed to get property info:", error);
      }
    }

    console.log("Debug complete");
  } catch (error) {
    console.error("Debug failed:", error);
  }
}

// Authentication check function
async function checkAuthentication() {
  try {
    const token = getToken();
    console.log("Token found");

    if (!token) {
      console.log("No token found, redirecting to login...");
      window.location.href = "/login.html";
      return false;
    }

    const response = await fetch("/checkAuth", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!data.authenticated) {
      console.log("Authentication failed, redirecting to login...");
      window.location.href = "/login.html";
      return false;
    }

    console.log("Authentication successful");
    return true;
  } catch (error) {
    console.error("Authentication check failed:", error);
    window.location.href = "/login.html";
    return false;
  }
}

// User data fetch
async function getUserData() {
  try {
    const token = getToken();
    if (!token) {
      console.log("No token found");
      return null;
    }

    const response = await fetch("/getUserData", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized access - redirect to login
        window.location.href = "/login.html";
        return null;
      }
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data = await response.json();
    console.log("User data received:", data);
    return data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

// Helper function to get blockchain address from property ID
async function getBlockchainAddressFromPropertyId(propertyId) {
  try {
    console.log("Fetching blockchain address for propertyId:", propertyId);

    if (!web3Instance || !contractInstance) {
      throw new Error("Blockchain not initialized. Please refresh the page.");
    }

    const accounts = await web3Instance.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No Ethereum account connected");
    }

    const response = await fetch(`/api/ids/${propertyId}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      throw new Error(data.error || "Property not found");
    }

    if (!data?.propertyInfo?.blockchainId) {
      throw new Error("Property not registered on blockchain");
    }

    let blockchainAddress = data.propertyInfo.blockchainId;
    console.log("Retrieved blockchainId:", blockchainAddress);

    // Ensure the address has the '0x' prefix
    blockchainAddress = blockchainAddress.startsWith("0x")
      ? blockchainAddress
      : `0x${blockchainAddress}`;

    if (!web3Instance.utils.isAddress(blockchainAddress)) {
      throw new Error(`Invalid Ethereum address format: ${blockchainAddress}`);
    }

    return blockchainAddress;
  } catch (error) {
    console.error("Error getting blockchain address:", error);
    throw error;
  }
}

// Utility functions for blockchain address handling
const blockchainUtils = {
  // Format and validate Ethereum address
  formatAddress(address) {
    if (!address) return null;

    // Add 0x prefix if missing
    const formattedAddress = address.startsWith("0x")
      ? address
      : `0x${address}`;

    // Check if it's a valid Ethereum address
    if (!web3Instance.utils.isAddress(formattedAddress)) {
      throw new Error(`Invalid Ethereum address format: ${formattedAddress}`);
    }

    return formattedAddress;
  },

  // Check if property exists on blockchain
  async checkPropertyExists(address) {
    try {
      const property = await contractInstance.methods
        .getProperty(address)
        .call();
      return (
        property &&
        property.owner !== "0x0000000000000000000000000000000000000000"
      );
    } catch (error) {
      return false;
    }
  },

  // Verify property on blockchain
  async verifyProperty(address, account) {
    try {
      const verifyMethod = contractInstance.methods.verifyProperty(address);
      const gasEstimate = await verifyMethod.estimateGas({ from: account });

      const receipt = await verifyMethod.send({
        from: account,
        gas: Math.ceil(gasEstimate * 1.2),
      });

      return receipt;
    } catch (error) {
      console.error("Property verification failed:", error);
      throw error;
    }
  },
};

// Prefill user email function
async function prefillUserEmail() {
  try {
    const userData = await getUserData();
    if (!userData) {
      console.log("No user data available for prefill");
      return;
    }

    if (userData.email) {
      const emailInput = document.querySelector(
        'section:first-of-type input[type="email"]'
      );
      if (emailInput) {
        emailInput.value = userData.email;
        emailInput.readOnly = true;
        emailInput.style.backgroundColor = "#f0f0f0";
        console.log("Email prefilled successfully:", userData.email);
      }
    }
  } catch (error) {
    console.error("Error prefilling email:", error);
    // Continue with form initialization even if prefill fails
  }
}

// Validation helper objects
const validations = {
  phone: {
    regex: /^(?:(?:\+|91)?[6-9]\d{9})$/,
    message: "Please enter a valid 10-digit Indian phone number",
  },
  email: {
    regex: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: "Please enter a valid email address",
  },
  aadhaar: {
    regex: /^[2-9]\d{3}\s?\d{4}\s?\d{4}$/,
    message: "Please enter a valid 12-digit Aadhaar number",
  },
  pan: {
    regex: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    message: "Please enter a valid PAN number (Format: ABCDE1234F)",
  },
  ethereum: {
    regex: /^0x[a-fA-F0-9]{40}$/,
    message: "Please enter a valid Ethereum address",
  },
};

// Function to validate ID numbers (Aadhaar/PAN)
function validateIdNumber(value) {
  // Remove any spaces or special characters
  const cleanValue = value.replace(/[^A-Za-z0-9]/g, "");

  // Check if it's a PAN number (10 characters, specific format)
  if (cleanValue.length === 10) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    return {
      isValid: panRegex.test(cleanValue.toUpperCase()),
      message: panRegex.test(cleanValue.toUpperCase())
        ? ""
        : "Invalid PAN number format. Format should be ABCDE1234F",
    };
  }

  // Check if it's an Aadhaar number (12 digits)
  if (cleanValue.length === 12) {
    const aadhaarRegex = /^[2-9]\d{11}$/;
    return {
      isValid: aadhaarRegex.test(cleanValue),
      message: aadhaarRegex.test(cleanValue)
        ? ""
        : "Invalid Aadhaar number format. Should be 12 digits starting with 2-9",
    };
  }

  // If neither length matches
  return {
    isValid: false,
    message:
      "ID number should be either a 12-digit Aadhaar or 10-character PAN",
  };
}

function validateAddress(address) {
  if (!address) return false;

  try {
    // Remove any whitespace
    address = address.trim();

    // Ensure proper hex format
    if (!address.startsWith("0x")) {
      address = "0x" + address;
    }

    // Check length (42 characters = 0x + 40 hex characters)
    if (address.length !== 42) {
      return false;
    }

    // Check if it contains only valid hex characters after '0x'
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  } catch (error) {
    console.error("Address validation error:", error);
    return false;
  }
}

// Form validation function
// Form validation function
function validateForm() {
  const form = document.getElementById("propertyForm");
  const allInputs = form.querySelectorAll('input:not([type="file"])');
  const allSelects = form.querySelectorAll("select");
  const allFileInputs = form.querySelectorAll('input[type="file"]');
  const registrarOffice = document.getElementById("Choose");
  const appointmentDate = document.getElementById("appointmentDate");
  const timeSlot = document.getElementById("timeSlot");

  let isValid = true;
  let errorMessage = "";

  // Check appointment details
  if (!appointmentDate || !appointmentDate.value) {
    isValid = false;
    errorMessage = "Please select appointment date";
    alert(errorMessage);
    return false;
  }

  if (
    !registrarOffice ||
    registrarOffice.value === "" ||
    registrarOffice.value === "register"
  ) {
    isValid = false;
    errorMessage = "Please select a Sub-Registrar Office";
    alert(errorMessage);
    return false;
  }

  if (!timeSlot || !timeSlot.value) {
    isValid = false;
    errorMessage = "Please select a time slot";
    alert(errorMessage);
    return false;
  }

  // Check all required fields
  allInputs.forEach((input) => {
    if (input.value.trim() === "") {
      isValid = false;
      errorMessage = `${input.placeholder || "All fields"} is required`;
    }
  });

  allSelects.forEach((select) => {
    if (select.value === "") {
      isValid = false;
      errorMessage = `Please select ${select.id || "all required fields"}`;
    }
  });

  allFileInputs.forEach((fileInput) => {
    if (!fileInput.files || fileInput.files.length === 0) {
      isValid = false;
      const documentLabel = fileInput.previousElementSibling.textContent
        .trim()
        .split("\n")[0];
      errorMessage = `Please upload ${documentLabel}`;
    }
  });

  if (!isValid) {
    alert(errorMessage);
    return false;
  }

  return true;
}

// Setup form validation event listeners
function setupValidation() {
  // Phone number validation - only on blur
  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value.length >= 10) {
        const isValid = validations.phone.regex.test(this.value);
        this.setCustomValidity(isValid ? "" : validations.phone.message);
      } else {
        this.setCustomValidity("");
      }
    });

    input.addEventListener("input", function () {
      this.setCustomValidity("");
    });
  });

  // Email validation - only on blur
  document.querySelectorAll('input[type="email"]').forEach((input) => {
    input.addEventListener("blur", function () {
      if (this.value.includes("@")) {
        const isValid = validations.email.regex.test(this.value);
        this.setCustomValidity(isValid ? "" : validations.email.message);
      } else {
        this.setCustomValidity("");
      }
    });

    input.addEventListener("input", function () {
      this.setCustomValidity("");
    });
  });

  // ID number validation (Aadhaar/PAN)
  document
    .querySelectorAll('input[placeholder="Aadhar / PAN Number"]')
    .forEach((input) => {
      // Input event for real-time handling
      input.addEventListener("input", function (e) {
        let value = this.value.replace(/[^A-Za-z0-9]/g, ""); // Remove any non-alphanumeric characters

        // If length suggests it's a PAN (10 characters), force uppercase
        if (value.length <= 10) {
          // Convert to uppercase while typing
          this.value = value.toUpperCase();
        } else {
          // If it's longer (Aadhaar), just keep numbers
          this.value = value.replace(/[^0-9]/g, "");
        }

        this.setCustomValidity(""); // Clear validation while typing
      });

      // Blur event for validation
      input.addEventListener("blur", function () {
        const value = this.value.replace(/\s/g, "");
        if (value.length >= 10) {
          let isValid = false;
          let message = "";

          if (value.length === 12) {
            isValid = validations.aadhaar.regex.test(value);
            message = validations.aadhaar.message;
          } else if (value.length === 10) {
            isValid = validations.pan.regex.test(value);
            message = validations.pan.message;
          }

          this.setCustomValidity(isValid ? "" : message);
        } else {
          this.setCustomValidity("");
        }
      });
    });

  // Ethereum address validation - only on blur
  const ethAddressInput = document.querySelector(
    'input[name="newOwner_ethAddress"]'
  );
  if (ethAddressInput) {
    ethAddressInput.addEventListener("blur", function () {
      if (this.value.trim()) {
        const isValid = validations.ethereum.regex.test(this.value);
        this.setCustomValidity(isValid ? "" : validations.ethereum.message);
      } else {
        this.setCustomValidity("");
      }
    });

    ethAddressInput.addEventListener("input", function () {
      this.setCustomValidity("");
    });
  }
}

// India Post API integration
async function getLocationFromPincode(pincode) {
  try {
    console.log("Fetching location data for pincode:", pincode);
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error("Invalid response format from postal API");
      return { success: false, error: "Invalid response from postal service" };
    }

    const result = data[0];
    console.log("Postal API response:", result);

    if (
      result.Status === "Success" &&
      Array.isArray(result.PostOffice) &&
      result.PostOffice.length > 0
    ) {
      return {
        success: true,
        postOffices: result.PostOffice.map((po) => ({
          locality: po.Name,
          city: po.District,
          state: po.State,
          block: po.Block,
          branchType: po.BranchType,
          deliveryStatus: po.DeliveryStatus,
        })),
      };
    }

    return {
      success: false,
      error: result.Message || "No data found for this pincode",
    };
  } catch (error) {
    console.error("Error fetching location data:", error);
    return { success: false, error: "Failed to fetch location data" };
  }
}

// Setup same address functionality
function setupSameAddressButtons() {
  const addressNotes = document.querySelectorAll("em");
  addressNotes.forEach((note, index) => {
    note.style.cursor = "pointer";
    note.addEventListener("click", () => {
      const section = note.closest("section");
      const permanentAddress = section.querySelector(
        'input[placeholder="Permanent Address"]'
      );
      const currentAddress = section.querySelector(
        'input[placeholder="Current Address"]'
      );

      if (permanentAddress && currentAddress) {
        if (permanentAddress.value) {
          currentAddress.value = permanentAddress.value;
        } else {
          alert("Please fill in the permanent address first");
        }
      }
    });
  });
}

// Property data fetch and autofill
async function fetchPropertyDetails(propertyId) {
  try {
    console.log("Fetching details for property:", propertyId);
    const response = await fetch(`/api/property/${propertyId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Property not found");
    }

    const data = await response.json();
    console.log("Property data received:", data);

    // Map all fields that need to be filled
    const fieldMappings = {
      "Property ID": propertyId,
      "Plot / Flat Number":
        data.plotNumber || data.propertyDetails?.plotNumber || "",
      Street: data.street || data.propertyDetails?.street || "",
      Locality: data.locality || data.propertyDetails?.locality || "",
      City: data.city || "",
      State: data.state || "",
      Pincode: data.pin_code || "",
      "Land Area": data.land_area || "",
      "Built-up Area": data.built_up_area || "",
      "Property Classification": data.property_classification || "",
    };

    // Fill in all the mapped fields
    for (const [placeholder, value] of Object.entries(fieldMappings)) {
      const input = document.querySelector(
        `input[placeholder="${placeholder}"]`
      );
      if (input && value) {
        console.log(`Setting ${placeholder} to ${value}`);
        input.value = value;

        // If this is the pincode field and it has a value, trigger the lookup
        if (placeholder === "Pincode" && value) {
          const stateInput = document.querySelector(
            'input[placeholder="State"]'
          );
          const cityInput = document.querySelector('input[placeholder="City"]');
          const localityInput = document.querySelector(
            'input[placeholder="Locality"]'
          );

          const inputs = {
            pincodeInput: input,
            stateInput,
            cityInput,
            localityInput,
            currentDropdown: null,
          };

          // Wait a brief moment for the UI to update
          setTimeout(() => {
            handlePincodeLookup(value, true, inputs);
          }, 100);
        }
      }
    }

    // Handle property type selection
    const propertyType = data.type_of_property;
    if (propertyType) {
      const propertyTypeSelect = document.getElementById("propertyType");
      if (propertyTypeSelect) {
        // Convert to lowercase and remove spaces for comparison
        const normalizedPropertyType = propertyType
          .toLowerCase()
          .replace(/\s+/g, "");

        Array.from(propertyTypeSelect.options).forEach((option) => {
          const normalizedOption = option.value
            .toLowerCase()
            .replace(/\s+/g, "");
          if (normalizedOption === normalizedPropertyType) {
            propertyTypeSelect.value = option.value;
            propertyTypeSelect.disabled = true;
            propertyTypeSelect.style.opacity = "0.8";
            propertyTypeSelect.style.cursor = "not-allowed";
          }
        });
      }
    }

    // Log what was filled
    console.log("Fields populated:", fieldMappings);

    return data;
  } catch (error) {
    console.error("Error fetching property details:", error);
    alert("Could not find property with the given ID");
    return null;
  }
}

// Setup property lookup
function setupPropertyLookup() {
  const propertyIdInput = document.querySelector(
    'input[placeholder="Property ID"]'
  );
  if (propertyIdInput) {
    propertyIdInput.addEventListener("input", (e) => {
      const propertyId = e.target.value.trim();
      if (propertyId.length >= 6) {
        fetchPropertyDetails(propertyId);
        getBlockchainAddressFromPropertyId(propertyId);
      }
    });
  }
}

// Calculate stamp duty and registration fees
function calculateEstimatedFees(propertyValue, city, propertyType) {
  propertyValue = Number(propertyValue);
  let stampDuty = 0;
  let registrationFee = 0;

  switch (city) {
    case "Delhi":
      stampDuty = propertyValue * 0.06;
      registrationFee = propertyValue * 0.01;
      break;
    case "Mumbai":
      stampDuty = propertyValue * 0.05;
      registrationFee = propertyValue * 0.01;
      break;
    case "Bangalore":
      stampDuty = propertyValue * 0.056;
      registrationFee = propertyValue * 0.01;
      break;
    case "Chennai":
      stampDuty = propertyValue * 0.07;
      registrationFee = propertyValue * 0.01;
      break;
    case "Hyderabad":
      stampDuty = propertyValue * 0.06;
      registrationFee = propertyValue * 0.005;
      break;
    default:
      stampDuty = propertyValue * 0.05;
      registrationFee = propertyValue * 0.01;
  }

  if (propertyType === "Commercial" || propertyType === "Industrial") {
    stampDuty *= 1.1;
  }

  return Math.round(stampDuty + registrationFee);
}

// Setup fee calculation
function setupFeeCalculation() {
  const purchaseValueInput = document.querySelector(
    'input[placeholder="Purchase Value"]'
  );
  const cityInput = document.querySelector('input[placeholder="City"]');
  const propertyTypeSelect = document.getElementById("propertyType");
  const stampDutyInput = document.querySelector(
    'input[placeholder="Stamp Duty & Registration Fees"]'
  );

  if (purchaseValueInput && cityInput && propertyTypeSelect && stampDutyInput) {
    purchaseValueInput.addEventListener("input", function () {
      if (this.value && cityInput.value && propertyTypeSelect.value) {
        const estimatedFees = calculateEstimatedFees(
          this.value,
          cityInput.value,
          propertyTypeSelect.value
        );
        stampDutyInput.value = estimatedFees;
      }
    });
  }
}

// Setup pincode lookup
function setupPincodeLookup() {
  const sections = document.querySelectorAll("section");
  sections.forEach((section) => {
    const pincodeInput = section.querySelector('input[placeholder="Pincode"]');
    if (pincodeInput) {
      const stateInput = section.querySelector('input[placeholder="State"]');
      const cityInput = section.querySelector('input[placeholder="City"]');
      const localityInput = section.querySelector(
        'input[placeholder="Locality"]'
      );
      let currentDropdown = null;

      // Create inputs object
      const inputs = {
        pincodeInput,
        stateInput,
        cityInput,
        localityInput,
        currentDropdown,
      };

      // Handle manual input with debouncing
      let timeout = null;
      pincodeInput.addEventListener("input", (e) => {
        const pincode = e.target.value.trim();

        // Clear previous timeout
        if (timeout) {
          clearTimeout(timeout);
        }

        // Set new timeout
        timeout = setTimeout(async () => {
          const newDropdown = await handlePincodeLookup(pincode, false, inputs);
          if (inputs.currentDropdown && inputs.currentDropdown.parentNode) {
            inputs.currentDropdown.parentNode.removeChild(
              inputs.currentDropdown
            );
          }
          inputs.currentDropdown = newDropdown;
        }, 500); // 500ms delay
      });

      // Handle value changes (for autofill)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "value"
          ) {
            const pincode = pincodeInput.value.trim();
            if (pincode.length === 6) {
              handlePincodeLookup(pincode, true, inputs).then((newDropdown) => {
                if (
                  inputs.currentDropdown &&
                  inputs.currentDropdown.parentNode
                ) {
                  inputs.currentDropdown.parentNode.removeChild(
                    inputs.currentDropdown
                  );
                }
                inputs.currentDropdown = newDropdown;
              });
            }
          }
        });
      });

      observer.observe(pincodeInput, {
        attributes: true,
        attributeFilter: ["value"],
      });
    }
  });
}

// Create locality dropdown UI
function createLocalityDropdown(postOffices) {
  // Create container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.className = "locality-dropdown-container";
  dropdownContainer.style.marginTop = "5px";
  dropdownContainer.style.marginBottom = "10px";

  // Create select element
  const select = document.createElement("select");
  select.className = "locality-dropdown";
  select.style.width = "100%";
  select.style.padding = "8px";
  select.style.borderRadius = "4px";
  select.style.border = "1px solid #ccc";

  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select Area/Locality";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  select.appendChild(defaultOption);

  // Add options for each post office
  postOffices.forEach((po, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${po.locality} (${po.branchType || "Branch"})`;
    select.appendChild(option);
  });

  // Add select to container
  dropdownContainer.appendChild(select);

  // Add info text
  const infoText = document.createElement("small");
  infoText.className = "locality-info";
  infoText.style.display = "block";
  infoText.style.marginTop = "5px";
  infoText.style.color = "#666";
  infoText.textContent = `${postOffices.length} locations found for this pincode`;
  dropdownContainer.appendChild(infoText);

  return { container: dropdownContainer, select: select };
}

// Handle pincode lookup
async function handlePincodeLookup(pincode, isAutofill, inputs) {
  const {
    pincodeInput,
    stateInput,
    cityInput,
    localityInput,
    currentDropdown,
  } = inputs;
  console.log(`Looking up pincode: ${pincode} (autofill: ${isAutofill})`);

  try {
    // Remove existing dropdown if any
    if (currentDropdown && currentDropdown.parentNode) {
      currentDropdown.parentNode.removeChild(currentDropdown);
    }

    // Reset fields if pincode is cleared
    if (!pincode) {
      [stateInput, cityInput, localityInput].forEach((input) => {
        if (input) {
          input.readOnly = false;
          input.value = "";
          input.style.opacity = "1";
          input.style.cursor = "text";
        }
      });
      return;
    }

    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      // Show loading state
      [stateInput, cityInput, localityInput].forEach((input) => {
        if (input) {
          input.value = "Loading...";
          input.readOnly = true;
        }
      });

      const result = await getLocationFromPincode(pincode);
      console.log("Location lookup result:", result);

      if (result.success && result.postOffices.length > 0) {
        // Auto-fill state and city with first result
        if (stateInput) {
          stateInput.value = result.postOffices[0].state;
          stateInput.readOnly = true;
          stateInput.style.opacity = "0.8";
          stateInput.style.cursor = "not-allowed";
        }

        if (cityInput) {
          cityInput.value = result.postOffices[0].city;
          cityInput.readOnly = true;
          cityInput.style.opacity = "0.8";
          cityInput.style.cursor = "not-allowed";
        }

        // Handle locality
        if (localityInput) {
          if (result.postOffices.length === 1) {
            localityInput.value = result.postOffices[0].locality;
            localityInput.readOnly = true;
            localityInput.style.opacity = "0.8";
            localityInput.style.cursor = "not-allowed";
          } else {
            localityInput.readOnly = false;
            localityInput.style.opacity = "1";
            localityInput.style.cursor = "text";
            localityInput.value = "";

            try {
              // Create and insert dropdown
              const dropdownContainer = createLocalityDropdown(
                result.postOffices
              );
              if (localityInput.parentNode) {
                localityInput.parentNode.insertBefore(
                  dropdownContainer.container,
                  localityInput.nextSibling
                );

                // Handle dropdown selection
                dropdownContainer.select.addEventListener("change", (e) => {
                  const selectedPostOffice = result.postOffices[e.target.value];
                  if (selectedPostOffice) {
                    localityInput.value = selectedPostOffice.locality;
                    // Remove the dropdown after selection
                    if (dropdownContainer.container.parentNode) {
                      dropdownContainer.container.parentNode.removeChild(
                        dropdownContainer.container
                      );
                    }
                  }
                });

                return dropdownContainer.container; // Return the container for cleanup
              }
            } catch (dropdownError) {
              console.error("Error creating dropdown:", dropdownError);
            }
          }
        }
      } else {
        // Clear loading state
        [stateInput, cityInput, localityInput].forEach((input) => {
          if (input) {
            input.value = "";
            input.readOnly = false;
            input.style.opacity = "1";
            input.style.cursor = "text";
          }
        });

        if (!isAutofill) {
          alert(
            result.error || "Could not find location data for this PIN code"
          );
        }
      }
    }
  } catch (error) {
    console.error("Pincode lookup error:", error);
    // Clear loading state
    [stateInput, cityInput, localityInput].forEach((input) => {
      if (input) {
        input.value = "";
        input.readOnly = false;
        input.style.opacity = "1";
        input.style.cursor = "text";
      }
    });
    if (!isAutofill) {
      alert("Error fetching location data. Please try again.");
    }
  }

  return null; // Return null if no dropdown was created
}

// Transfer property on blockchain
async function transferPropertyOnBlockchain(propertyData, newOwnerAddress) {
  console.log("Starting property transfer process");

  let propertyId = null;
  let blockchainAddress = null;
  let accounts = null;
  let currentAccount = null;

  try {
    // Basic validation
    if (!web3Instance || !contractInstance) {
      throw new Error("Blockchain not properly initialized");
    }

    accounts = await web3Instance.eth.getAccounts();
    if (!accounts?.[0]) {
      throw new Error("No Ethereum account found");
    }
    currentAccount = accounts[0];

    // Get and validate property ID
    propertyId =
      typeof propertyData === "string" ? propertyData : propertyData.propertyId;
    if (!propertyId) {
      throw new Error("Property ID is required");
    }

    // First check verification status in the database
    const dbVerificationResponse = await fetch(
      `/api/property/details/${propertyId}`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (!dbVerificationResponse.ok) {
      throw new Error("Failed to fetch property verification status");
    }

    const dbVerificationData = await dbVerificationResponse.json();
    console.log("Database verification status:", dbVerificationData);

    if (
      !dbVerificationData.data?.blockchainVerification?.verificationStatus
        ?.toLowerCase()
        .includes("verified")
    ) {
      throw new Error("Property is not marked as verified in the database");
    }

    // Get blockchain ID from the database
    const response = await fetch(`/api/ids/${propertyId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch blockchain ID");
    }

    const data = await response.json();
    console.log("Blockchain ID lookup response:", data);

    if (!data?.propertyInfo?.blockchainId) {
      throw new Error("Blockchain ID not found for property");
    }

    blockchainAddress = data.propertyInfo.blockchainId;
    console.log("Using blockchain address:", blockchainAddress);

    if (!web3Instance.utils.isAddress(blockchainAddress)) {
      throw new Error(
        `Invalid blockchain address format: ${blockchainAddress}`
      );
    }

    // Additional check: Verify blockchain status
    try {
      const blockchainStatusResponse = await fetch(
        `/api/property/search-by-blockchain-id/${blockchainAddress}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!blockchainStatusResponse.ok) {
        throw new Error("Failed to fetch blockchain status");
      }

      const blockchainStatusData = await blockchainStatusResponse.json();
      console.log("Blockchain status data:", blockchainStatusData);

      if (!blockchainStatusData.data?.isVerified) {
        throw new Error(
          "Property verification status mismatch between database and blockchain"
        );
      }
    } catch (error) {
      console.error("Error checking blockchain status:", error);
      throw new Error("Failed to verify property status on blockchain");
    }

    // Get contract property details
    const propertyDetails = await contractInstance.methods
      .getProperty(blockchainAddress)
      .call();
    console.log("Contract property details:", propertyDetails);

    // Check if property is verified in the contract
    if (!propertyDetails.isVerified && !propertyDetails[6]) {
      throw new Error(
        "Property is not marked as verified in the smart contract"
      );
    }

    // Verify ownership
    const propertyOwner = propertyDetails.owner || propertyDetails[4];
    if (propertyOwner.toLowerCase() !== currentAccount.toLowerCase()) {
      throw new Error("You are not the current owner of this property");
    }

    // Validate new owner address
    if (!web3Instance.utils.isAddress(newOwnerAddress)) {
      throw new Error("Invalid new owner address format");
    }

    console.log("All validations passed. Proceeding with transfer...");

    // Get current gas price with buffer
    const gasPrice = await web3Instance.eth.getGasPrice();
    const adjustedGasPrice = Math.ceil(Number(gasPrice) * 1.1); // 10% buffer

    // Execute transfer
    const transferMethod = contractInstance.methods.transferOwnership(
      blockchainAddress,
      newOwnerAddress
    );
    const gasEstimate = await transferMethod.estimateGas({
      from: currentAccount,
    });

    const receipt = await transferMethod.send({
      from: currentAccount,
      gas: Math.ceil(gasEstimate * 1.2), // 20% buffer
      gasPrice: adjustedGasPrice,
    });

    console.log("Transfer successful:", receipt);

    return {
      success: true,
      propertyId: propertyId,
      blockchainId: blockchainAddress,
      previousOwner: currentAccount,
      newOwner: newOwnerAddress,
      transferDate: new Date().toISOString(),
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    console.error("Transfer failed:", {
      error,
      propertyId,
      blockchainAddress,
      currentAccount,
      newOwnerAddress,
    });
    throw error;
  }
}

// Prepare form data for submission
async function prepareFormData(blockchainResult) {
  const formData = new FormData();

  // Current owner information
  const currentOwnerInfo = {
    firstName: document.querySelector('input[placeholder="First Name"]').value,
    lastName: document.querySelector('input[placeholder="Last Name"]').value,
    email: document.querySelector('input[placeholder="Email Address"]').value,
    phone: document.querySelector('input[placeholder="Phone Number"]').value,
    idNumber: document.querySelector('input[placeholder="Aadhar / PAN Number"]')
      .value,
    permanentAddress: document.querySelector(
      'input[placeholder="Permanent Address"]'
    ).value,
    currentAddress: document.querySelector(
      'input[placeholder="Current Address"]'
    ).value,
  };
  formData.append("currentOwnerInfo", JSON.stringify(currentOwnerInfo));

  // New owner information
  const newOwnerInfo = {
    firstName: document.querySelector('input[name="newOwner_firstName"]').value,
    lastName: document.querySelector('input[name="newOwner_lastName"]').value,
    email: document.querySelector('input[name="newOwner_email"]').value,
    phone: document.querySelector('input[name="newOwner_phone"]').value,
    idNumber: document.querySelector('input[name="newOwner_idNumber"]').value,
    permanentAddress: document.querySelector(
      'input[name="newOwner_permanentAddress"]'
    ).value,
    currentAddress: document.querySelector(
      'input[name="newOwner_currentAddress"]'
    ).value,
    ethAddress: document.querySelector('input[name="newOwner_ethAddress"]')
      .value,
  };
  formData.append("newOwnerInfo", JSON.stringify(newOwnerInfo));

  // Property information
  const propertyInfo = {
    propertyId: document.querySelector('input[placeholder="Property ID"]')
      .value,
    blockchainId: blockchainResult.blockchainId,
    plotNumber: document.querySelector(
      'input[placeholder="Plot / Flat Number"]'
    ).value,
    street: document.querySelector('input[placeholder="Street"]').value,
    locality: document.querySelector('input[placeholder="Locality"]').value,
    city: document.querySelector('input[placeholder="City"]').value,
    state: document.querySelector('input[placeholder="State"]').value,
    pincode: document.querySelector('input[placeholder="Pincode"]').value,
    propertyType: document.getElementById("propertyType").value,
    landArea: document.querySelector('input[placeholder="Land Area"]').value,
    builtUpArea: document.querySelector('input[placeholder="Built-up Area"]')
      .value,
    classification: document.querySelector(
      'input[placeholder="Property Classification"]'
    ).value,
    transactionType: document.getElementById("transactionType").value,
    transactionDate: document.querySelector('input[type="date"]').value,
    purchaseValue: document.querySelector('input[placeholder="Purchase Value"]')
      .value,
    stampDuty: document.querySelector(
      'input[placeholder="Stamp Duty & Registration Fees"]'
    ).value,
  };
  formData.append("propertyInfo", JSON.stringify(propertyInfo));

  // Add blockchain transaction details
  formData.append(
    "blockchainInfo",
    JSON.stringify({
      transactionHash: blockchainResult.transactionHash,
      blockchainId: blockchainResult.blockchainId,
      previousOwner: blockchainResult.previousOwner,
      newOwner: blockchainResult.newOwner,
      transferDate: blockchainResult.transferDate,
    })
  );

  // Add witness information
  const witnessInfo = {
    firstName: document.querySelectorAll('input[placeholder="First Name"]')[2]
      .value,
    lastName: document.querySelectorAll('input[placeholder="Last Name"]')[2]
      .value,
    email: document.querySelectorAll('input[placeholder="Email Address"]')[2]
      .value,
    phone: document.querySelectorAll('input[placeholder="Phone Number"]')[2]
      .value,
    idNumber: document.querySelectorAll(
      'input[placeholder="Aadhar / PAN Number"]'
    )[2].value,
    permanentAddress: document.querySelectorAll(
      'input[placeholder="Permanent Address"]'
    )[2].value,
    currentAddress: document.querySelectorAll(
      'input[placeholder="Current Address"]'
    )[2].value,
  };
  formData.append("witnessInfo", JSON.stringify(witnessInfo));

  // Add appointment information
  const appointmentInfo = {
    office: document.getElementById("Choose").value,
    date: document.getElementById("appointmentDate").value,
    timeSlot: document.getElementById("timeSlot").value,
  };
  formData.append("appointmentInfo", JSON.stringify(appointmentInfo));

  // Add document files
  const documentTypes = [
    "saleDeed",
    "taxReceipts",
    "encumbrance",
    "occupancy",
    "buildingPlan",
    "powerAttorney",
    "photoCertificate",
  ];

  documentTypes.forEach((type) => {
    const fileInput = document.getElementById(type);
    if (fileInput?.files[0]) {
      formData.append(type, fileInput.files[0]);
    }
  });

  return formData;
}

// Helper function to determine appointment type
function getAppointmentType() {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes("transfer") || pathname.includes("ownertransfer")) {
    return "transfer";
  }
  return "registration";
}

// Helper function to validate blockchain address format
async function validateBlockchainAddress(web3Instance, address) {
  if (!address) return false;
  const formattedAddress = address.startsWith("0x") ? address : `0x${address}`;
  return web3Instance.utils.isAddress(formattedAddress);
}

// Helper function to verify property exists and is owned by the correct account
async function verifyPropertyOwnership(
  contractInstance,
  propertyAddress,
  ownerAddress
) {
  try {
    console.log("Starting property ownership verification:", {
      propertyAddress,
      ownerAddress,
    });

    // Input validation
    if (!propertyAddress || !ownerAddress) {
      throw new Error("Property address and owner address are required");
    }

    // Format addresses
    const formattedPropertyAddress = propertyAddress.toLowerCase();
    const formattedOwnerAddress = ownerAddress.toLowerCase();

    console.log("Attempting to fetch property details from contract...");
    const propertyDetails = await contractInstance.methods
      .getProperty(formattedPropertyAddress)
      .call();

    console.log("Raw property details received:", propertyDetails);

    // Handle both array and object formats
    const propertyInfo = {
      propertyId: propertyDetails.propertyId || propertyDetails[0],
      name: propertyDetails.propertyName || propertyDetails[1],
      location: propertyDetails.location || propertyDetails[2],
      propertyType: propertyDetails.propertyType || propertyDetails[3],
      owner: propertyDetails.owner || propertyDetails[4],
      timestamp: propertyDetails.timestamp || propertyDetails[5],
      isVerified: propertyDetails.isVerified || propertyDetails[6],
    };

    // Verification checks
    if (!propertyInfo.isVerified) {
      throw new Error(
        "Property is not verified on the blockchain. Verification is required before transfer."
      );
    }

    if (
      !propertyInfo.owner ||
      propertyInfo.owner === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Property owner not properly set on blockchain");
    }

    if (propertyInfo.owner.toLowerCase() !== formattedOwnerAddress) {
      throw new Error("You are not the current owner of this property");
    }

    return propertyInfo;
  } catch (error) {
    console.error("Property verification failed:", {
      error,
      propertyAddress,
      ownerAddress,
      message: error.message,
    });
    throw error;
  }
}

// Property recovery
async function attemptPropertyRecovery(
  contractInstance,
  propertyAddress,
  ownerAddress
) {
  console.log("Attempting property recovery for:", propertyAddress);

  try {
    // First try to verify if property exists but just needs reindexing
    const receipt = await contractInstance.methods
      .verifyProperty(propertyAddress)
      .send({ from: ownerAddress });

    console.log("Property verification receipt:", receipt);

    // Try getting property details again
    const propertyDetails = await contractInstance.methods
      .getProperty(propertyAddress)
      .call();

    if (propertyDetails) {
      console.log("Property recovered successfully");
      return propertyDetails;
    }
  } catch (error) {
    console.error("Recovery attempt failed:", error);
    throw error;
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  try {
    // Get form values
    const propertyId = document.querySelector(
      'input[placeholder="Property ID"]'
    ).value;
    const newOwnerEthAddress = document.querySelector(
      'input[name="newOwner_ethAddress"]'
    ).value;

    if (!propertyId || !newOwnerEthAddress) {
      throw new Error("Property ID and new owner address are required");
    }

    console.log("Initiating property transfer:", {
      propertyId,
      newOwnerAddress: newOwnerEthAddress,
    });

    // First perform the blockchain transfer
    const blockchainResult = await transferPropertyOnBlockchain(
      propertyId,
      newOwnerEthAddress
    );

    if (!blockchainResult.success) {
      throw new Error(blockchainResult.error || "Blockchain transfer failed");
    }

    // Prepare and submit form data
    const formData = await prepareFormData(blockchainResult);

    const response = await fetch("/api/transfer-property", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Server error");
    }

    // Show success message and redirect
    alert("Property transfer successful!");
    window.location.href = "./registered.html";
  } catch (error) {
    console.error("Transfer failed:", error);
    alert(`Transfer failed: ${error.message}`);
  }
}

// Helper function to get authentication headers
// function getAuthHeaders() {
//   return {
//     Authorization: `Bearer ${getToken()}`,
//     "Content-Type": "application/json",
//   };
// }

// Helper function to format ethereum address
function formatEthereumAddress(address) {
  if (!address) return null;
  return address.startsWith("0x") ? address : `0x${address}`;
}

// Setup file upload handlers
function setupFileUploadHandlers() {
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", function (e) {
      const file = e.target.files[0];
      const maxSize = e.target.dataset.maxSize * 1024 * 1024; // Convert to bytes
      const fileNameDisplay =
        e.target.parentElement.querySelector(".file-name");
      const documentItem = e.target.parentElement;

      if (file) {
        if (file.size > maxSize) {
          alert("File size exceeds 10MB limit");
          e.target.value = "";
          documentItem.classList.remove("has-file");
          fileNameDisplay.textContent = "";
          return;
        }

        const allowedTypes = [".pdf", ".jpg", ".jpeg", ".png"];
        const fileExtension = "." + file.name.split(".").pop().toLowerCase();

        if (!allowedTypes.includes(fileExtension)) {
          alert(
            "Invalid file type. Please upload PDF, JPG, or PNG files only."
          );
          e.target.value = "";
          documentItem.classList.remove("has-file");
          fileNameDisplay.textContent = "";
          return;
        }

        documentItem.classList.add("has-file");
        fileNameDisplay.textContent = file.name;
      } else {
        documentItem.classList.remove("has-file");
        fileNameDisplay.textContent = "";
      }
    });
  });
}

// Setup appointment date picker
function setupAppointmentDatePicker() {
  const appointmentDate = document.getElementById("appointmentDate");
  if (appointmentDate) {
    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const maxDateStr = maxDate.toISOString().split("T")[0];

    appointmentDate.min = tomorrowStr;
    appointmentDate.max = maxDateStr;

    // Listen for date changes
    appointmentDate.addEventListener("change", () => {
      const officeSelect = document.getElementById("Choose");
      const timeSlotSelect = document.getElementById("timeSlot");

      // Reset and disable time slot selection
      timeSlotSelect.innerHTML =
        '<option value="" disabled selected>Choose Time Slot</option>';
      timeSlotSelect.disabled = true;

      // Enable office selection if date is selected
      if (appointmentDate.value) {
        officeSelect.disabled = false;
        updateRegistrarOffices();
      } else {
        officeSelect.disabled = true;
        officeSelect.innerHTML =
          '<option value="register" disabled selected>Choose Sub-Registrar Office</option>';
      }
    });
  }
}

// Function to update available time slots
function updateTimeSlots(officeId) {
  const timeSlotSelect = document.getElementById("timeSlot");
  const selectedOption = document.getElementById("Choose").selectedOptions[0];

  if (!selectedOption || !selectedOption.dataset.slots) {
    timeSlotSelect.innerHTML =
      '<option value="" disabled selected>Choose Time Slot</option>';
    timeSlotSelect.disabled = true;
    return;
  }

  const slots = JSON.parse(selectedOption.dataset.slots);
  timeSlotSelect.innerHTML =
    '<option value="" disabled selected>Choose Time Slot</option>';

  slots.forEach((slot) => {
    const option = document.createElement("option");
    option.value = slot.value;

    // Show remaining slots in the option text
    if (slot.available) {
      option.textContent = `${slot.label} (${slot.remainingSlots} slots available)`;
    } else {
      option.textContent = `${slot.label} (Full)`;
      option.disabled = true;
    }

    timeSlotSelect.appendChild(option);
  });

  timeSlotSelect.disabled = false;
}

// Function to fetch and populate registrar offices
async function updateRegistrarOffices() {
  const cityInput = document.querySelector('input[placeholder="City"]');
  const appointmentDate = document.getElementById("appointmentDate");
  const officeSelect = document.getElementById("Choose");
  const timeSlotSelect = document.getElementById("timeSlot");

  console.log("Updating offices with:", {
    city: cityInput?.value,
    date: appointmentDate?.value,
  });
  if (!cityInput?.value || !appointmentDate?.value) {
    console.log("Missing required data for office update");
    return;
  }

  try {
    officeSelect.disabled = true;
    officeSelect.innerHTML =
      '<option value="register" disabled selected>Loading offices...</option>';
    timeSlotSelect.disabled = true;
    timeSlotSelect.innerHTML =
      '<option value="" disabled selected>Choose Time Slot</option>';

    const response = await fetch(
      `/api/registrar-offices?city=${encodeURIComponent(
        cityInput.value
      )}&date=${appointmentDate.value}&type=${getAppointmentType()}`,
      {
        headers: getAuthHeaders(),
      }
    );

    const data = await response.json();
    console.log("Received office data:", data);

    if (!response.ok) {
      throw new Error(
        data.error || `Failed to fetch offices: ${response.status}`
      );
    }

    // Clear existing options
    officeSelect.innerHTML =
      '<option value="register" disabled selected>Choose Sub-Registrar Office</option>';

    // Add new options
    if (data.offices && Array.isArray(data.offices)) {
      data.offices.forEach((office) => {
        const option = document.createElement("option");
        option.value = office.id || "";
        option.textContent = office.name || "Unnamed Office";

        if (office.availableSlots) {
          option.dataset.slots = JSON.stringify(office.availableSlots);
        }

        officeSelect.appendChild(option);
      });
    officeSelect.disabled = false; 
    } else {
      // If no offices are found, set the message and disable the select.
      officeSelect.innerHTML =
        '<option value="register" disabled selected>No offices available in this city</option>';
      officeSelect.disabled = true;
    }

    // Enable/disable based on available offices
    const hasValidOffices = data.offices && data.offices.length > 0;
    officeSelect.disabled = !hasValidOffices;

    if (!hasValidOffices) {
      officeSelect.innerHTML =
        '<option value="register" disabled selected>No offices available in this city</option>';
    }

    console.log("Office update complete");
  } catch (error) {
    console.error("Error fetching registrar offices:", error);
    officeSelect.innerHTML =
      '<option value="register" disabled selected>Error loading offices</option>';
    officeSelect.disabled = true;
    timeSlotSelect.disabled = true;
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Form submission
  const propertyForm = document.getElementById("propertyForm");
  if (propertyForm) {
    propertyForm.addEventListener("submit", handleFormSubmit);
  }

  // Back button
  const backButton = document.getElementById("backButton");
  if (backButton) {
    backButton.addEventListener("click", () => {
      history.back();
    });
  }

  // Setup appointment date picker
  setupAppointmentDatePicker();

  // Setup office selection change handler
  const officeSelect = document.getElementById("Choose");
  if (officeSelect) {
    officeSelect.addEventListener("change", () => {
      updateTimeSlots(officeSelect.value);
    });
  }

  // Setup city input change handler for office updates
  const cityInput = document.querySelector('input[placeholder="City"]');
  if (cityInput) {
    cityInput.addEventListener("change", () => {
      const appointmentDate = document.getElementById("appointmentDate");
      if (appointmentDate.value) {
        updateRegistrarOffices();
      }
    });
  }

  setupValidation();
  setupSameAddressButtons();
  setupPropertyLookup();
  setupFeeCalculation();
  setupFileUploadHandlers();
  setupPincodeLookup();
}

// Initialize form
async function initializeForm() {
  try {
    if (await checkAuthentication()) {
      console.log("Authentication successful, initializing form...");

      // Initialize blockchain
      try {
        await initializeBlockchain();
        console.log("Blockchain initialization complete");
      } catch (error) {
        console.error("Blockchain initialization failed:", error);
        alert("Failed to initialize blockchain: " + error.message);
      }

      // Prefill user email
      await prefillUserEmail();

      // Setup date validation
      setupDateValidation();

      // Setup all event listeners and handlers
      setupEventListeners();

      console.log("Form initialization complete");
    }
  } catch (error) {
    console.error("Form initialization failed:", error);
    throw error;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initializeForm();
    setupDateValidation();

    // Run additional diagnostics
    // await debugContractMethods();
  } catch (error) {
    console.error("Comprehensive Initialization Failure:", {
      error,
      message: error.message,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    alert("Failed to initialize form. Please check console for details.");
  }
});

export {
  transferPropertyOnBlockchain,
  handleFormSubmit,
  validateForm,
  prepareFormData,
  getBlockchainAddressFromPropertyId,
  blockchainUtils,
  debugPropertyTransfer,
  getAuthHeaders,
  formatEthereumAddress,
};
