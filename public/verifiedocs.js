import {
  getToken,
  removeToken,
  isAuthenticated,
  getAuthHeaders,
  handleAuthRedirect,
  setToken, // Add this import
} from "./auth.js";

// State management
let documents = [];
let currentFilter = "all";
const supportedPreviewTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
];

// Event listeners setup
function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".filter-button").forEach((btn) => {
        btn.classList.remove("active");
      });
      this.classList.add("active");
      currentFilter = this.dataset.filter || "all";
      renderDocuments();
    });
  });

  // Search input
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", renderDocuments);

  // Upload button
  const uploadButton = document.querySelector(".upload-button");
  if (uploadButton) {
    uploadButton.addEventListener("click", () => {
      window.location = "./requestdocv.html";
    });
  }

  // Add styles for pending status
  const style = document.createElement("style");
  style.textContent = `
    .document-status.pending {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
        border-color: rgba(245, 158, 11, 0.2);
    }
  `;
  document.head.appendChild(style);
}

// Fetch documents
async function fetchDocuments() {
  try {
    const loadingSpinner = document.getElementById("loading-spinner");
    if (loadingSpinner) {
      // Add this check
      loadingSpinner.style.display = "block";
    }

    const response = await fetch("/api/list-doc", {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await removeToken();
        handleAuthRedirect(window.location.pathname);
        return;
      }
      throw new Error("Failed to fetch documents");
    }

    const data = await response.json();
    documents = data.documents || [];

    if (loadingSpinner) {
      // Add this check
      loadingSpinner.style.display = "none";
    }

    renderDocuments();
  } catch (error) {
    console.error("Error fetching documents:", error);
    const loadingSpinner = document.getElementById("loading-spinner");
    if (loadingSpinner) {
      // Add this check
      loadingSpinner.textContent =
        "Failed to load documents. Please try again.";
    }
  }
}

// Render documents with filtering
function renderDocuments() {
  const documentGrid = document.getElementById("document-grid");
  const searchInput = document
    .getElementById("search-input")
    .value.toLowerCase();
  const template = document.getElementById("document-card-template");

  // Clear existing documents
  documentGrid.innerHTML = "";

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter =
      currentFilter === "all" ||
      doc.documentType.toLowerCase() === currentFilter.toLowerCase();

    const matchesSearch =
      !searchInput ||
      doc.documentType.toLowerCase().includes(searchInput) ||
      (doc.personalInfo?.name &&
        doc.personalInfo.name.toLowerCase().includes(searchInput)) ||
      doc.requestId.toLowerCase().includes(searchInput);

    return matchesFilter && matchesSearch;
  });

  // Function to load document preview
  async function loadDocumentPreview(requestId, previewImg) {
    const previewContainer = previewImg.parentElement;

    try {
      const response = await fetch(`/api/document/${requestId}/preview`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await removeToken();
          handleAuthRedirect(window.location.pathname);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const contentType = response.headers.get("content-type");

      if (contentType === "application/pdf") {
        // For PDFs, generate a thumbnail using pdf.js
        const url = URL.createObjectURL(blob);
        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(1);

        // Create a canvas to render the PDF preview
        const canvas = document.createElement("canvas");
        const viewport = page.getViewport({ scale: 0.5 }); // Adjust scale as needed
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport: viewport,
        }).promise;

        // Convert canvas to data URL and set as image source
        previewImg.src = canvas.toDataURL();
        URL.revokeObjectURL(url);
      } else if (contentType.startsWith("image/")) {
        // For images, directly create object URL
        const objectURL = URL.createObjectURL(blob);
        previewImg.src = objectURL;

        // Clean up object URL after image loads
        previewImg.onload = () => {
          URL.revokeObjectURL(objectURL);
        };
      }

      // Add classes for proper sizing and display
      previewImg.classList.add("document-preview-img");

      // Hide spinner when preview is loaded
      previewImg.onload = () => {
        previewContainer.classList.add("preview-loaded");
      };
    } catch (error) {
      console.error("Preview error:", error);
      previewImg.src = "";
      // Show error state in the preview area
      previewContainer.innerHTML = `
        <div class="preview-error">
          <span>Preview not available</span>
        </div>
      `;
    }
  }

  // Render filtered documents
  filteredDocuments.forEach((doc) => {
    const docCard = template.content.cloneNode(true);

    // Set status
    const statusEl = docCard.querySelector(".document-status");
    statusEl.textContent = doc.isVerified ? "Verified" : "Pending";
    statusEl.classList.add(doc.isVerified ? "verified" : "pending");

    // Set document type and title
    const typeEl = docCard.querySelector(".document-type");
    const titleEl = docCard.querySelector(".document-title");
    typeEl.textContent = doc.documentType;
    titleEl.textContent = `${doc.documentType} Document`;

    // Set metadata
    const metaEl = docCard.querySelector(".document-meta");
    metaEl.textContent = `Uploaded: ${new Date(
      doc.submissionDate
    ).toLocaleDateString()}`;

    // Set blockchain info
    const blockchainEl = docCard.querySelector(".blockchain-info");
    blockchainEl.textContent = `Blockchain ID: ${doc.blockchainId || "N/A"}`;

    // Set preview and download buttons
    const previewBtn = docCard.querySelector(".preview-btn");
    const downloadBtn = docCard.querySelector(".download-btn");
    const previewImg = docCard.querySelector(".document-preview img");

    previewBtn.dataset.requestId = doc.requestId;
    downloadBtn.dataset.requestId = doc.requestId;

    previewBtn.addEventListener("click", handlePreview);
    downloadBtn.addEventListener("click", handleDownload);

    // Load document preview
    loadDocumentPreview(doc.requestId, previewImg);

    // Add click event to the entire card (except buttons)
    const card = docCard.querySelector(".document-card"); // Make sure this selector matches your HTML structure
    if (card) {
      card.dataset.requestId = doc.requestId;
      card.style.cursor = "pointer"; // Add pointer cursor to indicate clickability

      card.addEventListener("click", function (event) {
        // Don't navigate if clicking on buttons to prevent interference with their actions
        if (
          !event.target.closest(".preview-btn") &&
          !event.target.closest(".download-btn")
        ) {
          // Navigate to viewdoc page with the request ID
          window.location.href = `./viewdoc.html?id=${this.dataset.requestId}`;
        }
      });
    }

    // Add to grid
    documentGrid.appendChild(docCard);
  });

  // If no documents found
  if (filteredDocuments.length === 0) {
    documentGrid.innerHTML = `
      <div class="text-center p-4">
        No documents found matching your search or filter.
      </div>
    `;
  }
}

