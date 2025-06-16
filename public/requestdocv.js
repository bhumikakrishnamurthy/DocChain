import { isAuthenticated, getToken, getAuthHeaders } from "./auth.js";

// Max sizes
const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
const maxTotalSize = 50 * 1024 * 1024; // 50MB in bytes

// Validate document
const validateDocumentType = (documentType) => {
  const validTypes = [
    "passport",
    "id-card",
    "driving-license",
    "utility-bill",
    "aadhaar",
    "pan-card",
    "voter-id",
    "marriage-cert",
    "birth-cert",
    "sale-deed",
    "purchase-paper",
    "fixed-deposit",
    "will",
    "trust-deed",
    "power-of-attorney",
    "lease-agreement",
    "rent-agreement",
    "partnership-deed",
    "company-registration",
    "gst-certificate",
    "shop-act",
    "trade-license",
    "food-license",
    "fire-license",
    "health-license",
    "labour-license",
    "contract-labour-license",
    "factory-license",
    "pollution-license",
    "excise-license",
    "customs-license",
    "death-cert",
    "divorce-cert",
    "court-order",
    "legal-notice",
    "agreement",
  ];

  if (!documentType || !validTypes.includes(documentType)) {
    throw new Error("Please select a valid document type");
  }
  return documentType;
};

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("personal-info-form");
  const documentForm = document.getElementById("document-info-form");
  const continueButton = document.getElementById("continue-button");
  const sameAddressCheckbox = document.getElementById("same-address");
  const permanentAddress = document.getElementById("permanent-address");
  const currentAddress = document.getElementById("current-address");
  const uploadInput = document.getElementById("upload-document");
  const loadingOverlay = document.getElementById("loading-overlay");
  const emailInput = document.getElementById("email");
  const idNumberInput = document.getElementById("aadhaar-pan");
  const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
  const allowedMimeTypes = ["application/pdf", "image/png", "image/jpeg"];

  // Initialize form with auth check
  const initializeForm = async () => {
    try {
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        console.log("User not authenticated");
        window.location.href = "./login.html";
        return;
      }

      await autoFillUserData();
    } catch (error) {
      console.error("Initialization error:", error);
      window.location.href = "./login.html";
    }
  };

  // ID number validation and formatting
  const handleIdNumberInput = (value) => {
    // Remove any spaces or special characters
    value = value.replace(/[^a-zA-Z0-9]/g, "");

    // Check if the input starts with a letter (PAN format)
    if (/^[a-zA-Z]/.test(value)) {
      value = value.toUpperCase();

      // Enforce PAN format (5 letters + 4 numbers + 1 letter)
      const panParts = value.match(/^([A-Z]{0,5})([0-9]{0,4})([A-Z]?)$/);
      if (panParts) {
        const [, letters, numbers, lastLetter] = panParts;
        value = letters + (numbers || "") + (lastLetter || "");
      }

      // Restrict to 10 characters
      if (value.length > 10) {
        value = value.slice(0, 10);
      }
    } else {
      // Aadhaar format (12 digits)
      value = value.replace(/[^\d]/g, "");
      if (value.length > 12) {
        value = value.slice(0, 12);
      }
    }

    return value;
  };

  // Add event listener for ID number input
  idNumberInput?.addEventListener("input", (e) => {
    e.target.value = handleIdNumberInput(e.target.value);
  });

  // Fetch and autofill user data
  const autoFillUserData = async () => {
    try {
      const response = await fetch("/getUserData", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await response.json();

      // Autofill email and make it read-only
      if (emailInput) {
        emailInput.value = userData.email;
        emailInput.readOnly = true;
        emailInput.classList.add("readonly-field"); // Add the CSS class

        // Optional: Add a title attribute to show it's auto-filled
        emailInput.title = "Auto-filled from your account";
      }

      // If name is available, autofill name fields
      if (userData.name) {
        const names = userData.name.split(" ");
        const firstNameInput = document.getElementById("first-name");
        const lastNameInput = document.getElementById("last-name");

        if (firstNameInput) firstNameInput.value = names[0] || "";
        if (lastNameInput) lastNameInput.value = names.slice(1).join(" ") || "";
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Call initialize function
  await initializeForm();

  // Generate a unique request ID
  const generateRequestId = () => {
    return "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  };

  // Show/hide loading overlay
  const toggleLoading = (isLoading) => {
    const loadingOverlay = document.getElementById("loading-overlay");
    const continueButton = document.getElementById("continue-button");

    if (loadingOverlay) {
      loadingOverlay.classList.toggle("hidden", !isLoading);
    }

    if (continueButton) {
      continueButton.disabled = isLoading;
      continueButton.textContent = isLoading ? "Processing..." : "Continue";
    }
  };

  // Validate file type using both extension and MIME type
  const validateFile = (file) => {
    const fileExtension = "." + file.name.toLowerCase().split(".").pop();

    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error("Please upload a PDF, PNG, or JPG file");
    }

    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error(
        "Invalid file type. Please upload a valid PDF, PNG, or JPG file"
      );
    }

    if (file.size > maxFileSize) {
      throw new Error(
        `File ${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(
          2
        )}MB). Maximum size is 20MB`
      );
    }

    return true;
  };

  // Handle same address checkbox
  sameAddressCheckbox?.addEventListener("change", () => {
    if (sameAddressCheckbox.checked) {
      currentAddress.value = permanentAddress.value;
      currentAddress.disabled = true;
    } else {
      currentAddress.disabled = false;
    }
  });

  // Handle file upload
  uploadInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateFile(file);
      } catch (error) {
        alert(error.message);
        uploadInput.value = "";
      }
    }
  });

  const updateFileUploadUI = async (file, index) => {
    const previewElement = document.getElementById(`file-preview-${index}`);
    const infoElement = document.getElementById(`file-info-${index}`);
    const labelElement = document.getElementById(`upload-label-${index}`);

    // Update file info
    infoElement.querySelector(".filename").textContent = file.name;
    infoElement.querySelector(".filesize").textContent = ` (${formatFileSize(
      file.size
    )})`;
    infoElement.classList.remove("hidden");

    // Update label text
    labelElement.querySelector("span").textContent = "📎 Change File";

    // Handle preview
    if (file.type.startsWith("image/")) {
      // Image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previewElement.innerHTML = `
          <img src="${e.target.result}" alt="Preview" class="file-preview-img" />
        `;
        previewElement.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      // PDF icon
      previewElement.innerHTML = `
        <div class="pdf-preview">
          <svg class="pdf-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5c0 .83-.67 1.5-1.5 1.5H7v2H5.5V9H8c.83 0 1.5.67 1.5 1.5v1zm10 0c0 .83-.67 1.5-1.5 1.5h-2.5V15h-2V9h4.5c.83 0 1.5.67 1.5 1.5v1zm-5 2h-2V9h2v4.5z"/>
          </svg>
          <span>PDF Document</span>
        </div>
      `;
      previewElement.classList.remove("hidden");
    }
  };

  // Function to clear file upload UI
  const clearFileUploadUI = (index) => {
    const previewElement = document.getElementById(`file-preview-${index}`);
    const infoElement = document.getElementById(`file-info-${index}`);
    const labelElement = document.getElementById(`upload-label-${index}`);
    const inputElement = document.getElementById(
      `upload-document${index === 1 ? "" : "-" + index}`
    );

    previewElement.innerHTML = "";
    previewElement.classList.add("hidden");
    infoElement.classList.add("hidden");
    labelElement.querySelector(
      "span"
    ).textContent = `📎 Upload Document ${index}`;
    inputElement.value = "";
  };

  // File upload event handlers
  const setupFileUpload = (index) => {
    const inputId = `upload-document${index === 1 ? "" : "-" + index}`;
    const uploadInput = document.getElementById(inputId);

    uploadInput?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      const errorElement = document.getElementById("upload-error");

      if (file) {
        try {
          validateFile(file);
          errorElement.classList.add("hidden");
          await updateFileUploadUI(file, index);
        } catch (error) {
          errorElement.textContent = error.message;
          errorElement.classList.remove("hidden");
          clearFileUploadUI(index);
        }
      }
    });
  };

  // Set up file upload handlers
  setupFileUpload(1);
  setupFileUpload(2);

  // Form validation
  const validateForm = () => {
    // Get form field values
    const firstName = document.getElementById("first-name")?.value?.trim();
    const lastName = document.getElementById("last-name")?.value?.trim();
    const email = emailInput?.value?.trim();
    const phone = document.getElementById("phone-number")?.value?.trim();
    const idNumber = idNumberInput?.value?.trim();
    const pAddress = permanentAddress?.value?.trim();
    const cAddress = currentAddress?.value?.trim();
    const documentType = document.getElementById("document-type")?.value;
    const uploadedFile1 = document.getElementById("upload-document")?.files[0];
    const uploadedFile2 =
      document.getElementById("upload-document-2")?.files[0];
    validateDocumentType(documentType);

    // Validate required fields
    if (!firstName) throw new Error("First name is required");
    if (!lastName) throw new Error("Last name is required");
    if (!email) throw new Error("Email is required");
    if (!phone) throw new Error("Phone number is required");
    if (!idNumber) throw new Error("ID number is required");
    if (!pAddress) throw new Error("Permanent address is required");
    if (!cAddress) throw new Error("Current address is required");
    if (!documentType) throw new Error("Document type is required");
    if (!uploadedFile1) throw new Error("At least one document is required");

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error("Please enter a valid 10-digit phone number");
    }

    // Validate ID number
    const isPAN = /^[A-Z]/.test(idNumber);
    if (isPAN) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (!panRegex.test(idNumber)) {
        throw new Error("Please enter a valid PAN number (format: ABCDE1234F)");
      }
    } else {
      const aadhaarRegex = /^\d{12}$/;
      if (!aadhaarRegex.test(idNumber)) {
        throw new Error("Please enter a valid 12-digit Aadhaar number");
      }
    }

    // Return validated form data
    return {
      firstName,
      lastName,
      email,
      phone,
      idNumber,
      permanentAddress: pAddress,
      currentAddress: cAddress,
      documentType: documentType, // Use original document type value
      files: [uploadedFile1, uploadedFile2].filter(Boolean),
    };
  };

  // Form submission handler
  continueButton?.addEventListener("click", async (e) => {
    e.preventDefault();

    const errorElement = document.getElementById("upload-error");
    if (errorElement) errorElement.classList.add("hidden"); // Reset error message

    try {
      // Show loading state
      toggleLoading(true);

      // Validate form and get form data
      const formFields = validateForm();

      const formData = new FormData();

      // Generate request ID
      const requestId = generateRequestId();
      formData.append("requestId", requestId);

      // Create and append personal info
      const personalInfo = {
        firstName: formFields.firstName,
        lastName: formFields.lastName,
        email: formFields.email,
        phone: formFields.phone,
        idNumber: formFields.idNumber,
        permanentAddress: formFields.permanentAddress,
        currentAddress: formFields.currentAddress,
        documentType: formFields.documentType,
      };

      console.log("Document Type being sent:", formFields.documentType);
      formData.append("personalInfo", JSON.stringify(personalInfo));

      // Append files with correct field names
      if (formFields.files[0]) {
        formData.append("document1", formFields.files[0]);
        console.log("Appending document1:", formFields.files[0].name);
      }
      if (formFields.files[1]) {
        formData.append("document2", formFields.files[1]);
        console.log("Appending document2:", formFields.files[1].name);
      }

      // Debug FormData contents
      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(
          pair[0] + ": " + (pair[1] instanceof File ? pair[1].name : pair[1])
        );
      }

      // Get auth headers
      const headers = {
        Authorization: `Bearer ${getToken()}`,
        "X-Device-ID": localStorage.getItem("deviceId") || "",
        "X-Environment": "prod",
      };

      console.log("Submitting verification request...");
      const response = await fetch("/api/request-verification", {
        method: "POST",
        headers: headers,
        body: formData,
      });

      const result = await response.json();
      console.log("Server response:", result);

      if (!response.ok) {
        throw new Error(
          result.message || `Submission failed (Status: ${response.status})`
        );
      }

      // Store the verification request ID
      localStorage.setItem("verificationRequestId", result.requestId);
      localStorage.setItem("documentType", formFields.documentType);

      console.log("Request successful, redirecting...");
      window.location.href = "./docregister.html";
    } catch (error) {
      console.error("Submission error:", error);
      if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.classList.remove("hidden");
      } else {
        alert(error.message);
      }
    } finally {
      toggleLoading(false);
    }
  });

  // Back button functionality
  document.getElementById("backButton")?.addEventListener("click", () => {
    history.back();
  });

  // Add event listener for visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      isAuthenticated().then((auth) => {
        if (!auth) {
          window.location.href = "./login.html";
        }
      });
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const documentTypeSelect = document.getElementById("document-type");
  const documentNumberInput = document.getElementById("document-number");

  // Validity of document
  const documentValidityPeriods = {
    // Lifetime validity
    "birth-cert": "Lifetime",
    "death-cert": "Lifetime",
    "marriage-cert": "Lifetime",
    "divorce-cert": "Lifetime",

    // 1 year validity
    "rent-agreement": "1 Year",
    "lease-agreement": "1 Year",

    // 10 years validity (and other documents not specified)
    passport: "10 Years",
    "id-card": "10 Years",
    "driving-license": "10 Years",
    "utility-bill": "10 Years",
    aadhaar: "10 Years",
    "pan-card": "10 Years",
    "voter-id": "10 Years",
    "sale-deed": "10 Years",
    "purchase-paper": "10 Years",
    "fixed-deposit": "10 Years",
    will: "10 Years",
    "trust-deed": "10 Years",
    "power-of-attorney": "10 Years",
    "partnership-deed": "10 Years",
    "company-registration": "10 Years",
    "gst-certificate": "10 Years",
    "shop-act": "10 Years",
    "trade-license": "10 Years",
    "food-license": "10 Years",
    "fire-license": "10 Years",
    "health-license": "10 Years",
    "labour-license": "10 Years",
    "contract-labour-license": "10 Years",
    "factory-license": "10 Years",
    "pollution-license": "10 Years",
    "excise-license": "10 Years",
    "customs-license": "10 Years",
    "court-order": "10 Years",
    "legal-notice": "10 Years",
    agreement: "10 Years",
  };

  // Map of document types to their corresponding ID names
  const documentIdLabels = {
    // These should show "ID Number"
    passport: "Passport Number",
    "id-card": "ID Card Number",
    "driving-license": "License Number",
    aadhaar: "Aadhaar Number",
    "pan-card": "PAN Number",
    "voter-id": "Voter ID Number",

    // All others should show "Reference Number / ID Number"
    "utility-bill": "Reference Number / ID Number",
    "marriage-cert": "Reference Number / ID Number",
    "birth-cert": "Reference Number / ID Number",
    "sale-deed": "Reference Number / ID Number",
    "purchase-paper": "Reference Number / ID Number",
    "fixed-deposit": "Reference Number / ID Number",
    will: "Reference Number / ID Number",
    "trust-deed": "Reference Number / ID Number",
    "power-of-attorney": "Reference Number / ID Number",
    "lease-agreement": "Reference Number / ID Number",
    "rent-agreement": "Reference Number / ID Number",
    "partnership-deed": "Reference Number / ID Number",
    "company-registration": "Reference Number / ID Number",
    "gst-certificate": "Reference Number / ID Number",
    "shop-act": "Reference Number / ID Number",
    "trade-license": "Reference Number / ID Number",
    "food-license": "Reference Number / ID Number",
    "fire-license": "Reference Number / ID Number",
    "health-license": "Reference Number / ID Number",
    "labour-license": "Reference Number / ID Number",
    "contract-labour-license": "Reference Number / ID Number",
    "factory-license": "Reference Number / ID Number",
    "pollution-license": "Reference Number / ID Number",
    "excise-license": "Reference Number / ID Number",
    "customs-license": "Reference Number / ID Number",
    "death-cert": "Reference Number / ID Number",
    "divorce-cert": "Reference Number / ID Number",
    "court-order": "Reference Number / ID Number",
    "legal-notice": "Reference Number / ID Number",
    agreement: "Reference Number / ID Number",
  };

  // Update placeholder when document type changes
  documentTypeSelect.addEventListener("change", function () {
    const selectedType = this.value;
    try {
      validateDocumentType(selectedType);

      // Update ID label placeholder
      const newPlaceholder = documentIdLabels[selectedType] || "Document ID";
      documentNumberInput.placeholder = newPlaceholder;

      // Display validity period if available
      const validityPeriod =
        documentValidityPeriods[selectedType] || "10 Years";
      const validityInfoElement = document.getElementById("validity-info");

      if (validityInfoElement) {
        validityInfoElement.textContent = `Validity: ${validityPeriod}`;
        validityInfoElement.classList.remove("hidden");
      } else {
        // Create validity info element if it doesn't exist
        const validityDiv = document.createElement("div");
        validityDiv.id = "validity-info";
        validityDiv.className = "text-sm text-gray-600 mt-1";
        validityDiv.textContent = `Validity: ${validityPeriod}`;
        this.parentNode.appendChild(validityDiv);
      }

      console.log("Valid document type selected:", selectedType);
    } catch (error) {
      console.error("Invalid document type:", error);
      this.value = ""; // Reset to default if invalid
    }

    // Clear the input when document type changes
    documentNumberInput.value = "";

    // Specific validation for each document type (keeping your existing validation)
    switch (selectedType) {
      case "passport":
        documentNumberInput.setAttribute("maxlength", "8");
        documentNumberInput.pattern = "^[A-Z][0-9]{7}$";
        break;
      case "id-card":
        documentNumberInput.setAttribute("maxlength", "12");
        documentNumberInput.pattern = "^[0-9]{12}$";
        break;
      case "driving-license":
        documentNumberInput.setAttribute("maxlength", "15");
        documentNumberInput.pattern = "^[A-Z0-9]{15}$";
        break;
      case "utility-bill":
        documentNumberInput.setAttribute("maxlength", "20");
        documentNumberInput.pattern = "^[A-Z0-9-]{1,20}$";
        break;
      case "aadhaar":
        documentNumberInput.setAttribute("maxlength", "12");
        documentNumberInput.pattern = "^[0-9]{12}$";
        break;
      case "pan-card":
        documentNumberInput.setAttribute("maxlength", "10");
        documentNumberInput.pattern = "^[A-Z]{5}[0-9]{4}[A-Z]$";
        break;
      case "voter-id":
        documentNumberInput.setAttribute("maxlength", "10");
        documentNumberInput.pattern = "^[A-Z]{3}[0-9]{7}$";
        break;
      default:
        documentNumberInput.removeAttribute("maxlength");
        documentNumberInput.removeAttribute("pattern");
    }
  });
});
