import { getToken, getAuthHeaders, isAuthenticated } from "./auth.js";
import {
  initWeb3,
  PROPERTY_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
} from "./web3-config.js";

// Initialize Web3 and contract
let web3Instance = null;
let contractInstance = null;

async function initializeBlockchain() {
  try {
    const { web3, propertyContract } = await initWeb3();

    // Assign to window object for global access
    window.web3Instance = web3;
    window.contractInstance = propertyContract;

    // Verify contract is properly initialized
    const code = await web3.eth.getCode(propertyContract.options.address);
    if (code === "0x") {
      throw new Error("Contract not deployed at specified address");
    }

    console.log("Blockchain initialized successfully", {
      contractAddress: propertyContract.options.address,
      hasContract: code !== "0x",
      methods: Object.keys(propertyContract.methods),
    });

    return true;
  } catch (error) {
    console.error("Failed to initialize blockchain:", error);
    return false;
  }
}

// Helper function in case of failure
async function retry(attempts, fn) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      console.log(`Retry attempt ${i + 1} of ${attempts}`);
    }
  }
}

// Helper function to verify event signature
function verifyEventSignature() {
  try {
    const eventSignature = "PropertyRegistered(address,string,string)";
    const topic = Web3.utils.sha3(eventSignature);
    console.log("Event signature check:", {
      signature: eventSignature,
      topic: topic,
    });
    return topic;
  } catch (error) {
    console.error("Error checking event signature:", error);
    return null;
  }
}

// Helper function to register property on blockchain
// async function registerPropertyOnBlockchain(propertyData) {
//   const submitButton = document.querySelector(".continue-btn");
//   submitButton.disabled = true;
//   submitButton.textContent = "Processing...";

//   try {
//     // Check if MetaMask is installed
//     if (!window.ethereum) {
//       throw new Error("MetaMask not installed");
//     }

//     // Get accounts
//     const accounts = await window.ethereum.request({
//       method: "eth_requestAccounts",
//     });

//     if (!accounts || accounts.length === 0) {
//       throw new Error("No MetaMask account available");
//     }

//     const account = accounts[0];

//     // Get locality from input field directly
//     const localityInput = document.querySelector(
//       'input[placeholder="Locality"]'
//     );
//     if (!localityInput) {
//       throw new Error("Locality input field not found");
//     }

//     const locality = localityInput.value.trim();
//     if (!locality) {
//       throw new Error("Locality is required");
//     }

//     // Format property data
//     const formattedData = {
//       propertyId: String(propertyData.propertyId || "").trim(),
//       propertyName: String(
//         propertyData.plotNumber || "Plot number not specified"
//       ).trim(),
//       locality: locality,
//       propertyType: String(propertyData.propertyType || "Not specified").trim(),
//     };

//     console.log("🏠 Formatted data with locality:", formattedData);

//     // Validate required fields
//     if (!formattedData.propertyId) {
//       throw new Error("Property ID is required");
//     }

//     // Create the contract method call
//     const registerMethod = contractInstance.methods.registerProperty(
//       formattedData.propertyId,
//       formattedData.propertyName,
//       formattedData.locality,
//       formattedData.propertyType
//     );

//     // Estimate gas using the contract method directly
//     let gasEstimate;
//     try {
//       gasEstimate = await registerMethod.estimateGas({ from: account });
//       console.log("Estimated gas:", gasEstimate);
//     } catch (error) {
//       console.error("Gas estimation error:", error);
//       throw new Error(
//         "Contract interaction failed: " +
//           (error.message || "Gas estimation failed")
//       );
//     }

//     // Add 20% buffer to gas estimate
//     const gasWithBuffer = Math.ceil(gasEstimate * 1.2);

//     // Get current gas price
//     const gasPrice = await web3Instance.eth.getGasPrice();
//     console.log("Current gas price:", gasPrice);

//     // Send transaction
//     submitButton.textContent = "Confirm in MetaMask...";

//     const transaction = await registerMethod.send({
//       from: account,
//       gas: gasWithBuffer,
//       gasPrice: gasPrice,
//     });

//     console.log("Transaction successful:", transaction);

//     // Return success response with transaction details
//     return {
//       success: true,
//       blockchainId: formattedData.propertyId,
//       transactionHash: transaction.transactionHash,
//       blockNumber: transaction.blockNumber,
//       locality: formattedData.locality,
//     };
//   } catch (error) {
//     console.error("Registration error:", error);
//     return {
//       success: false,
//       error: error.message || "Transaction failed",
//     };
//   } finally {
//     submitButton.disabled = false;
//     submitButton.textContent = "Continue";
//   }
// }

