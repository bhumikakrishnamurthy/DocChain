import {
  getToken,
  getAuthHeaders,
  isAuthenticated,
  getDeviceId,
  getDeviceInfo,
} from "./auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from "./config.js";
import {
  initWeb3,
  PROPERTY_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  executeContractMethod,
} from "./web3-config.js";

// State management
let activities = [];
let currentTab = "details";
let currentVerificationDoc = null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Add spinner and logout button elements
const loginSpinner = document.getElementById("loginSpinner");
const logoutButton = document.getElementById("logout");
const signatureUpdateButton = document.getElementById("updateSignature");

if (signatureUpdateButton) {
  signatureUpdateButton.addEventListener("click", () => {
    showModal("signatureModal");
  });
}

function debugLog(message, data) {
  console.log(`DEBUG: ${message}`, data !== undefined ? data : "");
}

// Fetch and display user name
async function getUserName() {
  try {
    debugLog("Fetching user data...");
    const token = getToken();
    if (!token) {
      debugLog("No authentication token available");
      throw new Error("No token available");
    }

    // Make request to the server to get user data
    const response = await fetch("/getUserData", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Device-ID": getDeviceId(),
      },
    });

    if (!response.ok) {
      debugLog(`Failed to fetch user data: ${response.status}`);
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data = await response.json();
    debugLog("User data received:", data);

    return data.name || "User";
  } catch (error) {
    console.error("Error fetching user data:", error);
    return "User"; // Default fallback
  }
}

// Fetch and display user name
async function updateUserInfo() {
  try {
    debugLog("Updating user info...");

    // Get user's name
    const name = await getUserName();
    debugLog("User name retrieved:", name);

    // Extract first and last initials for avatar
    const nameParts = name.split(" ");
    let avatarText;

    if (nameParts.length > 1) {
      // If we have first and last name, use both initials
      avatarText =
        nameParts[0].charAt(0).toUpperCase() +
        nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    } else {
      // If only one name part, use first two letters or duplicate first letter
      avatarText =
        name.length > 1
          ? name.charAt(0).toUpperCase() + name.charAt(1).toUpperCase()
          : name.charAt(0).toUpperCase() + name.charAt(0).toUpperCase();
    }

    // Update avatar and username in DOM
    const avatarElement = document.getElementById("avatar");
    const userNameElement = document.getElementById("userFName");

    if (avatarElement) {
      avatarElement.textContent = avatarText;
      debugLog("Avatar updated to:", avatarText);
    } else {
      debugLog("Avatar element not found in DOM");
    }

    if (userNameElement) {
      userNameElement.textContent = name;
      debugLog("Username updated to:", name);
    } else {
      debugLog("Username element not found in DOM");
    }

    return { name, avatarText };
  } catch (error) {
    console.error("Error updating user info:", error);

    // Fallback to default values if there's an error
    const avatarElement = document.getElementById("avatar");
    const userNameElement = document.getElementById("userFName");

    if (avatarElement) avatarElement.textContent = "US";
    if (userNameElement) userNameElement.textContent = "User";
  }
}

// Fetch dashboard metrics
async function fetchMetrics() {
  try {
    const response = await fetch("/api/metrics", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login.html";
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw metrics response:", data);
    updateMetricsDisplay(data);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    showToast("Failed to load metrics", "error");
  }
}

// Update metrics display
function updateMetricsDisplay(data) {
  console.log("Updating metrics display:", data);

  // Pending Verifications (Registration)
  const pendingValue = document.querySelector(".metric-value.text-red");
  if (pendingValue) {
    pendingValue.textContent = data?.pendingCount || "0";
  }
  const pendingSubtext = document.querySelector(".card .metric-subtext");
  if (pendingSubtext) {
    pendingSubtext.textContent = `${data?.urgentCount || "0"} urgent`;
  }

  // Transfer Requests
  const transferValue = document.querySelector(".metric-value.text-yellow");
  if (transferValue) {
    transferValue.textContent = data?.transferCount || "0";
  }
  const transferSubtext = document.querySelector(
    ".card:nth-child(2) .metric-subtext"
  );
  if (transferSubtext) {
    transferSubtext.textContent = `${
      data?.pendingApprovalCount || "0"
    } pending approval`;
  }

  // Document Verifications
  const verificationValue = document.querySelector(".metric-value.text-green");
  if (verificationValue) {
    verificationValue.textContent = data?.verificationCount || "0";
  }
  const verificationSubtext = document.querySelector(
    ".card:nth-child(3) .metric-subtext"
  );
  if (verificationSubtext) {
    verificationSubtext.textContent = `${data?.verifiedCount || "0"} verified`;
  }
}

// Add this new function to fetch verification documents
async function fetchVerificationDocuments() {
  try {
    debugLog("Starting fetchVerificationDocuments");
    const response = await fetch("/api/pending-documents", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login.html";
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    debugLog("API response received, parsing JSON");
    const data = await response.json();
    debugLog("Fetched verification documents:", data);

    // Filter out any documents that are not in pending status
    const documents = data.success ? data.documents : [];
    const filteredDocuments = documents.filter(
      (doc) =>
        // Only include documents with pending status
        (doc.status === "pending" || !doc.status) &&
        // Make sure they are not already verified
        !doc.isVerified &&
        // Also check verification status
        doc.verificationStatus !== "verified" &&
        doc.verificationStatus !== "rejected"
    );

    console.log(
      `Filtered out ${
        documents.length - filteredDocuments.length
      } completed/verified/rejected documents`
    );
    return filteredDocuments;
  } catch (error) {
    console.error("Error fetching verification documents:", error);
    showToast("Failed to load verification documents", "error");
    return [];
  }
}

// File preview handling
document
  .getElementById("docFile")
  ?.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewContainer = document.getElementById(
      "signaturePreviewContainer"
    );
    const preview = document.getElementById("signaturePreview");

    if (!previewContainer || !preview) return;

    // Display the container
    previewContainer.style.display = "block";

    // Show file info
    preview.innerHTML = `
    <div class="file-details">
      <div><i class="fas fa-file-alt fa-2x text-primary mb-2"></i></div>
      <div><strong>${file.name}</strong></div>
      <div>Size: ${(file.size / 1024).toFixed(2)} KB</div>
      <div>Type: ${file.type || "Unknown"}</div>
    </div>
  `;
  });

