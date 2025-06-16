import { isAuthenticated, getAuthHeaders } from "./auth.js";

// Initialize the page with auth check
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      window.location.href = "./login.html";
      return;
    }
    await fetchPropertyDetails();
  } catch (error) {
    console.error("Initialization error:", error);
    window.location.href = "./login.html";
  }
});

// Add visibility change listener for continuous auth check
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    isAuthenticated().then((auth) => {
      if (!auth) {
        window.location.href = "./login.html";
      }
    });
  }
});

async function fetchPropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("id");

  if (!propertyId) {
    showError("Property ID not found in URL");
    return;
  }

  try {
    const response = await fetch(`/api/property/details/${propertyId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.success) {
      displayProperty(result.data);
    } else {
      throw new Error(result.error || "Failed to load property details");
    }
  } catch (error) {
    console.error("Error fetching property:", error);
    showError("Failed to load property details");
  }
}

async function viewDocument(docKey) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get("id");

    // Try registration type first
    let response = await fetch(
      `/api/property/${propertyId}/document/${docKey}/view?type=registration`,
      {
        headers: getAuthHeaders(),
      }
    );

    // If registration fails, try transfer
    if (!response.ok && response.status === 404) {
      response = await fetch(
        `/api/property/${propertyId}/document/${docKey}/view?type=transfer`,
        {
          headers: getAuthHeaders(),
        }
      );
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (error) {
    console.error("Error viewing document:", error);
    alert("Failed to view document. Please try again later.");
  }
}

async function downloadDocument(docKey) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get("id");

    // Try registration type first
    let response = await fetch(
      `/api/property/${propertyId}/document/${docKey}/download?type=registration`,
      {
        headers: getAuthHeaders(),
      }
    );

    // If registration fails, try transfer
    if (!response.ok && response.status === 404) {
      response = await fetch(
        `/api/property/${propertyId}/document/${docKey}/download?type=transfer`,
        {
          headers: getAuthHeaders(),
        }
      );
    }

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${docKey}_${propertyId}.pdf`; // Or get filename from response header
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading document:", error);
    alert("Failed to download document. Please try again later.");
  }
}

function displayProperty(property) {
  const content = `
      <div class="navigation">
          <button class="back-button" onclick="goBack()">← Back to Profile</button>
      </div>

      <div class="property-header">
          <h1>${property.propertyName}</h1>
          <p>${property.locality}</p>
          <div class="property-status">
              <span class="status-badge ${
                property.isVerified ? "verified-badge" : ""
              }">${
    property.isVerified ? "Verified on Blockchain" : "Pending Verification"
  }</span>
              <span class="status-badge">${property.propertyType}</span>
          </div>
      </div>

      <div class="gallery">
          <img src="/assets/defaultlandimage.png" alt="Property View 1" class="gallery-img">
          <img src="/assets/defaultlandimage.png" alt="Property View 2" class="gallery-img">
          <img src="/assets/defaultlandimage.png" alt="Property View 3" class="gallery-img">
      </div>

      <div class="section">
          <h2>Property Details</h2>
          <div class="info-grid">
              <div class="info-item">
                  <label>Property Type</label>
                  <p>${property.propertyDetails.propertyType}</p>
              </div>
              <div class="info-item">
                  <label>Built-up Area</label>
                  <p>${property.propertyDetails.builtUpArea}</p>
              </div>
              <div class="info-item">
                  <label>Land Area</label>
                  <p>${property.propertyDetails.landArea}</p>
              </div>
              <div class="info-item">
                  <label>Registration Date</label>
                  <p>${formatDate(
                    property.propertyDetails.registrationDate
                  )}</p>
              </div>
              <div class="info-item">
                  <label>Market Value</label>
                  <p>${formatCurrency(property.propertyDetails.marketValue)}</p>
              </div>
              <div class="info-item">
                  <label>Property Age</label>
                  <p>${property.propertyDetails.propertyAge}</p>
              </div>
          </div>
      </div>

      <div class="section">
          <h2>Blockchain Verification</h2>
          <div class="info-item">
              <label>Blockchain ID</label>
              <div class="blockchain-info" onclick="copyToClipboard(this.textContent)">${
                property.blockchainVerification.blockchainId
              }</div>
          </div>
          <div class="info-item">
              <label>Latest Transaction Hash</label>
              <div class="blockchain-info" onclick="copyToClipboard(this.textContent)">${
                property.blockchainVerification.transactionHash
              }</div>
          </div>
          <div class="info-item">
              <label>Verification Status</label>
              <div class="blockchain-info">${
                property.blockchainVerification.verificationStatus
              }</div>
          </div>
      </div>

      <div class="section">
          <h2>Property Documents</h2>
          ${generateDocumentsList(property.documents)}
      </div>
  `;

  document.getElementById("propertyContent").innerHTML = content;
  initializeEventListeners();
}

function generateDocumentsList(documents) {
  const documentTypes = [
    { key: "saleDeed", name: "Sale Deed" },
    { key: "taxReceipts", name: "Property Tax Records" },
    { key: "buildingPlan", name: "Building Approval Plan" },
  ];

  return documentTypes
    .map((doc) => {
      const documentInfo = documents[doc.key] || { exists: false };
      return `
          <div class="document-item">
              <div class="document-info">
                  <h3>${doc.name}</h3>
                  <small>Last Updated: ${
                    documentInfo.exists
                      ? formatDate(documentInfo.lastUpdated)
                      : "Not available"
                  }</small>
              </div>
              <div class="document-actions">
                  <button class="action-button" onclick="viewDocument('${
                    doc.key
                  }')" ${!documentInfo.exists ? "disabled" : ""}>View</button>
                  <button class="action-button" onclick="downloadDocument('${
                    doc.key
                  }')" ${
        !documentInfo.exists ? "disabled" : ""
      }>Download</button>
              </div>
          </div>
      `;
    })
    .join("");
}

function showError(message) {
  document.getElementById("propertyContent").innerHTML = `
        <div class="navigation">
            <button class="back-button" onclick="goBack()">← Back to Profile</button>
        </div>
        <div class="error">
            <p>${message}</p>
        </div>
    `;
}

function formatDate(dateString) {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatCurrency(value) {
  if (!value || value === "Not specified") return "Not specified";
  try {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numericValue)) return "Not specified";

    if (numericValue >= 10000000) {
      // 1 Crore
      return `₹${(numericValue / 10000000).toFixed(2)} Cr`;
    } else if (numericValue >= 100000) {
      // 1 Lakh
      return `₹${(numericValue / 100000).toFixed(2)} L`;
    } else {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(numericValue);
    }
  } catch {
    return "Not specified";
  }
}

function goBack() {
  window.location = "./profile.html";
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    const tooltip = document.createElement("div");
    tooltip.textContent = "Copied!";
    tooltip.style.cssText = `
          position: fixed;
          background: rgba(60, 130, 246, 0.9);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
      `;
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
  } catch (err) {
    console.error("Failed to copy text:", err);
    alert("Failed to copy to clipboard");
  }
}

function initializeEventListeners() {
  document.querySelectorAll(".blockchain-info").forEach((info) => {
    info.addEventListener("click", function () {
      copyToClipboard(this.textContent);
    });
  });
}

// Export necessary functions for global access
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.goBack = goBack;
window.copyToClipboard = copyToClipboard;