// Web3 Debug
window.debugWeb3Setup = async function () {
  try {
    console.log("Starting Web3 debug setup...");

    // Initialize Web3
    const { web3, propertyContract, account } = await initWeb3();
    console.log("Web3 initialized successfully");
    console.log("Connected account:", account);

    // Get network details
    const networkId = await web3.eth.net.getId();
    console.log("Network ID:", networkId);

    // Check contract
    const contractAddress = propertyContract.options.address;
    console.log("Contract address:", contractAddress);

    // Test contract deployment
    const code = await web3.eth.getCode(contractAddress);
    console.log("Contract deployed:", code !== "0x");

    // Get ETH balance
    const balance = await web3.eth.getBalance(account);
    console.log(
      "Account balance:",
      web3.utils.fromWei(balance, "ether"),
      "ETH"
    );

    // Test contract with a properties mapping call
    try {
      console.log("Testing contract read operation...");
      const propertyDetails = await propertyContract.methods
        .properties(account)
        .call();
      console.log("Property details test:", propertyDetails);

      // Only attempt test registration if balance is sufficient
      if (web3.utils.fromWei(balance, "ether") > "1") {
        console.log("Testing contract write operation...");
        const gasEstimate = await propertyContract.methods
          .registerProperty(
            "TEST123",
            "Test Property",
            "Test Location",
            "Residential"
          )
          .estimateGas({ from: account });

        console.log("Estimated gas for registration:", gasEstimate);

        const testTx = await propertyContract.methods
          .registerProperty(
            "TEST123",
            "Test Property",
            "Test Location",
            "Residential"
          )
          .send({
            from: account,
            gas: Math.round(gasEstimate * 1.2), // Add 20% buffer
          });

        console.log("Test registration successful:", testTx);
      } else {
        console.log("Skipping test registration due to insufficient balance");
      }
    } catch (contractError) {
      // This is expected for new accounts or if property doesn't exist
      console.log("Contract interaction test result:", contractError.message);
      if (contractError.message.includes("gas")) {
        console.warn(
          "Gas estimation failed. This might indicate an issue with the contract or network configuration."
        );
      }
    }

    const summary = {
      networkConnected: true,
      networkId: networkId,
      contractDeployed: code !== "0x",
      accountConnected: !!account,
      balance: web3.utils.fromWei(balance, "ether") + " ETH",
    };

    console.log("Debug Summary:", summary);
    return "Debug complete - all systems operational";
  } catch (error) {
    console.error("Debug setup failed:", error);
    return `Debug failed: ${error.message}`;
  }
};

// Authentication check function
async function checkAuthentication() {
  try {
    const token = getToken();
    if (!token) {
      console.log("No token found, redirecting to login...");
      window.location.href = "/login.html";
      return false;
    }

    const response = await fetch("/checkAuth", {
      method: "GET",
      headers: getAuthHeaders(), // Using the updated getAuthHeaders function
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login.html";
        return false;
      }
      throw new Error(`Authentication check failed: ${response.status}`);
    }

    const data = await response.json();
    return data.authenticated;
  } catch (error) {
    console.error("Authentication check failed:", error);
    window.location.href = "/login.html";
    return false;
  }
}

// User data fetch
async function getUserData() {
  try {
    const response = await fetch("/getUserData", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
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

// Prefill user email function
async function prefillUserEmail() {
  try {
    const userData = await getUserData();
    console.log("Attempting to prefill email with user data:", userData);

    if (userData && userData.email) {
      const emailInput = document.querySelector(
        'section:first-of-type input[type="email"]'
      );
      if (emailInput) {
        emailInput.value = userData.email;
        emailInput.readOnly = true;
        emailInput.style.backgroundColor = "#f0f0f0";
        console.log("Email prefilled successfully:", userData.email);
      } else {
        console.log("Email input field not found");
      }
    } else {
      console.log("No user email data available");
    }
  } catch (error) {
    console.error("Error prefilling email:", error);
  }
}

// India Post API integration for pincode lookup
async function getLocationFromPincode(pincode) {
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    const data = await response.json();

    if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice) {
      return {
        success: true,
        postOffices: data[0].PostOffice.map((po) => ({
          locality: po.Name,
          city: po.District,
          state: po.State,
          block: po.Block,
          branchType: po.BranchType,
          deliveryStatus: po.DeliveryStatus,
        })),
      };
    }
    return { success: false, error: "No data found" };
  } catch (error) {
    console.error("Error fetching location data:", error);
    return { success: false, error: error.message };
  }
}

// Validation helper functions
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
};

// Helper function to determine appointment type
function getAppointmentType() {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes("register") || pathname.includes("registernewprop")) {
    return "registration";
  }
  return "transfer";
}