// Create signature function
window.createSignature = async function (event) {
  event.preventDefault();

  const docFile = document.getElementById("docFile").files[0];

  if (!docFile) {
    showToast("Please select a document to sign", "error");
    return;
  }

  // Show loading state
  const submitButton = event.target;
  const originalButtonText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Processing...';

  try {
    // Create FormData object
    const formData = new FormData();
    formData.append("document", docFile);

    // Important: Don't set Content-Type header - browser will set it with correct boundary
    const headers = getFormDataAuthHeaders();

    const response = await fetch("/api/create-signature", {
      method: "POST",
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Get the signed document as a blob
    const signedDocBlob = await response.blob();

    // Create a download link for the signed document
    const downloadUrl = URL.createObjectURL(signedDocBlob);

    // Update the preview with download link
    const preview = document.getElementById("signaturePreview");
    if (preview) {
      preview.innerHTML = `
        <div class="signed-document">
          <div><i class="fas fa-file-signature fa-3x text-green mb-3"></i></div>
          <div><strong>Document signed successfully!</strong></div>
          <div class="mt-2">
            <a href="${downloadUrl}" download="${docFile.name.replace(
        /\.[^/.]+$/,
        ""
      )}_signed.pdf" class="signature-download-btn">
              <i class="fas fa-download"></i> Download Signed Document
            </a>
          </div>
        </div>
      `;
    }

    showToast("Document signed successfully");

    // Add an activity for this action
    addActivity({
      type: "signature",
      docId: docFile.name,
      timestamp: new Date().toLocaleString(),
      hash: "sig_" + Math.random().toString(36).substring(2, 10),
    });
  } catch (error) {
    console.error("Error creating signature:", error);
    showToast("Failed to create signature: " + error.message, "error");

    // Reset the preview
    const previewContainer = document.getElementById(
      "signaturePreviewContainer"
    );
    if (previewContainer) {
      previewContainer.style.display = "none";
    }
  } finally {
    // Restore button state
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
};

// Helper function to get auth headers for FormData requests
function getFormDataAuthHeaders() {
  const token =
    localStorage.getItem("trustvault_prod_token") ||
    localStorage.getItem("trustvault_dev_token");

  // For FormData, we don't set Content-Type as browser needs to set boundaries
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Device-ID": getDeviceId(),
  };

  return headers;
}

// Function to clean up blob URLs when modal is closed
const originalCloseModal = window.closeModal;
window.closeModal = function (modalId) {
  // Call the original closeModal function
  originalCloseModal(modalId);

  // Additional cleanup for signature modal
  if (modalId === "signatureModal") {
    // Find and revoke any blob URLs in the modal
    const preview = document.getElementById("signaturePreview");
    if (preview) {
      const links = preview.querySelectorAll("a[href^='blob:']");
      links.forEach((link) => {
        URL.revokeObjectURL(link.href);
      });
    }

    // Reset the form
    const form = document.getElementById("signatureForm");
    if (form) form.reset();

    // Hide the preview container
    const previewContainer = document.getElementById(
      "signaturePreviewContainer"
    );
    if (previewContainer) {
      previewContainer.style.display = "none";
    }
  }
};

// Update the verification documents display
async function showVerificationList() {
  try {
    const verificationDocs = await fetchVerificationDocuments();
    const list = document.getElementById("verificationList");
    if (!list) {
      console.error("Verification list container not found");
      return;
    }

    list.innerHTML = '<p class="text-center p-4">Loading documents...</p>';
    list.innerHTML = generateVerificationTable(verificationDocs);
  } catch (error) {
    console.error("Error showing verification list:", error);
    const list = document.getElementById("verificationList");
    if (list) {
      list.innerHTML =
        '<p class="text-center p-4 text-red">Error loading documents</p>';
    }
  }
}

// Update the table generation function to match other tables
function generateVerificationTable(docs) {
  if (!docs || !docs.length) {
    return '<p class="text-center p-4">No pending verification documents found</p>';
  }

  return `
      <div class="table-container">
          <table class="table">
              <thead>
                  <tr>
                      <th>Request ID</th>
                      <th>Document Type</th>
                      <th>Submission Date</th>
                      <th>Status</th>
                      <th>Action</th>
                  </tr>
              </thead>
              <tbody>
                  ${docs
                    .map(
                      (doc) => `
                      <tr>
                          <td>${doc.requestId}</td>
                          <td>${doc.documentType
                            ?.replace(/-/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}</td>
                          <td>${new Date(
                            doc.submissionDate
                          ).toLocaleDateString()}</td>
                          <td>
                              <span class="status status-pending">
                                  Pending Verification
                              </span>
                          </td>
                          <td>
                              <button class="btn-primary" onclick="showVerificationDetails('${
                                doc.requestId
                              }', 'document')">
                                  View & Verify
                              </button>
                          </td>
                      </tr>
                  `
                    )
                    .join("")}
              </tbody>
          </table>
      </div>
  `;
}

// Global window functions
window.showModal = function (modalId) {
  debugLog(`Opening modal: ${modalId}`);

  const modalBackdrop = document.getElementById("modalBackdrop");
  const modal = document.getElementById(modalId);

  if (!modal) {
    debugLog(`ERROR: Modal with id ${modalId} not found`);
    return;
  }

  // Show backdrop
  if (modalBackdrop) {
    modalBackdrop.classList.remove("hidden");
    debugLog("Modal backdrop displayed");
  }

  // Show modal
  modal.style.display = "block";
  debugLog(`Modal ${modalId} displayed`);

  // Load appropriate content based on modal type
  if (modalId === "pendingModal") {
    debugLog("Loading pending list");
    // Small delay to ensure modal is in the DOM
    setTimeout(() => showPendingList(), 50);
  } else if (modalId === "transferModal") {
    debugLog("Loading transfer list");
    showTransferList();
  } else if (modalId === "verificationModal") {
    debugLog("Loading verification list");
    showVerificationList();
  }
};

// Add these near the top of your file with other window assignments
window.verifyCurrentDocument = function () {
  if (!currentVerificationDoc) {
    showToast("No document selected for verification", "error");
    return;
  }
  verifyDocument(currentVerificationDoc._id, currentVerificationDoc.type);
};

window.rejectCurrentDocument = function () {
  if (!currentVerificationDoc) {
    showToast("No document selected for verification", "error");
    return;
  }
  rejectDocument(currentVerificationDoc._id);
};

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Clean up any blob URLs in images
    const images = modal.getElementsByTagName("img");
    for (const img of images) {
      if (img.src.startsWith("blob:")) {
        URL.revokeObjectURL(img.src);
      }
    }

    // Clean up any blob URLs in iframes
    const iframes = modal.getElementsByTagName("iframe");
    for (const iframe of iframes) {
      if (iframe.src.startsWith("blob:")) {
        URL.revokeObjectURL(iframe.src);
      }
    }

    // Hide modal
    modal.style.display = "none";
    document.getElementById("modalBackdrop")?.classList.add("hidden");

    // Only reset currentVerificationDoc if explicitly requested
    if (
      modalId === "propertyVerificationModal" &&
      modal.dataset.resetVerification === "true"
    ) {
      currentVerificationDoc = null;
      modal.dataset.resetVerification = "false";
    }
  }
};

window.showToast = function (message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.style.display = "block";
  toast.style.background = type === "success" ? "var(--green)" : "var(--red)";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
};

