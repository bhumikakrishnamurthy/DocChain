import { isAuthenticated, getAuthHeaders } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Get DOM elements
  const searchInput = document.getElementById("searchInput");
  const verifyButton = document.getElementById("verifyButton");
  const errorMessage = document.getElementById("errorMessage");
  const resultContainer = document.getElementById("resultContainer");
  const backButton = document.getElementById("backButton");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const verifyInfo = document.querySelector(".verify-info"); // Get the instruction text container

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

  // Validation function for signature ID
  const isValidSignatureId = (id) => {
    // Format is SIG-XXXXXXXX (where X is a hex digit)
    const signatureRegex = /^SIG-[A-F0-9]{8}$/;
    return signatureRegex.test(id);
  };

  const toggleLoading = (show) => {
    if (loadingSpinner) {
      loadingSpinner.style.display = show ? "block" : "none";
    }
    if (verifyButton) {
      verifyButton.disabled = show;
    }
  };

  const createVerifiedSignature = (data) => {
    const verificationDate = new Date(data.createdAt).toLocaleString();
    const fullHash = data.documentHash || "Not available";

    return `
      <div class="property-card">
        <div class="property-header">
          <h2>Signature Status</h2>
          <div class="status ${data.verified ? "verified" : "pending"}">
            ${data.verified ? "Verified ✅" : "Not Verified ⌛"}
          </div>
        </div>
        <div class="property-id">Signature ID: ${data.signatureId}</div>
        <div class="property-details">
          <div class="detail-row">
            <span class="detail-label">Document Name:</span>
            <span class="detail-value">${
              data.documentName || "Not Available"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">${
              data.verified ? "Verified" : "Pending"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created By:</span>
            <span class="detail-value">${
              data.createdBy || "Not Available"
            }</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Creation Date:</span>
            <span class="detail-value">${verificationDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Document Hash:</span>
            <span class="detail-value">${fullHash}</span>
          </div>
        </div>
      </div>
    `;
  };

  const validateInput = (value) => {
    if (!isValidSignatureId(value)) {
      throw new Error(
        "Please enter a valid signature ID (format: SIG-XXXXXXXX)"
      );
    }
  };

  const handleVerification = async () => {
    const value = searchInput.value.trim();

    try {
      validateInput(value);

      if (!(await isAuthenticated())) {
        window.location.href = "./login.html";
        return;
      }

      errorMessage.style.display = "none";
      toggleLoading(true);

      // Hide the instruction text during verification
      if (verifyInfo) {
        verifyInfo.style.display = "none";
      }

      // Use the signature verification endpoint
      const endpoint = `/api/signature/verify/${value}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Signature not found in verification records"
            : "Failed to verify signature"
        );
      }

      const data = await response.json();
      console.log("Verification response:", data);

      if (data.success && data.data) {
        resultContainer.innerHTML = createVerifiedSignature(data.data);
        // Keep the instruction text hidden after successful verification
        if (verifyInfo) {
          verifyInfo.style.display = "none";
        }
      } else {
        resultContainer.innerHTML = `
          <div class="property-card">
            <div class="property-header">
              <h2>Signature Status</h2>
              <div class="status error">
                Not Found ❌
              </div>
            </div>
            <div class="property-id">Signature ID: ${value}</div>
            <div class="property-details">
              <div class="error-details">
                No verification record found for this signature ID
              </div>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("Verification error:", error);
      errorMessage.textContent =
        error.message || "Failed to verify signature. Please try again.";
      errorMessage.style.display = "block";
      resultContainer.innerHTML = "";

      // Show the instruction text again if there's an error
      if (verifyInfo) {
        verifyInfo.style.display = "block";
      }
    } finally {
      toggleLoading(false);
    }
  };

  // Reset the form and show instructions
  const resetForm = () => {
    searchInput.value = "";
    resultContainer.innerHTML = "";
    verifyButton.disabled = true;
    errorMessage.style.display = "none";
    if (verifyInfo) {
      verifyInfo.style.display = "block";
    }
  };

  // Event Listeners
  searchInput?.addEventListener("input", (e) => {
    const value = e.target.value;
    errorMessage.style.display = "none";
    verifyButton.disabled = !value;

    // If the user clears the input, reset the form
    if (!value) {
      resetForm();
    }

    // Optional: Give visual feedback on valid format
    if (value && !isValidSignatureId(value)) {
      errorMessage.textContent =
        "Please enter a valid signature ID (format: SIG-XXXXXXXX)";
      errorMessage.style.display = "block";
    }
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

    // Show the instruction text again if there's an error
    if (verifyInfo) {
      verifyInfo.style.display = "block";
    }
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
