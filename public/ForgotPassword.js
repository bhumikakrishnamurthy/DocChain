// ForgotPassword.js
import { auth } from "../firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const form = document.querySelector(".forgot-password-form");
const emailInput = form.querySelector('input[type="email"]');
const otpInput = form.querySelector('input[type="text"]');
const otpButton = document.getElementById("sendOtpBtn");
const continueButton = form.querySelector('button[type="submit"]');

// Create error display element
const errorBox = document.createElement("div");
errorBox.className = "error-box";
errorBox.style.display = "none";
form.insertBefore(errorBox, form.firstChild);

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";

  setTimeout(() => {
    errorBox.style.display = "none";
  }, 5000);
}

// Handle OTP button click
otpButton.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value;

  if (!email) {
    showError("Please enter your email address");
    return;
  }

  try {
    // Send password reset email
    await sendPasswordResetEmail(auth, email);

    // Update button state
    otpButton.textContent = "Reset Link Sent ✅";
    otpButton.classList.add("sent");

    // Show success message
    showError("Password reset link has been sent to your email");

    // Since we're using email link instead of OTP, disable the OTP input
    otpInput.disabled = true;
    continueButton.disabled = true;

    // Redirect to login page after 3 seconds
    setTimeout(() => {
      window.location.href = "./Login.html";
    }, 3000);
  } catch (error) {
    console.error("Password reset error:", error);
    showError(getErrorMessage(error.code));
  }
});

// Handle form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  // Since we're using email link reset, prevent form submission
  showError("Please check your email for the reset link");
});

function getErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/user-not-found":
      return "No account found with this email";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    default:
      return "An error occurred. Please try again";
  }
}