// Fetch and display pending documents
async function fetchPendingDocuments() {
  try {
    debugLog("Starting fetchPendingDocuments");

    const response = await fetch("/api/pending-requests", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      debugLog(`API error: ${response.status}`);
      if (response.status === 401) {
        window.location.href = "/login.html";
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    debugLog("API response received, parsing JSON");
    const data = await response.json();
    debugLog("Parsed response data:", data);

    // Check if data has the expected structure
    if (data && Array.isArray(data.requests)) {
      debugLog(`Found ${data.requests.length} requests in data.requests array`);
      return data.requests;
    } else if (Array.isArray(data)) {
      debugLog(`Found ${data.length} requests in direct array format`);
      return data;
    } else {
      debugLog("Unexpected data format, returning empty array", data);
      return [];
    }
  } catch (error) {
    debugLog("Error fetching pending documents:", error);
    showToast("Failed to load pending documents", "error");
    return [];
  }
}

// Document Lists
async function showPendingList() {
  const pendingDocs = await fetchPendingDocuments();
  const list = document.getElementById("pendingList");
  if (list) {
    // Fix: Use a more flexible filter that includes "new_registration"
    const registrationDocs =
      pendingDocs.filter(
        (doc) =>
          doc?.type === "registration" ||
          doc?.type === "new_registration" ||
          doc?.type?.includes("registration")
      ) || [];

    console.log("Found registration documents:", registrationDocs.length);
    list.innerHTML = generateDocumentTable(registrationDocs);
  }
}

// Helper function to populate the list element
async function showPendingListInElement(listElement) {
  // Show loading indicator
  listElement.innerHTML =
    '<p class="text-center p-4">Loading registration documents...</p>';

  try {
    debugLog("Fetching pending documents");
    const pendingDocs = await fetchPendingDocuments();
    debugLog("Pending documents received:", pendingDocs);

    // Check if pendingDocs exists and is an array
    if (!pendingDocs || !Array.isArray(pendingDocs)) {
      debugLog("Invalid pending documents received");
      listElement.innerHTML =
        '<p class="text-center p-4">No registration documents found (invalid data)</p>';
      return;
    }

    // Filter for registration documents
    debugLog("Filtering for registration documents");
    const registrationDocs = pendingDocs.filter(
      (doc) => doc && doc.type === "registration"
    );
    debugLog("Registration documents after filtering:", registrationDocs);

    // Generate the table HTML
    debugLog("Generating document table");
    const tableHtml = generateDocumentTable(registrationDocs);
    debugLog("Table HTML generated:", tableHtml.length);

    // Update the DOM
    debugLog("Updating DOM with table HTML");
    listElement.innerHTML = tableHtml;
    debugLog("DOM updated successfully");
  } catch (error) {
    debugLog("Error in showPendingListInElement:", error);
    listElement.innerHTML = `<p class="text-center p-4 text-red">Error loading documents: ${error.message}</p>`;
  }
}

async function showTransferList() {
  const pendingDocs = await fetchPendingDocuments();
  const list = document.getElementById("transferList");
  if (list) {
    const transferDocs =
      pendingDocs.filter((doc) => doc?.type === "transfer") || [];
    list.innerHTML = generateDocumentTable(transferDocs);
  }
}

async function showCompletedList() {
  try {
    const response = await fetch("/api/pending-requests", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched completed documents:", data);
    const list = document.getElementById("completedList");
    if (list) {
      const completedDocs =
        data.requests.filter((doc) => doc?.status === "completed") || [];
      list.innerHTML = generateDocumentTable(completedDocs);
    }
  } catch (error) {
    console.error("Error fetching completed documents:", error);
    showToast("Failed to load completed documents", "error");
  }
}

function generateDocumentTable(docs) {
  debugLog("generateDocumentTable called with docs:", docs);

  if (!docs || !Array.isArray(docs) || docs.length === 0) {
    debugLog("No documents to display");
    return '<p class="text-center p-4">No documents found</p>';
  }

  try {
    debugLog("Building table with " + docs.length + " rows");

    let rowsHtml = "";

    // Process each document individually for better error handling
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      debugLog(`Processing document ${i}:`, doc);

      if (!doc) {
        debugLog(`Document ${i} is null/undefined, skipping`);
        continue;
      }

      try {
        // Extract properties safely
        const propertyId = doc.propertyId || "N/A";
        const propertyType = doc.propertyType
          ? doc.propertyType.charAt(0).toUpperCase() + doc.propertyType.slice(1)
          : "Unknown";

        let dateStr = "N/A";
        if (doc.createdAt) {
          try {
            dateStr = new Date(doc.createdAt).toLocaleDateString();
          } catch (dateError) {
            debugLog(`Error formatting date for doc ${i}:`, dateError);
          }
        }

        const status = doc.status || "pending";
        const type = doc.type || "unknown";

        // Add row HTML
        rowsHtml += `
          <tr>
            <td>${propertyId}</td>
            <td>${propertyType}</td>
            <td>${dateStr}</td>
            <td>
              <span class="status status-${status}">
                ${status.toUpperCase()}
              </span>
            </td>
            <td>
              <button class="btn-primary" onclick="showVerificationDetails('${propertyId}', '${type}')">
                View & Verify
              </button>
            </td>
          </tr>
        `;

        debugLog(`Row generated for document ${i}`);
      } catch (rowError) {
        debugLog(`Error generating row for document ${i}:`, rowError);
        // Skip this row but continue with others
      }
    }

    if (!rowsHtml) {
      debugLog("No valid rows generated");
      return '<p class="text-center p-4">No valid documents found</p>';
    }

    // Build complete table
    const tableHtml = `
      <table class="table">
        <thead>
          <tr>
            <th>Property ID</th>
            <th>Type</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    debugLog("Table HTML generated successfully");
    return tableHtml;
  } catch (error) {
    debugLog("Error generating document table:", error);
    return `<p class="text-center p-4 text-red">Error generating table: ${error.message}</p>`;
  }
}

// Verification details display
window.showVerificationDetails = async function (id, type) {
  try {
    console.log("Showing verification details:", { id, type });

    let response;
    let request;

    if (type === "document") {
      // Document verification handling
      const modal = document.getElementById("verificationModal");
      const content = modal.querySelector(".document-list");

      if (!modal || !content) {
        console.error("Modal elements not found");
        return;
      }

      content.innerHTML =
        '<div class="text-center p-4">Loading verification details...</div>';
      modal.style.display = "block";
      document.getElementById("modalBackdrop")?.classList.remove("hidden");

      response = await fetch(`/api/pending-documents/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      content.innerHTML = generateDocumentVerificationContent(data.document);
    } else {
      // Property verification logic (registration or transfer)
      const modal = document.getElementById("propertyVerificationModal");
      if (!modal) return;

      response = await fetch("/api/pending-requests", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      request = data.requests.find(
        (req) => req.propertyId === id && req.type === type
      );

      if (!request) {
        throw new Error("Property details not found");
      }

      currentVerificationDoc = request;
      console.log(
        "Set currentVerificationDoc for property:",
        currentVerificationDoc
      );

      const titleElement = modal.querySelector(".modal-header h2");
      if (titleElement) {
        titleElement.innerHTML = `<i class="fas fa-check-circle"></i> ${
          type === "transfer" ? "Property Transfer" : "Property Registration"
        } Verification`;
      }

      const tabsElement = modal.querySelector(".tabs");
      if (tabsElement) {
        tabsElement.style.display = "flex";
        switchVerificationTab("details");
      }

      modal.style.display = "block";
      document.getElementById("modalBackdrop")?.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error showing verification details:", error);
    showToast("Error loading verification details: " + error.message, "error");
  }
};

window.switchVerificationTab = function (tabName) {
  if (!currentVerificationDoc) return;

  // Update tab styling
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    if (tab.getAttribute("onclick").includes(tabName)) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Update content based on selected tab
  const content = document.getElementById("verificationContent");
  if (!content) return;

  try {
    switch (tabName) {
      case "details":
        content.innerHTML = generatePropertyDetails(currentVerificationDoc);
        break;
      case "owner":
        content.innerHTML = generateOwnerInfo(currentVerificationDoc);
        break;
      case "documents":
        content.innerHTML = generateDocumentsList(currentVerificationDoc);
        break;
      case "blockchain":
        content.innerHTML = generateBlockchainInfo(currentVerificationDoc);
        break;
      default:
        content.innerHTML =
          '<p class="text-center p-4">Tab content not available</p>';
    }
  } catch (error) {
    console.error(`Error generating ${tabName} content:`, error);
    content.innerHTML =
      '<p class="text-center p-4 text-red">Error loading content</p>';
  }
};

// Function to generate document verification content
function generateDocumentVerificationContent(doc) {
  console.log("Processing document:", doc);
  return `
      <div class="document-verification-details">
          <!-- Personal Information Section -->
          <div class="section mb-6">
              <h3 class="text-lg font-medium mb-4">Personal Information</h3>
              <div class="detail-row">
                  <div class="detail-item">
                      <label>Name:</label>
                      <span>${doc.personalInfo?.firstName} ${
    doc.personalInfo?.lastName
  }</span>
                  </div>
                  <div class="detail-item">
                      <label>Email:</label>
                      <span>${doc.personalInfo?.email || "N/A"}</span>
                  </div>
              </div>
              <div class="detail-row">
                  <div class="detail-item">
                      <label>Document Type:</label>
                      <span>${doc.documentType || "N/A"}</span>
                  </div>
                  <div class="detail-item">
                      <label>Submission Date:</label>
                      <span>${new Date(
                        doc.submissionDate
                      ).toLocaleDateString()}</span>
                  </div>
              </div>
          </div>

          <!-- Document Preview Section -->
          <div class="section mb-6">
              <h3 class="text-lg font-medium mb-4">Document Preview</h3>
              <div class="document-preview">
                  ${Object.entries(doc.documents || {})
                    .map(([key, value]) => {
                      console.log("Processing document:", key, value);
                      const isImage = isImageFile(key, value.mimetype, value);
                      return `
                          <div class="document-item p-2 border rounded mb-2 flex justify-between items-center">
                              <span>${key
                                .replace(/([A-Z])/g, " $1")
                                .trim()}</span>
                              <button 
                                  class="btn-secondary"
                                  onclick="viewVerificationDocument('${
                                    doc.requestId
                                  }', '${key}', '${
                        value.mimetype
                      }', ${JSON.stringify(value).replace(/"/g, "&quot;")})">
                                  <i class="fas fa-eye"></i> View ${
                                    isImage ? "Image" : "Document"
                                  }
                              </button>
                          </div>
                      `;
                    })
                    .join("")}
              </div>
          </div>

          <!-- Verification Notes -->
          <div class="verification-notes mt-6 mb-4">
              <h3 class="text-lg font-medium mb-2">Verification Notes</h3>
              <textarea 
                  id="verificationNotes" 
                  class="w-full p-3 bg-darker border border-gray-700 rounded-lg" 
                  rows="4"
                  placeholder="Add your verification notes here..."></textarea>
              <p class="text-sm text-gray mt-2">Please provide detailed notes about your verification decision</p>
          </div>

          <!-- Verification Buttons -->
          <div class="verification-form mt-4">
              <div class="button-group">
                  <button class="btn-primary" onclick="verifyDocument('${
                    doc.requestId
                  }', 'document')">
                      <i class="fas fa-check"></i> Approve & Verify
                  </button>
                  <button class="btn-secondary" onclick="rejectDocument('${
                    doc.requestId
                  }')">
                      <i class="fas fa-times"></i> Reject
                  </button>
                  <button class="btn-secondary" onclick="closeModal('verificationModal')">
                      <i class="fas fa-times"></i> Cancel
                  </button>
              </div>
          </div>
      </div>
  `;
}

// Helper function to safely stringify object for HTML attributes
function safeStringify(obj) {
  if (!obj) return "{}";
  return JSON.stringify(obj)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Helper function for step status icons
function getStepStatusIcon(status) {
  switch (status) {
    case "completed":
      return '<i class="fas fa-check-circle text-green"></i>';
    case "pending":
      return '<i class="fas fa-clock text-yellow"></i>';
    default:
      return '<i class="fas fa-circle text-gray"></i>';
  }
}

// Property details generation
window.generatePropertyDetails = function (doc) {
  console.log("Generating property details for doc:", doc);

  return `
      <div class="property-details p-4">
          <div class="detail-row">
              <div class="detail-item">
                  Property ID: ${doc.propertyId || "N/A"}
              </div>
              <div class="detail-item">
                  Property Type: ${
                    (doc.propertyType || "N/A").charAt(0).toUpperCase() +
                    (doc.propertyType || "").slice(1)
                  }
              </div>
          </div>

          <div class="detail-row">
              <div class="detail-item">
                  Location: ${doc.location || "N/A"}
              </div>
              <div class="detail-item">
                  Land Area: ${doc.landArea || "N/A"}
              </div>
          </div>

          <div class="detail-row">
              <div class="detail-item">
                  Built Up Area: ${doc.builtUpArea || "N/A"}
              </div>
              <div class="detail-item">
                  Classification: ${doc.classification || "N/A"}
              </div>
          </div>

          <div class="detail-row">
              <div class="detail-item">
                  Transaction Type: ${
                    (doc.transactionType || "N/A").charAt(0).toUpperCase() +
                    (doc.transactionType || "").slice(1)
                  }
              </div>
              <div class="detail-item">
                  Registration Date: ${
                    doc.createdAt
                      ? new Date(doc.createdAt).toLocaleDateString()
                      : "N/A"
                  }
              </div>
          </div>

          <div class="detail-row">
              <div class="detail-item">
                  Plot Number: ${doc.plotNumber || "N/A"}
              </div>
          </div>

          <div class="detail-row">
              <div class="detail-item">
                  Purchase Value: ₹${
                    doc.purchaseValue
                      ? Number(doc.purchaseValue).toLocaleString()
                      : "N/A"
                  }
              </div>
              <div class="detail-item">
                  Stamp Duty: ₹${
                    doc.stampDuty
                      ? Number(doc.stampDuty).toLocaleString()
                      : "N/A"
                  }
              </div>
          </div>

          <div class="verification-notes mt-4">
              <h3>Verification Notes</h3>
              <textarea id="verificationNotes" class="w-full p-2 mt-2" rows="4" 
                  placeholder="Add your verification notes here!"></textarea>
          </div>
      </div>
  `;
};

window.generateOwnerInfo = function (doc) {
  // Get the correct owner info depending on document type
  const isTransfer = doc.type === "transfer";
  const currentOwner = isTransfer ? doc.currentOwnerInfo : doc.ownerInfo;
  const newOwner = isTransfer ? doc.newOwnerInfo : null;

  return `
    <div class="owner-info">
      <h3 class="text-lg font-medium mb-4">${
        isTransfer ? "Current Owner Details" : "Owner Details"
      }</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="detail-item">
          <label>Name:</label>
          <span>${currentOwner?.firstName || ""} ${
    currentOwner?.lastName || ""
  }</span>
        </div>
        <div class="detail-item">
          <label>Email:</label>
          <span>${currentOwner?.email || "N/A"}</span>
        </div>
        <div class="detail-item">
          <label>ID Number:</label>
          <span>${currentOwner?.idNumber || "N/A"}</span>
        </div>
        <div class="detail-item">
          <label>Phone:</label>
          <span>${currentOwner?.phone || "N/A"}</span>
        </div>
      </div>

      ${
        isTransfer && newOwner
          ? `
        <div class="mt-6 pt-6 border-t border-gray-700">
          <h3 class="text-lg font-medium mb-4">New Owner Details</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="detail-item">
              <label>Name:</label>
              <span>${newOwner.firstName || ""} ${
              newOwner.lastName || ""
            }</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${newOwner.email || "N/A"}</span>
            </div>
            <div class="detail-item">
              <label>ID Number:</label>
              <span>${newOwner.idNumber || "N/A"}</span>
            </div>
            <div class="detail-item">
              <label>Phone:</label>
              <span>${newOwner.phone || "N/A"}</span>
            </div>
            <div class="detail-item">
              <label>ETH Address:</label>
              <span class="text-sm">${newOwner.ethAddress || "N/A"}</span>
            </div>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
};

// Generate documents list
window.generateDocumentsList = function (doc) {
  const documents = doc.documents || {};

  return `
    <div class="documents-list">
      ${
        Object.keys(documents).length
          ? Object.entries(documents)
              .map(([key, value]) => {
                const isImage = isImageFile(key, undefined, value);
                const buttonText = isImage ? "View Image" : "View Document";
                const buttonIcon = isImage ? "image" : "file-pdf";

                return `
              <div class="document-item p-2 border rounded mb-2 flex justify-between items-center">
                <span>${key.replace(/([A-Z])/g, " $1").trim()}</span>
                <button onclick="window.viewDocument('${
                  doc.propertyId
                }', '${key}', '${doc.type}')" 
                        class="btn-secondary">
                  <i class="fas fa-${buttonIcon}"></i> ${buttonText}
                </button>
              </div>
            `;
              })
              .join("")
          : '<p class="text-center p-4">No documents available</p>'
      }
    </div>
  `;
};

window.generateBlockchainInfo = function (doc) {
  const { blockchainDetails = {}, ipfsHash } = doc;

  return `
      <div class="blockchain-info">
          <h3>Blockchain Information</h3>
          
          ${
            ipfsHash
              ? `
              <div class="detail-row">
                  <span class="detail-label">IPFS Hash:</span>
                  <span class="detail-value monospace">${ipfsHash}</span>
              </div>
          `
              : ""
          }

          <div class="detail-row">
              <span class="detail-label">Transaction Hash:</span>
              <span class="detail-value monospace">${
                blockchainDetails.transactionHash || "Not available"
              }</span>
          </div>

          <div class="detail-row">
              <span class="detail-label">Block Number:</span>
              <span class="detail-value">${
                blockchainDetails.blockNumber || "Not available"
              }</span>
          </div>

          <div class="detail-row">
              <span class="detail-label">Verification Status:</span>
              <span class="status status-${
                doc.isVerified ? "verified" : "pending"
              }">
                  ${doc.isVerified ? "Verified" : "Pending"}
              </span>
          </div>
      </div>
  `;
};

// Helper function to detect if a file is an image based on name/type
function isImageFile(filename, contentType, documentMetadata = null) {
  console.log("=== File Type Detection ===");
  console.log("Filename:", filename);
  console.log("Content-Type:", contentType);
  console.log("Document Metadata:", documentMetadata);

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const imageMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
  ];

  // Check filename from metadata
  const originalName = documentMetadata?.originalName?.toLowerCase() || "";
  const originalMimeType = documentMetadata?.mimetype || "";
  const filePath =
    typeof documentMetadata === "string" ? documentMetadata.toLowerCase() : "";

  console.log("Original filename:", originalName);
  console.log("Original mimetype:", originalMimeType);
  console.log("File path:", filePath);

  const hasImageExtension = imageExtensions.some(
    (ext) =>
      originalName.endsWith(ext) ||
      filename.toLowerCase().endsWith(ext) ||
      filePath.endsWith(ext)
  );

  const isImageMimeType =
    imageMimeTypes.includes(originalMimeType) ||
    imageMimeTypes.includes(contentType);

  console.log("Has image extension:", hasImageExtension);
  console.log("Has image MIME type:", isImageMimeType);

  const isImage = hasImageExtension || isImageMimeType;
  console.log("Final determination - Is Image:", isImage);

  return isImage;
}

async function viewDocument(url, headers) {
  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login.html";
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    const blob = await response.blob();

    // Create a blob URL with the correct content type
    const blobUrl = URL.createObjectURL(
      new Blob([blob], { type: contentType })
    );
    const newTab = window.open(blobUrl, "_blank");

    // Clean up the blob URL after the new tab loads
    if (newTab) {
      newTab.addEventListener(
        "load",
        () => {
          URL.revokeObjectURL(blobUrl);
        },
        { once: true }
      );
    }
  } catch (error) {
    console.error("Error viewing document:", error);
    showToast("Failed to load document", "error");
  }
}

