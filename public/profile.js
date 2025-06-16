// Import Web3 and configurations
import { initWeb3 } from "./web3-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getToken,
  getAuthHeaders,
  isAuthenticated,
  getDeviceId,
  getDeviceInfo,
} from "./auth.js";
import { firebaseConfig } from "./config.js";

let web3Instance = null;
let userData = null;
let walletStatus = {
  isConnected: false,
  address: null,
  chainId: null,
};
const logoutSpinner = document.getElementById("loginSpinner");
const logoutButton = document.getElementById("logout");

// Initialize page data
async function initializePage() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      window.location.href = "./Login.html";
      return;
    }

    // Setup wallet events
    setupWalletEventListeners();

    // Check initial wallet connection
    await checkWalletConnection();

    // Update security center with current status
    updateSecurityCenter();

    // Fetch user data
    await fetchUserData();

    // Fetch verified properties
    await fetchVerifiedProperties();

    // Fetch verified documents
    await fetchVerifiedDocuments();
  } catch (error) {
    console.error("Error initializing page:", error);
    handleError(error);
  }
}

// Fetch user data from the backend
async function fetchUserData() {
  try {
    const response = await fetch("/getUserData", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    userData = await response.json();

    // Update user name
    const userNameElement = document.getElementById("user-name");
    if (userNameElement) {
      userNameElement.textContent = userData.name || "User";
    }

    // Update profile picture with initial
    updateProfileInitial(userData.name);

    // KYC status is always verified as per requirement
    const verifiedBadge = document.querySelector(".verified-badge");
    if (verifiedBadge) {
      verifiedBadge.textContent = "KYC Verified";
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    handleError(error);
  }
}

// Update profile picture with initial
function updateProfileInitial(name) {
  const profileContainer = document.querySelector(".profile-picture-container");
  if (!profileContainer) return;

  // Get initials from name
  const initials = name
    ? name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("")
    : "U";

  profileContainer.innerHTML = `
    <div class="profile-picture">
      <div class="profile-initial">
        ${initials}
      </div>
    </div>
  `;
}

// Fetch verified properties
async function fetchVerifiedProperties() {
  if (!userData) {
    console.log("No user data available");
    return;
  }

  try {
    const response = await fetch("/api/list/property", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch properties");
    const result = await response.json();

    const propertyContainer = document.querySelector(".property-portfolio");
    if (!propertyContainer) {
      console.log("Property container not found in DOM");
      return;
    }

    propertyContainer.innerHTML = "<h2>Property Portfolio</h2>";

    // Get the properties array from the response
    const properties = result.properties || [];

    let cardCount = 0;
    for (const property of properties) {
      // Create property card
      const propertyCard = document.createElement("div");
      propertyCard.className = "property-card";
      propertyCard.innerHTML = `
        <h3>${property.propertyName || "Property"}</h3>
        <p>Location: ${property.location || "Location not specified"}</p>
        <div class="blockchain-info">
          Blockchain ID: ${property.blockchainId || "Processing..."}
        </div>
        <button onclick="window.location='./viewdetail.html?id=${
          property.propertyId
        }'">
          View Details
        </button>
      `;
      propertyContainer.appendChild(propertyCard);
      cardCount++;
    }

    if (cardCount === 0) {
      console.log(
        "No property cards were created, showing 'No properties' message"
      );
      propertyContainer.innerHTML += "<p>No verified properties found.</p>";
    }
  } catch (error) {
    console.error("Error fetching properties:", error);
    handleError(error);
  }
}
// Helper function to handle document viewing
async function viewDocument(documentId) {
  try {
    // Redirect to document detail page
    window.location.href = `./viewdoc.html?id=${documentId}`;
  } catch (error) {
    console.error("Error viewing document:", error);
    alert("Failed to view document. Please try again.");
  }
}

// Fetch verified documents
async function fetchVerifiedDocuments() {
  if (!userData) {
    console.log("No user data available");
    return;
  }

  try {
    const response = await fetch("/api/list/document", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch documents");
    const result = await response.json();

    const documentContainer = document.querySelector(".document-center");
    if (!documentContainer) {
      console.log("Document container not found in DOM");
      return;
    }

    // Get the documents array from the response
    const documents = result.documents || [];

    // Create the document center content
    documentContainer.innerHTML = `
      <h2>Document Center</h2>
      <div class="info-item">
        <label>Pending Verification:</label>
        <p>${documents.length} Documents <span class="verified-badge">Unverified</span></p>
      </div>
      <div class="documents-list"></div>
    `;

    const documentsListDiv = documentContainer.querySelector(".documents-list");

    if (documents.length === 0) {
      documentsListDiv.innerHTML = "<p>No verified documents found.</p>";
    } else {
      // Add each document card
      documents.forEach((doc) => {
        // Ensure the document has the correct date field
        const docWithCorrectDate = {
          ...doc,
          verifiedAt: doc.verifiedAt || doc.verificationDate, // Try both fields
        };
        documentsListDiv.appendChild(createDocumentCard(docWithCorrectDate));
      });
    }

    // Add verify new document button
    const verifyButton = document.createElement("button");
    verifyButton.id = "verify-new-document";
    verifyButton.textContent = "Verify New Document";
    verifyButton.addEventListener("click", () => {
      window.location.href = "./requestdocv.html";
    });
    documentContainer.appendChild(verifyButton);
  } catch (error) {
    console.error("Error fetching documents:", error);
    handleError(error);
  }
}

// Function to get only the verification date from blockchain document
function getVerificationDate(blockchainDoc) {
  // Return early if no document or not verified
  if (!blockchainDoc || !blockchainDoc.isVerified) {
    return "Pending verification";
  }

  // Use verifiedAt date if available
  if (blockchainDoc.verifiedAt) {
    return new Date(blockchainDoc.verifiedAt).toLocaleDateString();
  }

  return "Pending verification";
}

// Helper function to create document card HTML
function createDocumentCard(doc) {
  const card = document.createElement("div");
  card.className = "document-card";

  card.innerHTML = `
    <div class="document-info">
      <h3>${doc.documentType}</h3>
      <p>Request ID: ${doc.requestId}</p>
      <p>Verification Date: ${
        doc.verifiedAt
          ? new Date(doc.verifiedAt).toLocaleDateString()
          : "Pending verification"
      }</p>
      <div class="blockchain-info">
        Blockchain ID: ${
          doc.currentBlockchainId || doc.blockchainId || "Processing..."
        }
      </div>
    </div>
    <div class="document-actions">
      <button class="action-button">View Details</button>
    </div>
  `;

  // Add event listener to the view button
  const viewButton = card.querySelector(".action-button");
  viewButton.addEventListener("click", () => {
    window.location.href = `./viewdoc.html?id=${doc.requestId}`;
  });

  return card;
}

// Create property card HTML
function createPropertyCard(property) {
  const div = document.createElement("div");
  div.className = "property-card";
  div.innerHTML = `
        <h3>${property.propertyName || "Unnamed Property"}</h3>
        <p>Location: ${property.location || "Location not specified"}</p>
        <p>Registry: ${property.registryId || "N/A"}
            <span class="verified-badge">Verified</span>
        </p>
        <div class="blockchain-info">
            Blockchain ID: ${property.blockchainId || "Processing..."}
        </div>
        <button onclick="window.location='./viewdetail.html?id=${
          property._id
        }'">View Details</button>
    `;
  return div;
}

// Create document item HTML
function createDocumentItem(doc) {
  return `
        <div class="document-item">
            <div class="document-info">
                <h3>${doc.name}</h3>
                <small>Verified on ${new Date(
                  doc.verificationDate
                ).toLocaleDateString()}</small>
            </div>
            <div class="document-actions">
                <button class="action-button" onclick="viewDocument('${
                  doc._id
                }')">View</button>
                <button class="action-button" onclick="downloadDocument('${
                  doc._id
                }')">Download</button>
            </div>
        </div>
    `;
}

async function checkWalletConnection() {
  try {
    if (!window.ethereum) {
      updateSecurityCenter("MetaMask not installed");
      return false;
    }

    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      walletStatus.isConnected = true;
      walletStatus.address = accounts[0];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      walletStatus.chainId = parseInt(chainId, 16).toString();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return false;
  }
}

// Update security center
function updateSecurityCenter(errorMessage = null) {
  const securityContainer = document.querySelector(".security-center");
  if (!securityContainer) return;

  let statusHTML = "<h2>Security Center</h2>";

  if (errorMessage) {
    statusHTML += `
      <div class="alert alert-warning">
        ${errorMessage}
      </div>
    `;
  }

  statusHTML += `
    <div class="info-item">
      <label>Wallet Status:</label>
      <p>${walletStatus.isConnected ? "Connected" : "Not Connected"} 
         <span class="verified-badge">${
           walletStatus.isConnected ? "Active" : "Inactive"
         }</span>
      </p>
    </div>
  `;

  if (walletStatus.isConnected && walletStatus.address) {
    statusHTML += `
      <div class="wallet-details">
        <div class="info-item">
          <label>Wallet Address:</label>
          <p class="blockchain-info">${walletStatus.address}</p>
        </div>
        ${
          walletStatus.chainId
            ? `
          <div class="info-item">
            <label>Network:</label>
            <p>Chain ID: ${walletStatus.chainId}</p>
          </div>
        `
            : ""
        }
        <button id="change-wallet" class="btn btn-secondary">
          Connect Different Wallet
        </button>
      </div>
    `;
  } else {
    statusHTML += `
      <div class="wallet-connect">
        <button id="connect-wallet" class="btn btn-primary">
          Connect MetaMask Wallet
        </button>
      </div>
    `;
  }

  securityContainer.innerHTML = statusHTML;

  // Add event listeners for the buttons
  const connectButton = document.getElementById("connect-wallet");
  const changeButton = document.getElementById("change-wallet");

  if (connectButton) {
    connectButton.addEventListener("click", connectWallet);
  }
  if (changeButton) {
    changeButton.addEventListener("click", changeWallet);
  }
}

// Connect wallet function
async function connectWallet() {
  try {
    if (!window.ethereum) {
      updateSecurityCenter("MetaMask not installed");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts[0]) {
      walletStatus.isConnected = true;
      walletStatus.address = accounts[0];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      walletStatus.chainId = parseInt(chainId, 16).toString();
      updateSecurityCenter();
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    updateSecurityCenter(
      "Failed to connect wallet. Make sure MetaMask is installed and unlocked."
    );
  }
}

// Change wallet function
async function changeWallet() {
  try {
    if (!window.ethereum) {
      updateSecurityCenter("MetaMask not installed");
      return;
    }

    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts[0]) {
      walletStatus.isConnected = true;
      walletStatus.address = accounts[0];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      walletStatus.chainId = parseInt(chainId, 16).toString();
      updateSecurityCenter();
    }
  } catch (error) {
    console.error("Error changing wallet:", error);
    updateSecurityCenter("Failed to change wallet. Please try again.");
  }
}

// Event listener for MetaMask connection
function setupWalletEventListeners() {
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        walletStatus.isConnected = false;
        walletStatus.address = null;
      } else {
        walletStatus.isConnected = true;
        walletStatus.address = accounts[0];
      }
      updateSecurityCenter();
    });

    window.ethereum.on("chainChanged", (chainId) => {
      walletStatus.chainId = parseInt(chainId, 16).toString();
      updateSecurityCenter();
    });
  }
}