// Function to validate form fields
function validateForm() {
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  const emailInputs = document.querySelectorAll('input[type="email"]');
  const idInputs = document.querySelectorAll(
    'input[placeholder="Aadhar / PAN Number"]'
  );
  const transactionDate = document.querySelector(
    'input[type="date"]:not(#appointmentDate)'
  ).value;
  const selectedDate = new Date(transactionDate);
  const currentDate = new Date();

  let isValid = true;
  let errorMessage = "";

  // Check all required fields
  const allInputs = document.querySelectorAll('input:not([type="file"])');
  const allSelects = document.querySelectorAll("select");
  const allFileInputs = document.querySelectorAll('input[type="file"]');

  // Specifically check appointment details
  const registrarOffice = document.getElementById("Choose");
  const appointmentDateTime = document.getElementById("appointmentDate");
  const timeSlot = document.getElementById("timeSlot");

  // Validate appointment details first
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

  if (
    !appointmentDateTime ||
    appointmentDateTime.value === "" ||
    appointmentDateTime.value === "date"
  ) {
    isValid = false;
    errorMessage = "Please select Date and Time for appointment";
    alert(errorMessage);
    return false;
  }

  if (!timeSlot || !timeSlot.value) {
    alert("Please select a time slot");
    return false;
  }

  // Validate all input fields are filled
  allInputs.forEach((input) => {
    if (input.value.trim() === "") {
      isValid = false;
      errorMessage = `${input.placeholder || "All fields"} is required`;
    }
  });

  // Validate all select fields are chosen
  allSelects.forEach((select) => {
    if (select.value === "") {
      isValid = false;
      errorMessage = `Please select ${select.id || "all dropdown fields"}`;
    }
  });

  // Validate all file inputs have files
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

  // Validate phone numbers
  phoneInputs.forEach((input) => {
    if (!validations.phone.regex.test(input.value)) {
      isValid = false;
      errorMessage = validations.phone.message;
    }
  });

  // Validate emails
  emailInputs.forEach((input) => {
    if (!validations.email.regex.test(input.value)) {
      isValid = false;
      errorMessage = validations.email.message;
    }
  });

  // Validate ID numbers
  idInputs.forEach((input) => {
    const validation = validateIdNumber(input.value);
    if (!validation.isValid) {
      isValid = false;
      errorMessage = validation.message;
    }
  });

  // Validate date
  selectedDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  if (selectedDate > currentDate) {
    isValid = false;
    errorMessage = "Transaction date cannot be in the future";
  }

  if (!isValid) {
    alert(errorMessage);
  }
  return isValid;
}

// Function to validate ID based on format
function validateIdNumber(value) {
  const cleanValue = value.replace(/\s/g, "");

  if (/^\d+$/.test(cleanValue) && cleanValue.length === 12) {
    return {
      type: "aadhaar",
      isValid: validations.aadhaar.regex.test(cleanValue),
      value: cleanValue,
      message: validations.aadhaar.message,
    };
  }

  // For PAN, ensure it's in uppercase and follows the exact format
  const upperValue = cleanValue.toUpperCase();
  if (upperValue !== cleanValue) {
    return {
      type: "pan",
      isValid: false,
      value: upperValue,
      message: "PAN number must be in UPPERCASE (Format: ABCDE1234F)",
    };
  }

  return {
    type: "pan",
    isValid: validations.pan.regex.test(upperValue),
    value: upperValue,
    message: validations.pan.message,
  };
}

// Fee calculation helper
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