// Function for viewing property documents
window.viewDocument = async function (propertyId, docKey, type) {
  try {
    console.log("Viewing property document:", { propertyId, docKey, type });
    const url = `/api/property/${propertyId}/document/${docKey}/view?type=${type}`;

    // Get document metadata first
    const docMetadata = currentVerificationDoc?.documents?.[docKey];
    const isImage = isImageFile(docKey, undefined, docMetadata);

    console.log("Document metadata:", docMetadata);
    console.log("Is image:", isImage);

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login.html";
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    const blob = await response.blob();

    // Determine the correct content type
    let effectiveContentType;
    if (isImage) {
      // For images, try to determine the correct image MIME type from the file extension
      if (
        docKey.toLowerCase().endsWith(".jpg") ||
        docKey.toLowerCase().endsWith(".jpeg")
      ) {
        effectiveContentType = "image/jpeg";
      } else if (docKey.toLowerCase().endsWith(".png")) {
        effectiveContentType = "image/png";
      } else {
        effectiveContentType = "image/jpeg"; // default to JPEG if unknown
      }
    } else {
      effectiveContentType = "application/pdf"; // default to PDF for documents
    }

    console.log("Using content type:", effectiveContentType);

    // Create blob with correct content type
    const blobUrl = URL.createObjectURL(
      new Blob([blob], { type: effectiveContentType })
    );
    const newTab = window.open(blobUrl, "_blank");

    // Clean up blob URL after new tab loads
    if (newTab) {
      newTab.addEventListener(
        "load",
        () => {
          URL.revokeObjectURL(blobUrl);
        },
        { once: true }
      );
    }
  } catch (error) {
    console.error("Error viewing document:", error);
    showToast("Failed to load document", "error");
  }
};