// Handle logout
document.getElementById("logout").addEventListener("click", async () => {
  loginSpinner.style.display = "block";
  logoutButton.disabled = true;

  try {
    const token =
      localStorage.getItem("trustvault_prod_token") ||
      localStorage.getItem("trustvault_dev_token");
    if (token) {
      await fetch("/api/auth/invalidate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Device-ID": getDeviceId(),
        },
        body: JSON.stringify({
          deviceInfo: getDeviceInfo(),
        }),
      });
    }

    // Then sign out from Firebase
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Redirect to login page
    window.location.href = "/Login.html";
    localStorage.clear();
  } catch (error) {
    console.error("Error during logout:", error);
    // If server invalidation fails, still try to sign out from Firebase
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = "/login.html";
    } catch (firebaseError) {
      console.error("Firebase signout error:", firebaseError);
    } finally {
      loginSpinner.style.display = "none";
      logoutButton.disabled = false;
    }
  }
});

// Error handling
function handleError(error) {
  if (
    error.message.includes("401") ||
    error.message.includes("unauthorized") ||
    error.message === "Unauthorized"
  ) {
    window.location.href = "./Login.html";
    return;
  }
  console.error("Error:", error);
}

// Initialize page when DOM is loaded
document.addEventListener("DOMContentLoaded", initializePage);
