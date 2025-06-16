import { isAuthenticated, getAuthHeaders } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Get DOM elements
  const searchInput = document.getElementById("searchInput");
  const verifyButton = document.getElementById("verifyButton");
  const errorMessage = document.getElementById("errorMessage");
  const resultContainer = document.getElementById("resultContainer");
  const backButton = document.getElementById("backButton");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const switchTrack = document.querySelector(".switch-track");
  const leftOption = switchTrack.querySelector(".left");
  const rightOption = switchTrack.querySelector(".right");

  // Switch functionality
  function updateSwitch(type) {
    switchTrack.setAttribute("data-active", type);
    if (type === "blockchain") {
      leftOption.classList.add("active");
      rightOption.classList.remove("active");
      searchInput.placeholder = "Enter Blockchain ID";
    } else {
      leftOption.classList.remove("active");
      rightOption.classList.add("active");
      searchInput.placeholder = "Enter IPFS Hash";
    }
  }

  // Initialize switch
  updateSwitch("blockchain");

  // Initialize with auth check
  const initializePage = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        window.location.href = "./login.html";
        return;
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      window.location.href = "./login.html";
    }
  };

  await initializePage();

  // Continuous auth check on visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      isAuthenticated().then((auth) => {
        if (!auth) {
          window.location.href = "./login.html";
        }
      });
    }
  });

  // Validation functions
  const isValidEthereumAddress = (address) => {
    const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethereumRegex.test(address);
  };

  const isValidIpfsHash = (hash) => {
    const ipfsRegex =
      /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[1-9A-HJ-NP-Za-km-z]{57})$/;
    return ipfsRegex.test(hash);
  };

  const toggleLoading = (show) => {
    if (loadingSpinner) {
      loadingSpinner.style.display = show ? "block" : "none";
    }
    if (verifyButton) {
      verifyButton.disabled = show;
    }
  };

  const createVerifiedProperty = (data) => {
    return `
      <div class="property-details">
        <div class="status-badge ${
          data.isVerified ? "status-verified" : "status-pending"
        }">
          ${data.isVerified ? "Verified ✅" : "Not Verified ⌛"}
        </div>
      </div>
      <div class="property-card">
        <div class="property-title">Document Status</div>
        <div class="blockchain-id">Blockchain ID: ${
          data.currentBlockchainId
        }</div>
        <div class="details">
          <div class="detail-row">
            <span class="label">Document Type:</span>
            <span class="value">${data.documentType || "Not Available"}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">${
              data.isVerified ? "Verified" : "Pending"
            }</span>
          </div>
          <div class="detail-row">
            <span class="label">Owner:</span>
            <span class="value">${data.owner || "Not Available"}</span>
          </div>
          ${
            data.verifiedAt
              ? `
            <div class="detail-row">
              <span class="label">Verification Date:</span>
              <span class="value">${new Date(
                data.verifiedAt
              ).toLocaleString()}</span>
            </div>
          `
              : ""
          }
          ${
            data.verifiedBy
              ? `
            <div class="detail-row">
              <span class="label">Verified By:</span>
              <span class="value">${data.verifiedBy}</span>
            </div>
          `
              : ""
          }
          ${
            data.ipfsHash
              ? `
            <div class="detail-row">
              <span class="label">IPFS Hash:</span>
              <span class="value">${data.ipfsHash}</span>
            </div>
          `
              : ""
          }
          ${
            data.transactions && data.transactions.length > 0
              ? `
            <div class="detail-row">
              <span class="label">Transaction Date:</span>
              <span class="value">${new Date(
                data.transactions[data.transactions.length - 1].timestamp
              ).toLocaleString()}</span>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  };

  const validateInput = (value, type) => {
    if (type === "blockchainId") {
      if (!isValidEthereumAddress(value)) {
        throw new Error("Please enter a valid blockchain ID");
      }
    } else if (type === "ipfsHash") {
      if (!isValidIpfsHash(value)) {
        throw new Error("Please enter a valid IPFS hash");
      }
    }
  };

  const handleVerification = async () => {
    const value = searchInput.value.trim();
    const currentType = switchTrack.getAttribute("data-active");
    const searchType =
      currentType === "blockchain" ? "blockchainId" : "ipfsHash";

    try {
      validateInput(value, searchType);

      if (!(await isAuthenticated())) {
        window.location.href = "./login.html";
        return;
      }

      errorMessage.style.display = "none";
      toggleLoading(true);

      const endpoint =
        searchType === "blockchainId"
          ? `/api/document/search-by-blockchain-id/${value}`
          : `/api/document/search-by-ipfs-hash/${value}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Document not found in verification records"
            : "Failed to verify document"
        );
      }

      const data = await response.json();
      console.log("Verification response:", data);

      if (data.success && data.data) {
        resultContainer.innerHTML = createVerifiedProperty(data.data);
      } else {
        resultContainer.innerHTML = `
          <div class="property-details">
            <div class="status-badge status-error">
              Document Not Found ❌
            </div>
          </div>
          <div class="property-card">
            <div class="blockchain-id">${
              searchType === "blockchainId" ? "Blockchain ID" : "IPFS Hash"
            }: ${value}</div>
            <div class="error-details">
              No verification record found for this ${
                searchType === "blockchainId" ? "blockchain ID" : "IPFS hash"
              }
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("Verification error:", error);
      errorMessage.textContent =
        error.message || "Failed to verify document. Please try again.";
      errorMessage.style.display = "block";
      resultContainer.innerHTML = "";
    } finally {
      toggleLoading(false);
    }
  };

  // Event Listeners
  searchInput?.addEventListener("input", (e) => {
    const value = e.target.value;
    errorMessage.style.display = "none";
    verifyButton.disabled = !value;
  });

  switchTrack?.addEventListener("click", () => {
    const currentType = switchTrack.getAttribute("data-active");
    const newType = currentType === "blockchain" ? "ipfs" : "blockchain";
    updateSwitch(newType);

    // Clear input and error when switching
    searchInput.value = "";
    errorMessage.style.display = "none";
    resultContainer.innerHTML = "";
    verifyButton.disabled = true;
  });

  verifyButton?.addEventListener("click", handleVerification);

  backButton?.addEventListener("click", () => {
    history.back();
  });

  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !verifyButton.disabled) {
      handleVerification();
    }
  });

  // Error handling
  const handleError = (error, customMessage = "An error occurred") => {
    console.error(error);
    errorMessage.textContent = customMessage;
    errorMessage.style.display = "block";
    toggleLoading(false);
  };

  window.addEventListener("unhandledrejection", (event) => {
    handleError(
      event.reason,
      "An unexpected error occurred. Please try again."
    );
  });

  window.addEventListener("offline", () => {
    handleError(
      new Error("Network offline"),
      "Please check your internet connection."
    );
  });
});