// Function for viewing verification documents
const viewVerificationDocument = async function (
  requestId,
  documentKey,
  documentType = "",
  documentMetadata = null
) {
  const url = `/api/verification-requests/${requestId}/document/${documentKey}`;
  await viewDocument(url, getAuthHeaders());
};

// Helper function to display image in modal
function displayImageInModal(blob, title) {
  const imageUrl = URL.createObjectURL(blob);

  const modalHtml = `
      <div id="imageViewerModal" class="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div class="modal-content bg-gray-900 rounded-lg overflow-hidden max-w-4xl w-full">
              <div class="flex justify-between items-center p-4 border-b border-gray-700">
                  <h3 class="text-lg font-medium">${title}</h3>
                  <button onclick="closeImageModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>
              <div class="p-4">
                  <img src="${imageUrl}" alt="${title}" class="max-w-full max-h-[80vh] object-contain mx-auto">
              </div>
          </div>
      </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// Helper function to close image modal
window.closeImageModal = function () {
  const modal = document.getElementById("imageViewerModal");
  if (modal) {
    const img = modal.querySelector("img");
    if (img && img.src) {
      URL.revokeObjectURL(img.src);
    }
    modal.remove();
  }
};

// Handle ID conversion
function convertPropertyIdToHex(propertyId) {
  // Remove any non-alphanumeric characters
  const cleanId = propertyId.replace(/[^a-zA-Z0-9]/g, "");

  // Pad the string to at least 32 bytes
  const paddedId = cleanId.padEnd(64, "0");

  // Convert to bytes32
  return "0x" + paddedId;
}

// First, let's add a debug helper
function debugLogObject(obj, label = "Object Debug") {
  console.log("=== " + label + " ===");
  console.log("Full object:", obj);
  console.log("Keys:", Object.keys(obj));
  console.log("=== End Debug ===");
}

// Function to verify document with blockchain integration
window.verifyDocument = async function (docId, type) {
  try {
    const notes = document.getElementById("verificationNotes")?.value;
    if (!notes) {
      showToast("Please add verification notes", "error");
      return;
    }

    // Show loading state
    const verifyButton = document.querySelector(
      ".verification-form .btn-primary"
    );
    if (verifyButton) {
      verifyButton.disabled = true;
      verifyButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    if (type === "registration" || type === "transfer") {
      try {
        const propertyId = currentVerificationDoc?.propertyId;
        const contractAddress =
          currentVerificationDoc?.blockchainDetails?.contractAddress;

        if (!propertyId || !contractAddress) {
          throw new Error("Missing property or blockchain details");
        }

        showToast("Connecting to blockchain...", "info");
        const blockchainResult = await verifyPropertyOnBlockchain(
          propertyId,
          contractAddress
        );

        if (!blockchainResult.success) {
          throw new Error("Blockchain verification failed");
        }

        // Create server transaction object
        const serverTransaction = {
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber,
          gasUsed: blockchainResult.gasUsed,
          status: blockchainResult.status,
        };

        // Prepare verification data
        const verificationData = {
          documentId: docId,
          type: type,
          verificationNotes: notes,
          blockchainTransaction: serverTransaction,
          currentBlockchainId: contractAddress,
        };

        // For transfer requests, include owner information
        if (type === "transfer") {
          verificationData.currentOwnerInfo =
            currentVerificationDoc.currentOwnerInfo;
          verificationData.newOwnerInfo = currentVerificationDoc.newOwnerInfo;
          verificationData.propertyInfo = {
            propertyId: currentVerificationDoc.propertyId,
            locality: currentVerificationDoc.location?.split(", ")[1] || "",
            propertyType: currentVerificationDoc.propertyType,
            propertyName: currentVerificationDoc.propertyName,
          };
        }

        // Log the verification data being sent
        console.log("Sending verification data:", verificationData);

        // Update server with verification data
        const response = await fetch("/api/complete-property-verification", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(verificationData),
        });

        if (!response.ok) {
          throw new Error(`Server verification failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          showToast(
            `${
              type.charAt(0).toUpperCase() + type.slice(1)
            } verified successfully!`
          );
        } else {
          throw new Error(result.error || "Verification failed");
        }
      } catch (error) {
        console.error("Property verification error:", error);
        if (error.message.includes("MetaMask")) {
          showToast("Please connect your MetaMask wallet", "error");
        } else {
          showToast(`Verification failed: ${error.message}`, "error");
        }
        throw error;
      }
    } else {
      // Document verification handling
      try {
        showToast("Processing document verification...", "info");

        // Send complete verification data
        const response = await fetch("/api/complete-document-verification", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            documentId: docId,
            verificationNotes: notes,
            documentData: currentVerificationDoc, // Include the full document data
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Document verification failed: ${response.statusText}`
          );
        }

        const result = await response.json();

        if (result.success && result.data?.ipfsHash) {
          showToast("Document verified and stored on IPFS successfully!");
          console.log("IPFS Hash:", result.data.ipfsHash);
        } else {
          throw new Error(result.error || "Verification failed");
        }
      } catch (error) {
        console.error("Document verification error:", error);
        showToast(`Verification failed: ${error.message}`, "error");
        throw error;
      }
    }

    // Reset current verification doc
    currentVerificationDoc = null;

    // Close modal and update dashboard
    const modal = document.getElementById("propertyVerificationModal");
    if (modal) {
      modal.dataset.resetVerification = "true";
      closeModal("propertyVerificationModal");
    } else {
      closeModal("verificationModal");
    }

    // Update dashboard
    updateDashboard();
  } catch (error) {
    console.error("Verification error:", error);
    showToast(error.message, "error");
  } finally {
    // Reset button state
    const verifyButton = document.querySelector(
      ".verification-form .btn-primary"
    );
    if (verifyButton) {
      verifyButton.disabled = false;
      verifyButton.innerHTML = '<i class="fas fa-check"></i> Approve & Verify';
    }
  }
};

// Helper function to convert BigInt values
function serializeTransaction(tx) {
  return {
    transactionHash: tx.transactionHash,
    blockNumber: tx.blockNumber ? Number(tx.blockNumber) : null,
    gasUsed: tx.gasUsed ? Number(tx.gasUsed) : null,
    status: tx.status ? Boolean(Number(tx.status)) : null,
  };
}

// Function to verify property on blockchain
async function verifyPropertyOnBlockchain(propertyId, contractAddress) {
  try {
    const web3Instance = await initWeb3();
    if (!web3Instance || !web3Instance.web3) {
      throw new Error("Web3 initialization failed");
    }

    console.log("Verifying property:", {
      propertyId,
      contractAddress,
    });

    const contract = new web3Instance.web3.eth.Contract(
      PROPERTY_REGISTRY_ABI,
      CONTRACT_ADDRESSES.PropertyRegistry
    );

    const accounts = await web3Instance.web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts available");
    }

    console.log("Using account:", accounts[0]);
    console.log("Verifying at contract address:", contractAddress);

    const tx = await contract.methods.verifyProperty(contractAddress).send({
      from: accounts[0],
      gas: 500000,
    });

    console.log("Blockchain verification successful:", tx);

    // Convert BigInt values to regular numbers
    return {
      success: true,
      transactionHash: tx.transactionHash,
      blockNumber: Number(tx.blockNumber),
      gasUsed: Number(tx.gasUsed),
      status: Boolean(Number(tx.status)),
      blockchainId: contractAddress, // Include the blockchainId
    };
  } catch (error) {
    console.error("Blockchain verification error:", error);
    throw error;
  }
}

// Document rejection
window.rejectDocument = async function (docId) {
  try {
    // Get verification notes
    const notes = document.getElementById("verificationNotes")?.value;
    if (!notes) {
      showToast("Please add rejection notes", "error");
      return;
    }

    // Show loading state
    const rejectButton = document.querySelector(
      ".verification-form .btn-secondary"
    );
    if (rejectButton) {
      rejectButton.disabled = true;
      rejectButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    // Check if this looks like a document verification request ID (starts with "req_")
    // This is a heuristic based on your document structure
    let type = "document";
    if (docId.startsWith("req_")) {
      type = "document";
      console.log("Document ID format detected, using type: document");
    } else if (currentVerificationDoc) {
      type = currentVerificationDoc.type || "document";
      console.log("Using type from currentVerificationDoc:", type);
    } else {
      // Try to determine type from modal context
      const propertyModal = document.getElementById(
        "propertyVerificationModal"
      );
      if (propertyModal && propertyModal.style.display !== "none") {
        // If property modal is open, check which tab is active
        const activeTab = document.querySelector(".tab.active");
        if (activeTab) {
          const tabType = activeTab.textContent.toLowerCase();
          if (tabType.includes("transfer")) {
            type = "transfer";
          } else {
            type = "registration"; // Default for property modal
          }
        }
      }
    }

    console.log(`Rejecting ${type} with ID: ${docId}`);

    // Prepare rejection data
    const rejectionData = {
      documentId: docId,
      type: type,
      rejectionNotes: notes,
    };

    console.log("Sending rejection data:", rejectionData);

    // Submit rejection request
    const response = await fetch("/api/reject-verification", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(rejectionData),
    });

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("Error parsing response JSON:", e);
      throw new Error("Invalid response from server");
    }

    if (!response.ok) {
      console.error("Error response details:", result);
      throw new Error(result.error || `Server returned ${response.status}`);
    }

    if (result.success) {
      showToast(`Document rejected successfully`, "success");

      // Reset current verification doc
      currentVerificationDoc = null;

      // Close the appropriate modal
      const propertyModal = document.getElementById(
        "propertyVerificationModal"
      );
      const verificationModal = document.getElementById("verificationModal");

      if (propertyModal && propertyModal.style.display !== "none") {
        propertyModal.dataset.resetVerification = "true";
        closeModal("propertyVerificationModal");
      } else if (verificationModal) {
        closeModal("verificationModal");
      }

      // Update dashboard
      updateDashboard();
    } else {
      throw new Error(result.error || "Rejection failed");
    }
  } catch (error) {
    console.error("Document rejection error:", error);
    showToast(`Rejection failed: ${error.message}`, "error");
  } finally {
    // Reset button state
    const rejectButton = document.querySelector(
      ".verification-form .btn-secondary"
    );
    if (rejectButton) {
      rejectButton.disabled = false;
      rejectButton.innerHTML = '<i class="fas fa-times"></i> Reject';
    }
  }
};

// Generate document details
window.generateDocumentDetails = function (doc) {
  console.log("Generating document details for doc:", doc);

  if (!doc)
    return '<p class="text-center p-4">No document details available</p>';

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // Get verification step status icon
  const getStepStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return '<i class="fas fa-check-circle text-green"></i>';
      case "pending":
        return '<i class="fas fa-clock text-yellow"></i>';
      default:
        return '<i class="fas fa-circle text-gray"></i>';
    }
  };

  return `
      <div class="document-details p-4">
          <!-- Personal Information Section -->
          <div class="detail-section mb-6">
              <h3 class="text-lg font-medium mb-4">Personal Information</h3>
              <div class="detail-row">
                  <div class="detail-item">
                      <label>Name:</label>
                      <span>${doc.personalInfo.firstName} ${
    doc.personalInfo.lastName
  }</span>
                  </div>
                  <div class="detail-item">
                      <label>Email:</label>
                      <span>${doc.personalInfo.email}</span>
                  </div>
              </div>
              <div class="detail-row">
                  <div class="detail-item">
                      <label>Phone:</label>
                      <span>${doc.personalInfo.phone}</span>
                  </div>
                  <div class="detail-item">
                      <label>ID Number:</label>
                      <span>${doc.personalInfo.idNumber}</span>
                  </div>
              </div>
              <div class="detail-row">
                  <div class="detail-item">
                      <label>Document Type:</label>
                      <span class="capitalize">${doc.documentType.replace(
                        /-/g,
                        " "
                      )}</span>
                  </div>
                  <div class="detail-item">
                      <label>Submission Date:</label>
                      <span>${formatDate(doc.submissionDate)}</span>
                  </div>
              </div>
          </div>

          <!-- Verification Progress Section -->
          <div class="detail-section mb-6">
              <h3 class="text-lg font-medium mb-4">Verification Progress</h3>
              <div class="verification-steps">
                  ${doc.verificationSteps
                    .map(
                      (step) => `
                      <div class="verification-step ${step.status}">
                          <div class="step-icon">
                              ${getStepStatusIcon(step.status)}
                          </div>
                          <div class="step-details">
                              <div class="step-name capitalize">${step.step.replace(
                                /_/g,
                                " "
                              )}</div>
                              <div class="step-timestamp text-gray">
                                  ${
                                    step.timestamp
                                      ? formatDate(step.timestamp)
                                      : "Pending"
                                  }
                              </div>
                          </div>
                      </div>
                  `
                    )
                    .join("")}
              </div>
          </div>

          <!-- Submitted Documents Section -->
          <div class="detail-section mb-6">
              <h3 class="text-lg font-medium mb-4">Submitted Documents</h3>
              <div class="documents-grid grid grid-cols-2 gap-4">
                  ${Object.entries(doc.documents || {})
                    .map(
                      ([key, document]) => `
                      <div class="document-item p-4 border rounded">
                          <div class="document-icon mb-2">
                              <i class="fas fa-file-pdf text-xl"></i>
                          </div>
                          <div class="document-info">
                              <div class="document-name text-sm font-medium mb-1">
                                  ${key.replace(/([A-Z])/g, " $1").trim()}
                              </div>
                              <div class="document-size text-gray text-sm">
                                  ${Math.round(document.size / 1024)} KB
                              </div>
                          </div>
                          <button onclick="window.viewVerificationDocument('${
                            doc.requestId
                          }', '${key}')" 
                                  class="btn-secondary mt-2 w-full">
                              <i class="fas fa-eye"></i> View
                          </button>
                      </div>
                  `
                    )
                    .join("")}
              </div>
          </div>

          <!-- Blockchain Information -->
          <div class="detail-section mb-6">
              <h3 class="text-lg font-medium mb-4">Blockchain Information</h3>
              <div class="blockchain-info p-4 bg-darker rounded">
                  <div class="detail-row">
                      <span class="detail-label">Blockchain ID:</span>
                      <span class="detail-value monospace">${
                        doc.currentBlockchainId || "Not available"
                      }</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Verification Status:</span>
                      <span class="status status-${
                        doc.isVerified ? "verified" : "pending"
                      }">
                          ${doc.isVerified ? "Verified" : "Pending"}
                      </span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Last Updated:</span>
                      <span class="detail-value">${formatDate(
                        doc.lastUpdated
                      )}</span>
                  </div>
              </div>
          </div>

          <!-- Verification Notes -->
          <div class="verification-notes mt-6">
              <h3 class="text-lg font-medium mb-2">Verification Notes</h3>
              <textarea id="verificationNotes" class="w-full p-2 mt-2 bg-darker" rows="4" 
                  placeholder="Add your verification notes here..."></textarea>
          </div>
      </div>
  `;
};

// Add helper function to view verification documents
window.viewVerificationDocument = async function (
  requestId,
  documentKey,
  documentType = "",
  documentMetadata = null
) {
  try {
    const url = `/api/verification-requests/${requestId}/document/${documentKey}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    const blob = await response.blob();

    console.log("Viewing document with content type:", contentType);

    // Use the metadata's mimetype if available, otherwise use the response content type
    const effectiveContentType = documentMetadata?.mimetype || contentType;
    console.log("Using effective content type:", effectiveContentType);

    // Create blob URL with the effective content type
    const blobUrl = URL.createObjectURL(
      new Blob([blob], { type: effectiveContentType })
    );
    const newTab = window.open(blobUrl, "_blank");

    // Clean up blob URL after new tab loads
    if (newTab) {
      newTab.addEventListener(
        "load",
        () => {
          URL.revokeObjectURL(blobUrl);
        },
        { once: true }
      );
    }
  } catch (error) {
    console.error("Error viewing document:", error);
    showToast("Failed to load document", "error");
  }
};

