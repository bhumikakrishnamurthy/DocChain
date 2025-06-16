import { isAuthenticated, getAuthHeaders } from "./auth.js";

// Initialize the page with auth check
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      window.location.href = "./login.html";
      return;
    }
    await fetchDocumentDetails();
  } catch (error) {
    console.error("Initialization error:", error);
    window.location.href = "./login.html";
  }
});

async function fetchDocumentDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get("id");

  if (!requestId) {
    showError("Document ID not found in URL");
    return;
  }

  try {
    const response = await fetch(`/api/document/${requestId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      displayDocument(result.data);
    } else {
      throw new Error(result.error || "Failed to load document details");
    }
  } catch (error) {
    console.error("Error fetching document:", error);
    showError("Failed to load document details");
  }
}

function isLifetimeDocument(documentType) {
  const normalizedType = (documentType || "").toLowerCase().trim();
  const lifetimeDocuments = ["birth-cert", "marriage-cert", "death-cert"];
  return lifetimeDocuments.includes(normalizedType);
}

function calculateAndFormatValidUntil(verifiedAt, documentType) {
  console.log("calculateAndFormatValidUntil received:", {
    verifiedAt,
    documentType,
  });

  if (!verifiedAt) return "Pending Verification";

  const verificationDate = new Date(verifiedAt);
  if (isNaN(verificationDate.getTime())) return "Pending Verification";

  // Check for lifetime documents first
  if (isLifetimeDocument(documentType)) {
    console.log("Document has lifetime validity");
    return "Lifetime Validity";
  }

  // For non-lifetime documents
  const validUntil = new Date(verificationDate);

  // Only normalize and process specific document types
  const normalizedDocType = (documentType || "").toLowerCase().trim();

  // Only apply special validity periods to specific document types
  if (normalizedDocType === "rental-agreement") {
    validUntil.setFullYear(validUntil.getFullYear() + 1);
  } else if (normalizedDocType === "job-letter") {
    validUntil.setMonth(validUntil.getMonth() + 3);
  } else {
    // For all other document types, use the default 10-year validity
    validUntil.setFullYear(validUntil.getFullYear() + 10);
  }

  return formatDate(validUntil);
}

function displayDocument(doc) {
  // Log the incoming document object
  console.log("Document received in displayDocument:", doc);

  // Always calculate validity for verified documents, ignore pre-set validUntil
  const validityDate = doc.isVerified
    ? calculateAndFormatValidUntil(doc.verifiedAt, doc.documentType)
    : "Pending Verification";

  // Log the calculated validity date
  console.log("Validity calculation result:", validityDate);

  const content = `
    <div class="navigation">
      <button class="back-button" onclick="goBack()">← Back to Profile</button>
    </div>

    <div class="property-header">
      <h1>${doc.documentType || "Document Details"}</h1>
      <p>Document ID: ${doc.requestId}</p>
      <div class="property-status">
        <span class="status-badge ${doc.isVerified ? "verified-badge" : ""}">${
    doc.isVerified ? "Verified" : "Pending Verification"
  }</span>
        <span class="status-badge">Submitted: ${formatDate(
          doc.submissionDate
        )}</span>
      </div>
    </div>

    <div class="section">
      <h2>Document Details</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Document Type</label>
          <p>${doc.documentType}</p>
        </div>
        <div class="info-item">
          <label>Status</label>
          <p>${doc.isVerified ? "Verified" : "Pending Verification"}</p>
        </div>
        <div class="info-item">
          <label>Verification Date</label>
          <p>${doc.verifiedAt ? formatDate(doc.verifiedAt) : "Pending"}</p>
        </div>
        <div class="info-item">
          <label>Valid Until</label>
          <p>${validityDate}</p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Blockchain Verification</h2>
      <div class="info-item">
        <label>Blockchain ID</label>
        <div class="blockchain-info" onclick="copyToClipboard(this.textContent)">${
          doc.blockchainId || "Not available"
        }</div>
      </div>
      <div class="info-item">
        <label>IPFS Hash</label>
        <div class="blockchain-info" onclick="copyToClipboard(this.textContent)">${
          doc.ipfsHash || "Not available"
        }</div>
      </div>
      <div class="info-item">
        <label>Verification Status</label>
        <div class="blockchain-info">${
          doc.isVerified
            ? "Verified and Active on Ethereum Mainnet"
            : "Pending Verification"
        }</div>
      </div>
    </div>

    <div class="section">
      <h2>Document Actions</h2>
      <div class="document-item">
        <div class="document-info">
          <h3>${doc.documentType}</h3>
          <small>Last Updated: ${formatDate(doc.submissionDate)}</small>
        </div>
        <div class="document-actions">
          <button class="action-button" onclick="previewDocument('${
            doc.requestId
          }')">View</button>
          <button class="action-button" onclick="downloadDocument('${
            doc.requestId
          }')">Download</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("documentContent").innerHTML = content;
}

function showError(message) {
  document.getElementById("documentContent").innerHTML = `
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

async function previewDocument(requestId) {
  try {
    const authHeaders = getAuthHeaders();
    const url = `/api/document/${requestId}/preview`;
    const response = await fetch(url, { headers: authHeaders });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const blob = await response.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  } catch (error) {
    console.error("Error previewing document:", error);
    alert("Failed to preview document");
  }
}

async function downloadDocument(requestId) {
  try {
    const authHeaders = getAuthHeaders();
    const url = `/api/document/${requestId}/download`;
    const response = await fetch(url, { headers: authHeaders });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `document_${requestId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Error downloading document:", error);
    alert("Failed to download document");
  }
}

function goBack() {
  window.location = "./profile.html";
}

// Export necessary functions for global access
window.previewDocument = previewDocument;
window.downloadDocument = downloadDocument;
window.copyToClipboard = copyToClipboard;
window.goBack = goBack;