// Preview document
async function handlePreview(event) {
  const requestId = event.target.dataset.requestId;
  try {
    const response = await fetch(`/api/document/${requestId}/preview`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await removeToken();
        handleAuthRedirect(window.location.pathname);
        return;
      }
      throw new Error(`Failed to preview document: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Store the current token before opening new tab
    sessionStorage.setItem("preview_token", getToken());

    // Simply open the blob URL in new tab
    window.open(url, "_blank");
  } catch (error) {
    console.error("Preview error:", error);
    alert("Failed to preview document. Please try again.");
  }
}

// Download document
async function handleDownload(event) {
  const requestId = event.target.dataset.requestId;
  try {
    const response = await fetch(`/api/document/${requestId}/download`, {
      method: "GET",
      headers: {
        ...Object.fromEntries(getAuthHeaders()), // Convert Headers to object
        Accept: "application/pdf,image/*",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await removeToken();
        handleAuthRedirect(window.location.pathname);
        return;
      }
      throw new Error(`Failed to download document: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document_${requestId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download error:", error);
    alert("Failed to download document. Please try again.");
  }
}

// Initialize page function
async function initializePage() {
  if (window.isAuthenticating) return;
  window.isAuthenticating = true;

  try {
    console.log("Initializing page - checking authentication");

    // First, check if token exists and is valid
    const token = getToken();

    if (!token) {
      console.log("No token found - redirecting to login");
      handleAuthRedirect(window.location.pathname);
      return;
    }

    // Perform server-side authentication check
    const response = await fetch("/checkAuth", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.log("Token validation failed - redirecting to login");
      await removeToken();
      handleAuthRedirect(window.location.pathname);
      return;
    }

    const data = await response.json();

    if (!data.authenticated) {
      console.log("Not authenticated - redirecting to login");
      await removeToken();
      handleAuthRedirect(window.location.pathname);
      return;
    }

    // If authentication is successful, ensure token is valid
    console.log("Authentication successful - setting up page");
    setupEventListeners();
    await fetchDocuments();
  } catch (error) {
    console.error("Authentication error:", error);
    await removeToken();
    handleAuthRedirect(window.location.pathname);
  } finally {
    window.isAuthenticating = false;
  }
}

// Back navigation
function goBack() {
  window.location = "./profile.html";
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializePage);

// Add event listener for visibility change
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    const token = getToken();
    if (!token) {
      // Try to recover token from session storage
      const previewToken = sessionStorage.getItem("preview_token");
      if (previewToken) {
        setToken(previewToken).then(() => {
          sessionStorage.removeItem("preview_token");
          initializePage();
        });
      }
    }
  }
});

// Export necessary functions
window.goBack = goBack;
window.handlePreview = handlePreview;
window.handleDownload = handleDownload;

export { initializePage };