// Activity Management
function addActivity(activity) {
  activities.unshift(activity);
  updateActivityList();
}

// function updateActivityList() {
//   const list = document.getElementById("activityList");
//   if (!list) return;

//   if (!activities.length) {
//     list.innerHTML = '<p class="text-center p-4">No recent activity</p>';
//     return;
//   }

//   list.innerHTML = activities
//     .map(
//       (activity) => `
//         <div class="activity-item">
//             <div class="activity-icon">
//                 <i class="fas fa-${getActivityIcon(activity.type)}"></i>
//             </div>
//             <div>
//                 <p>${getActivityDescription(activity)}</p>
//                 <small class="text-gray">${activity.timestamp}</small>
//             </div>
//         </div>
//     `
//     )
//     .join("");
// }

// function getActivityIcon(type) {
//   switch (type) {
//     case "verify":
//       return "check-circle";
//     case "transfer":
//       return "exchange-alt";
//     default:
//       return "file-alt";
//   }
// }

function getActivityDescription(activity) {
  switch (activity.type) {
    case "verify":
      return `Document ${activity.docId} verified with hash ${activity.hash}`;
    case "transfer":
      return `Transfer ${activity.docId} processed`;
    case "reject":
      return `${activity.docId} rejected: ${
        activity.details || "No details provided"
      }`;
    case "signature":
      return `Document ${activity.docId} signed`;
    default:
      return `Action performed on ${activity.docId}`;
  }
}