// Helper function to create locality dropdown UI
function createLocalityDropdown(postOffices, section) {
  const dropdownContainer = document.createElement("div");
  dropdownContainer.className = "locality-dropdown-container";

  const select = document.createElement("select");
  select.className = "locality-dropdown";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select Area/Locality";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  select.appendChild(defaultOption);

  postOffices.forEach((po, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${po.locality} (${po.branchType})`;
    select.appendChild(option);
  });

  dropdownContainer.appendChild(select);

  const infoText = document.createElement("small");
  infoText.className = "locality-info";
  infoText.textContent = `${postOffices.length} locations found for this pincode`;
  dropdownContainer.appendChild(infoText);

  return { dropdownContainer, select };
}

// Setup pincode lookup functionality
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

      if (stateInput && cityInput) {
        pincodeInput.addEventListener("input", async function (e) {
          const pincode = e.target.value.trim();

          // Remove existing dropdown if any
          if (currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
          }

          // Reset fields
          stateInput.readOnly = false;
          cityInput.readOnly = false;
          stateInput.value = "";
          cityInput.value = "";

          if (localityInput) {
            localityInput.readOnly = false;
            localityInput.value = "";
            localityInput.style.opacity = "1";
            localityInput.style.cursor = "text";
          }

          [stateInput, cityInput].forEach((input) => {
            input.style.opacity = "1";
            input.style.cursor = "text";
          });

          if (pincode.length === 6 && /^\d+$/.test(pincode)) {
            try {
              // Show loading state
              stateInput.value = "Loading...";
              cityInput.value = "Loading...";
              if (localityInput) localityInput.value = "Loading...";

              const result = await getLocationFromPincode(pincode);

              if (result.success && result.postOffices.length > 0) {
                if (result.postOffices.length === 1) {
                  // Single location case
                  const location = result.postOffices[0];
                  stateInput.value = location.state;
                  cityInput.value = location.city;
                  
                  if (localityInput) localityInput.value = location.locality;
                } else {
                  // Multiple locations case
                  const { dropdownContainer, select } = createLocalityDropdown(
                    result.postOffices,
                    section
                  );
                  const targetInput = localityInput || pincodeInput;
                  targetInput.parentNode.insertBefore(
                    dropdownContainer,
                    targetInput.nextSibling
                  );
                  currentDropdown = dropdownContainer;

                  // Set first location's city and state
                  stateInput.value = result.postOffices[0].state;
                  cityInput.value = result.postOffices[0].city;
                  
                  // Handle locality selection
                  select.addEventListener("change", (e) => {
                    const selected = result.postOffices[e.target.value];
                    if (localityInput) {
                      localityInput.value = selected.locality;
                      localityInput.readOnly = true;
                      localityInput.style.opacity = "0.8";
                      localityInput.style.cursor = "not-allowed";
                    }
                    stateInput.value = selected.state;
                    cityInput.value = selected.city;
                    
                    if (document.getElementById("appointmentDate").value) {
                      updateRegistrarOffices();
                    }

                    dropdownContainer.remove();
                    currentDropdown = null;
                    select.disabled = true;
                  });
                }

                // Make city and state readonly
                stateInput.readOnly = true;
                cityInput.readOnly = true;
                [stateInput, cityInput].forEach((input) => {
                  input.style.opacity = "0.8";
                  input.style.cursor = "not-allowed";
                });
                const appointmentDate = document.getElementById("appointmentDate");
                if (appointmentDate && appointmentDate.value) {
                  updateRegistrarOffices();
                }
              } 
              else {
                alert("Could not find location data for this PIN code");
                // Reset loading state
                stateInput.value = "";
                cityInput.value = "";
                if (localityInput) localityInput.value = "";
              }
            } catch (error) {
              console.error("Error in pincode lookup:", error);
              alert("Error fetching location data");
              // Reset loading state
              stateInput.value = "";
              cityInput.value = "";
              if (localityInput) localityInput.value = "";
            }
          }
        });
      }
    }
  });
}

// Property data fetch and form population
async function fetchPropertyDetails(propertyId) {
  try {
    const response = await fetch(`/api/property/${propertyId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Property not found");
    }

    const data = await response.json();

    // Populate form fields with property data
    document.querySelector('input[placeholder="Property ID"]').value =
      propertyId;
    document.querySelector('input[placeholder="City"]').value = data.city || "";
    document.querySelector('input[placeholder="Land Area"]').value =
      data.land_area || "";
    document.querySelector('input[placeholder="Built-up Area"]').value =
      data.built_up_area || "";
    document.querySelector(
      'input[placeholder="Property Classification"]'
    ).value = data.property_classification || "";

    // Set property type and make it readonly
    const propertyTypeSelect = document.getElementById("propertyType");
    if (data.type_of_property) {
      Array.from(propertyTypeSelect.options).forEach((option) => {
        if (
          option.value.toLowerCase() === data.type_of_property.toLowerCase()
        ) {
          propertyTypeSelect.value = option.value;
          // Make the select element readonly
          propertyTypeSelect.disabled = true;
          propertyTypeSelect.style.opacity = "0.8";
          propertyTypeSelect.style.cursor = "not-allowed";
        }
      });
    }

    // Calculate and set stamp duty if purchase value exists
    const purchaseValueInput = document.querySelector(
      'input[placeholder="Purchase Value"]'
    );
    const stampDutyInput = document.querySelector(
      'input[placeholder="Stamp Duty & Registration Fees"]'
    );

    if (purchaseValueInput.value) {
      const estimatedFees = calculateEstimatedFees(
        purchaseValueInput.value,
        data.city,
        data.type_of_property
      );
      stampDutyInput.value = estimatedFees;
    }

    // If property has location info, trigger pincode lookup
    if (data.pincode) {
      const pincodeInput = document.querySelector(
        'input[placeholder="Pincode"]'
      );
      if (pincodeInput) {
        pincodeInput.value = data.pincode;
        // Create and dispatch an input event to trigger the pincode lookup
        const inputEvent = new Event("input", { bubbles: true });
        pincodeInput.dispatchEvent(inputEvent);
      }
    }

    // If property has plot/flat number
    if (data.plot_number) {
      document.querySelector('input[placeholder="Plot / Flat Number"]').value =
        data.plot_number;
    }

    // If property has street address
    if (data.street) {
      document.querySelector('input[placeholder="Street"]').value = data.street;
    }

    // If property has locality
    if (data.locality) {
      document.querySelector('input[placeholder="Locality"]').value =
        data.locality;
    }

    // Handle transaction type if available
    if (data.transaction_type) {
      const transactionTypeSelect = document.getElementById("transactionType");
      if (transactionTypeSelect) {
        Array.from(transactionTypeSelect.options).forEach((option) => {
          if (
            option.value.toLowerCase() === data.transaction_type.toLowerCase()
          ) {
            transactionTypeSelect.value = option.value;
          }
        });
      }
    }
  } catch (error) {
    console.error("Error fetching property details:", error);
    alert("Could not find property with the given ID");

    // Clear form fields
    const formFields = [
      "Property ID",
      "City",
      "Land Area",
      "Built-up Area",
      "Property Classification",
      "Plot / Flat Number",
      "Street",
      "Locality",
    ];

    formFields.forEach((field) => {
      const input = document.querySelector(`input[placeholder="${field}"]`);
      if (input) input.value = "";
    });

    // Reset property type select
    const propertyTypeSelect = document.getElementById("propertyType");
    if (propertyTypeSelect) {
      propertyTypeSelect.value = "";
      propertyTypeSelect.disabled = false;
      propertyTypeSelect.style.opacity = "1";
      propertyTypeSelect.style.cursor = "pointer";
    }

    // Reset transaction type select
    const transactionTypeSelect = document.getElementById("transactionType");
    if (transactionTypeSelect) {
      transactionTypeSelect.value = "";
    }
  }
}

// Initialize form function
async function initializeForm() {
  if (await checkAuthentication()) {
    console.log("Authentication successful, initializing form...");

    // Initialize blockchain and await its completion
    const blockchainInitialized = await initializeBlockchain();
    if (!blockchainInitialized) {
      console.error("Blockchain initialization failed");
      return;
    }

    // Prefill email
    await prefillUserEmail();

    // Setup form elements and event listeners
    setupFormElements();
    setupEventListeners();
  }
}

// Setup appointment date picker
function setupAppointmentDatePicker() {
  const appointmentDate = document.getElementById("appointmentDate");
  if (appointmentDate) {
    // Set min date to today
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from today

    // Format dates to YYYY-MM-DD
    const todayStr = today.toISOString().split("T")[0];
    const maxDateStr = maxDate.toISOString().split("T")[0];

    // Set the date range
    appointmentDate.setAttribute("min", todayStr);
    appointmentDate.setAttribute("max", maxDateStr);

    // Listen for date changes
    appointmentDate.addEventListener("change", () => {
      const selectedDate = new Date(appointmentDate.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        alert("Appointment date cannot be in the past");
        appointmentDate.value = todayStr;
        return;
      }

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

// Function to update registrar offices
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

    // Clear existing options
    officeSelect.innerHTML =
      '<option value="register" disabled selected>Choose Sub-Registrar Office</option>';

    // Add new options
    if (data.offices && Array.isArray(data.offices) && data.offices.length > 0) {
      data.offices.forEach((office) => {
        const option = document.createElement("option");
        option.value = office.id || "";
        option.textContent = office.office_name || "Unnamed Office";

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

// Function to update time slots
function updateTimeSlots() {
  const timeSlotSelect = document.getElementById("timeSlot");
  const officeSelect = document.getElementById("Choose");
  const selectedOption = officeSelect.selectedOptions[0];

  if (!selectedOption || !selectedOption.dataset.slots) {
    timeSlotSelect.innerHTML =
      '<option value="" disabled selected>Choose Time Slot</option>';
    timeSlotSelect.disabled = true;
    return;
  }

  // Store the currently selected office ID
  const currentOfficeId = officeSelect.value;

  const slots = JSON.parse(selectedOption.dataset.slots);
  timeSlotSelect.innerHTML =
    '<option value="" disabled selected>Choose Time Slot</option>';

  slots.forEach((slot) => {
    const option = document.createElement("option");
    option.value = slot.value;

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

// Setup form elements
function setupFormElements() {
  const propertyForm = document.getElementById("propertyForm");
  const permanentAddressInputs = document.querySelectorAll(
    'input[placeholder="Permanent Address"]'
  );
  const currentAddressInputs = document.querySelectorAll(
    'input[placeholder="Current Address"]'
  );
  const addressNotes = document.querySelectorAll("em");

  // Back button
  document.getElementById("backButton")?.addEventListener("click", () => {
    history.back();
  });

  // Setup address copy functionality
  permanentAddressInputs.forEach((permanentInput, index) => {
    const currentInput = currentAddressInputs[index];
    const noteElement = addressNotes[index];

    if (
      noteElement &&
      currentInput &&
      noteElement.textContent.includes(
        "Current Address is same as permanent address?"
      )
    ) {
      noteElement.style.cursor = "pointer";
      noteElement.addEventListener("click", () => {
        if (permanentInput.value.trim()) {
          currentInput.value = permanentInput.value;
        } else {
          alert("Please fill in the permanent address first");
        }
      });
    }
  });

  // Setup form submission
  if (propertyForm) {
    propertyForm.addEventListener("submit", handleFormSubmit);
  }
}

// Handle form submission
// In registernewprop.js

// Function 1: Form Submit Handler
async function handleFormSubmit(e) {
  e.preventDefault();

  const submitButton = document.querySelector(".continue-btn");
  submitButton.disabled = true;
  submitButton.textContent = "Processing...";

  try {
    // Check authentication
    const token = getToken();
    if (!token) {
      window.location.href = "/login.html";
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Step 1: Create appointment with proper headers
    const officeSelect = document.getElementById("Choose");
    const appointmentResponse = await fetch("/api/appointments", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        officeId: officeSelect.value,
        officeName: officeSelect.options[officeSelect.selectedIndex].text,
        date: document.getElementById("appointmentDate").value,
        timeSlot: document.getElementById("timeSlot").value,
        type: getAppointmentType(),
      }),
    });

    if (!appointmentResponse.ok) {
      if (appointmentResponse.status === 401) {
        window.location.href = "/login.html";
        return;
      }
      const errorData = await appointmentResponse.json();
      throw new Error(errorData.error || "Failed to create appointment");
    }

    // Step 2: Collect property data with explicit locality
    const localityInput = document.querySelector(
      'input[placeholder="Locality"]'
    );
    const locality = localityInput ? localityInput.value.trim() : null;

    console.log("🏠 Form Submission - Locality Check:", {
      locality: locality,
      inputFound: !!localityInput,
      inputValue: localityInput?.value,
    });

    if (!locality) {
      throw new Error("Locality is required");
    }

    const propertyData = {
      propertyId: document.querySelector('input[placeholder="Property ID"]')
        .value,
      plotNumber: document.querySelector(
        'input[placeholder="Plot / Flat Number"]'
      ).value,
      propertyName: document.querySelector('input[placeholder="Street"]').value,
      street: document.querySelector('input[placeholder="Street"]').value,
      locality: locality, // Explicitly set locality
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
      purchaseValue: document.querySelector(
        'input[placeholder="Purchase Value"]'
      ).value,
      stampDuty: document.querySelector(
        'input[placeholder="Stamp Duty & Registration Fees"]'
      ).value,
    };

    console.log("🏠 Property Data Before Blockchain Registration:", {
      propertyId: propertyData.propertyId,
      locality: propertyData.locality,
      fullData: JSON.stringify(propertyData, null, 2),
    });

    // Step 3: Register on blockchain
    const blockchainResult = await registerPropertyOnBlockchain(propertyData);
    if (!blockchainResult.success) {
      throw new Error(blockchainResult.error);
    }

    console.log("🏠 Blockchain Registration Result:", {
      success: blockchainResult.success,
      locality: blockchainResult.locality,
      txHash: blockchainResult.transactionHash,
    });

    // Step 4: Prepare form data for backend
    const formData = new FormData();

    // Add witness info
    formData.append(
      "witnessInfo",
      JSON.stringify({
        firstName: document.querySelectorAll(
          'input[placeholder="First Name"]'
        )[1].value,
        lastName: document.querySelectorAll('input[placeholder="Last Name"]')[1]
          .value,
        email: document.querySelectorAll(
          'input[placeholder="Email Address"]'
        )[1].value,
        phone: document.querySelectorAll('input[placeholder="Phone Number"]')[1]
          .value,
        idNumber: document.querySelectorAll(
          'input[placeholder="Aadhar / PAN Number"]'
        )[1].value,
        permanentAddress: document.querySelectorAll(
          'input[placeholder="Permanent Address"]'
        )[1].value,
        currentAddress: document.querySelectorAll(
          'input[placeholder="Current Address"]'
        )[1].value,
      })
    );

    // Add owner info with explicit locality
    formData.append(
      "ownerInfo",
      JSON.stringify({
        firstName: document.querySelector('input[placeholder="First Name"]')
          .value,
        lastName: document.querySelector('input[placeholder="Last Name"]')
          .value,
        email: document.querySelector('input[placeholder="Email Address"]')
          .value,
        phone: document.querySelector('input[placeholder="Phone Number"]')
          .value,
        idNumber: document.querySelector(
          'input[placeholder="Aadhar / PAN Number"]'
        ).value,
        permanentAddress: document.querySelector(
          'input[placeholder="Permanent Address"]'
        ).value,
        currentAddress: document.querySelector(
          'input[placeholder="Current Address"]'
        ).value,
        blockchainId: blockchainResult.blockchainId,
        locality: locality, // Include locality in owner info
      })
    );

    // Add property info with explicit locality and blockchain data
    formData.append(
      "propertyInfo",
      JSON.stringify({
        ...propertyData,
        blockchainId: blockchainResult.blockchainId,
        transactionHash: blockchainResult.transactionHash,
        locality: locality, // Ensure locality is included
      })
    );

    formData.append(
      "appointmentInfo",
      JSON.stringify({
        office: document.getElementById("Choose").value,
        date: document.getElementById("appointmentDate").value,
        timeSlot: document.getElementById("timeSlot").value,
      })
    );

    formData.append("registrationType", "registration");

    // Attach document files
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

    // Log formData contents before submission
    console.log("🏠 FormData Before Submission:", {
      propertyInfo: JSON.parse(formData.get("propertyInfo")),
      ownerInfo: JSON.parse(formData.get("ownerInfo")),
      locality: locality,
    });

    // Step 5: Submit to backend
    const response = await fetch("/api/register-property", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Server response:", errorData);
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log("🏠 Registration Response:", responseData);

    alert("Property registered successfully!");
    window.location.href = "./registered.html";
  } catch (error) {
    console.error("🚨 Registration Error:", error);
    if (error.message.includes("No authentication token found")) {
      window.location.href = "/login.html";
      return;
    }
    alert(`Registration failed: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Continue";
  }
}

// Function 2: Blockchain Registration
async function registerPropertyOnBlockchain(propertyData) {
  const submitButton = document.querySelector(".continue-btn");
  submitButton.disabled = true;
  submitButton.textContent = "Processing...";

  try {
    // Use window instances
    if (!window.web3Instance || !window.contractInstance) {
      throw new Error("Blockchain not initialized. Please refresh the page.");
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No MetaMask account available");
    }

    const account = accounts[0];

    // Format property data
    const formattedData = {
      propertyId: String(propertyData.propertyId || "").trim(),
      propertyName: String(
        propertyData.plotNumber || "Plot number not specified"
      ).trim(),
      location: `${propertyData.street || ""}, ${propertyData.locality}, ${
        propertyData.city
      }, ${propertyData.state}`.trim(),
      propertyType: String(propertyData.propertyType || "Not specified").trim(),
    };

    console.log("Property registration data:", formattedData);

    // Call the contract method
    const transaction = await window.contractInstance.methods
      .registerProperty(
        formattedData.propertyId,
        formattedData.propertyName,
        formattedData.location,
        formattedData.propertyType
      )
      .send({
        from: account,
        gas: 98670, // Set a reasonable gas limit
      });

    console.log("Transaction successful:", transaction);

    // Get the blockchainId from the event
    const blockchainId =
      transaction.events.PropertyRegistered.returnValues.blockchainId;

    return {
      success: true,
      blockchainId,
      transactionHash: transaction.transactionHash,
      blockNumber: transaction.blockNumber,
      locality: formattedData.location,
    };
  } catch (error) {
    console.error("Blockchain registration error:", error);
    return {
      success: false,
      error: error.message || "Transaction failed",
    };
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Continue";
  }
}

// Helper function to handle API errors
async function handleApiResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Server error: ${response.status}`);
  }
  return response.json();
}

// Prepare form data for submission
async function prepareFormData(blockchainId) {
  const formData = new FormData();
  formData.append("registrationType", "NEW_PROPERTY");

  // Owner information with blockchain ID
  const ownerInfo = {
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
    blockchainId: blockchainId,
  };
  formData.append("ownerInfo", JSON.stringify(ownerInfo));

  // Property information
  const propertyInfo = {
    propertyId: document.querySelector('input[placeholder="Property ID"]')
      .value,
    plotNumber: document.querySelector(
      'input[placeholder="Plot / Flat Number"]'
    ).value,
    street: document.querySelector('input[placeholder="Street"]').value,
    //locality: document.querySelector('input[placeholder="Locality"]').value,
    //city: document.querySelector('input[placeholder="City"]').value,
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
    blockchainId: blockchainId,
  };
  formData.append("propertyInfo", JSON.stringify(propertyInfo));

  // Witness information
  const witnessInfo = {
    firstName: document.querySelectorAll('input[placeholder="First Name"]')[1]
      .value,
    lastName: document.querySelectorAll('input[placeholder="Last Name"]')[1]
      .value,
    email: document.querySelectorAll('input[placeholder="Email Address"]')[1]
      .value,
    phone: document.querySelectorAll('input[placeholder="Phone Number"]')[1]
      .value,
    idNumber: document.querySelectorAll(
      'input[placeholder="Aadhar / PAN Number"]'
    )[1].value,
    permanentAddress: document.querySelectorAll(
      'input[placeholder="Permanent Address"]'
    )[1].value,
    currentAddress: document.querySelectorAll(
      'input[placeholder="Current Address"]'
    )[1].value,
  };
  formData.append("witnessInfo", JSON.stringify(witnessInfo));

  // Appointment details
  const appointmentInfo = {
    office: document.getElementById("Choose").value,
    datetime: document.getElementById("date").value,
  };
  formData.append("appointmentInfo", JSON.stringify(appointmentInfo));

  // Document files
  const documentInputs = [
    "saleDeed",
    "taxReceipts",
    "encumbrance",
    "occupancy",
    "buildingPlan",
    "powerAttorney",
    "photoCertificate",
  ];

  documentInputs.forEach((id) => {
    const fileInput = document.getElementById(id);
    if (fileInput.files[0]) {
      formData.append(id, fileInput.files[0]);
    }
  });

  return formData;
}

// Setup all event listeners
function setupEventListeners() {
  // Property ID lookup event
  const propertyIdInput = document.querySelector(
    'input[placeholder="Property ID"]'
  );
  propertyIdInput?.addEventListener("input", (e) => {
    const propertyId = e.target.value.trim();
    if (propertyId.length >= 6) {
      fetchPropertyDetails(propertyId);
    }
  });

  // Setup PAN input handling
  const panInputs = document.querySelectorAll(
    'input[placeholder="Aadhar / PAN Number"]'
  );
  panInputs.forEach((input) => {
    input.addEventListener("input", function (e) {
      const value = e.target.value;
      // Check if the input matches PAN format (or starting to)
      if (/^[A-Za-z0-9]*$/.test(value)) {
        // Convert to uppercase and update the input
        const upperValue = value.toUpperCase();
        e.target.value = upperValue;

        // Optional: Add visual feedback if it matches complete PAN format
        if (validations.pan.regex.test(upperValue)) {
          input.style.borderColor = "#4CAF50"; // Green for valid
        } else {
          input.style.borderColor = ""; // Reset to default
        }
      } else {
        // If invalid characters are entered, remove them
        e.target.value = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      }
    });
  });

  // Setup appointment date picker
  setupAppointmentDatePicker();

  // Setup office selection change handler
  const officeSelect = document.getElementById("Choose");
  if (officeSelect) {
    officeSelect.addEventListener("change", () => {
      updateTimeSlots();
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

  // Date validation
  setupDateValidation();
  setupAppointmentDatePicker();

  // Purchase value and stamp duty calculation
  setupPurchaseValueCalculation();

  // Pincode lookup
  setupPincodeLookup();

  // File upload handling
  setupFileUploadHandlers();
}

// Setup date validation
function setupDateValidation() {
  // Transaction date validation - must not be in future
  const transactionDateInput = document.querySelector(
    'section:not(.appointment-details) input[type="date"]'
  );

  if (transactionDateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const maxDate = `${year}-${month}-${day}`;

    transactionDateInput.setAttribute("max", maxDate);
    transactionDateInput.value = maxDate;

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

// Setup purchase value calculation
function setupPurchaseValueCalculation() {
  const purchaseValueInput = document.querySelector(
    'input[placeholder="Purchase Value"]'
  );
  const cityInput = document.querySelector('input[placeholder="City"]');
  const propertyTypeSelect = document.getElementById("propertyType");
  const stampDutyInput = document.querySelector(
    'input[placeholder="Stamp Duty & Registration Fees"]'
  );

  purchaseValueInput?.addEventListener("input", function () {
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

// Setup file upload handlers
function setupFileUploadHandlers() {
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", function (e) {
      const file = e.target.files[0];
      const maxSize = e.target.dataset.maxSize * 1024 * 1024;
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

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeForm().catch((error) => {
    console.error("Form initialization failed:", error);
  });
});

export { checkAuthentication, initializeForm, registerPropertyOnBlockchain };