// Initialize dashboard
async function updateDashboard() {
  try {
    console.log("Initializing dashboard...");
    await updateUserInfo();
    await Promise.all([
      fetchMetrics(),
      showPendingList(),
      showTransferList(),
      showVerificationList(),
      startActivityRefresh(),
    ]);

    console.log("Dashboard initialization complete");
  } catch (error) {
    console.error("Error during dashboard initialization:", error);
    showToast("Error loading dashboard", "error");
  }
}

// Event Listeners
window.addEventListener("load", () => {
  console.log("Page loaded, initializing dashboard...");
  updateDashboard();

  // Set up periodic refresh
  setInterval(() => {
    console.log("Running periodic dashboard refresh");
    updateDashboard();
  }, 300000); // Refresh every 5 minutes
});

// Modal backdrop click handler
window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
    document.getElementById("modalBackdrop")?.classList.add("hidden");
  }
};

// Activity Management
async function fetchRecentActivities() {
  try {
    const response = await fetch("/api/recent-activities", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.activities || [];
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    showToast("Failed to load recent activities", "error");
    return [];
  }
}

function formatTimeAgo(timestamp) {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  return activityTime.toLocaleDateString();
}

function getActivityIcon(type) {
  switch (type) {
    case "verify":
      return "check-circle";
    case "transfer":
      return "exchange-alt";
    case "reject":
      return "times-circle";
    case "signature":
      return "file-signature";
    case "DOCUMENT_VERIFICATION":
      return "file-alt";
    case "PROPERTY_REGISTRATION":
      return "home";
    case "PROPERTY_TRANSFER":
      return "exchange-alt";
    default:
      return "circle";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "VERIFIED":
      return "text-green";
    case "PENDING":
      return "text-yellow";
    case "REJECTED":
      return "text-red";
    default:
      return "text-gray";
  }
}

async function updateActivityList() {
  const list = document.getElementById("activityList");
  if (!list) return;

  list.innerHTML = '<div class="text-center p-4">Loading activities...</div>';

  const activities = await fetchRecentActivities();

  if (!activities.length) {
    list.innerHTML = '<div class="text-center p-4">No recent activity</div>';
    return;
  }

  list.innerHTML = activities
    .map(
      (activity) => `
        <div class="activity-item bg-darker p-4 rounded mb-4">
          <div class="flex items-start gap-4">
            <div class="activity-icon">
              <i class="fas fa-${getActivityIcon(
                activity.activityType
              )} ${getStatusColor(activity.status)}"></i>
            </div>
            <div class="flex-grow">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-medium">${
                    activity.details?.description || "Activity performed"
                  }</p>
                  <p class="text-sm text-gray mt-1">
                    ${activity.property?.name || ""} ${
        activity.property?.location ? `- ${activity.property.location}` : ""
      }
                  </p>
                </div>
                <span class="text-sm text-gray">
                  ${formatTimeAgo(activity.timestamp)}
                </span>
              </div>
              <div class="mt-2">
                <span class="status status-${(
                  activity.status || "pending"
                ).toLowerCase()}">
                  ${activity.status || "PENDING"}
                </span>
              </div>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

// Setup auto-refresh for activities
let activityRefreshInterval;

function startActivityRefresh() {
  // Initial load
  updateActivityList();

  // Refresh every 5 minutes
  activityRefreshInterval = setInterval(updateActivityList, 300000);

  // Also refresh when tab becomes visible
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      updateActivityList();
    }
  });
}

function stopActivityRefresh() {
  if (activityRefreshInterval) {
    clearInterval(activityRefreshInterval);
  }
}

// Function to manually refresh activities
window.refreshActivities = async function () {
  const refreshBtn = document.querySelector(".refresh-btn");
  if (refreshBtn) {
    refreshBtn.classList.add("rotating");
  }

  await updateActivityList();

  if (refreshBtn) {
    refreshBtn.classList.remove("rotating");
  }
};

// Logout function
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
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

      // Add delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear local storage and redirect
      localStorage.clear();

      // Sign out from Firebase
      await signOut(auth);

      // Redirect to login page
      window.location.href = "/Login.html";
    } catch (error) {
      console.error("Error during logout:", error);
      showToast("Logout failed: " + error.message, "error");

      // If server invalidation fails, still try to sign out
      try {
        await signOut(auth);
        localStorage.clear();
        window.location.href = "/Login.html";
      } catch (firebaseError) {
        console.error("Firebase signout error:", firebaseError);
      }
    } finally {
      loginSpinner.style.display = "none";
      logoutButton.disabled = false;
    }
  });
}

// Initial load
updateDashboard();

// Export functions
export {
  isImageFile,
  viewDocument,
  viewVerificationDocument,
  generateDocumentVerificationContent,
};
