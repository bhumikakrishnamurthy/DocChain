import { getToken, handleAuthRedirect } from "./auth.js";

document.addEventListener("DOMContentLoaded", function () {
  const mainSearchInput = document.querySelector(".search-input");
  const cityInput = document.querySelector('input[placeholder="City"]');
  const propertyIdInput = document.querySelector(
    'input[placeholder="Property ID"]'
  );
  const searchButton = document.querySelector(".search");
  const backButton = document.getElementById("backButton");

  // Authentication check
  async function checkAuth() {
    const token = getToken();
    if (!token) {
      handleAuthRedirect(window.location.pathname);
      return false;
    }
    return true;
  }

  // Handle search functionality
  async function handleSearch(event) {
    if (event) {
      event.preventDefault();
    }

    if (!(await checkAuth())) return;

    const searchParams = new URLSearchParams();

    // Add search parameters if they have values
    if (mainSearchInput?.value.trim()) {
      searchParams.append("mainSearch", mainSearchInput.value.trim());
    }

    if (cityInput?.value.trim()) {
      searchParams.append("city", cityInput.value.trim());
    }

    if (propertyIdInput?.value.trim()) {
      searchParams.append("propertyId", propertyIdInput.value.trim());
    }

    // Check if any search parameters were added
    if (searchParams.toString() === "") {
      alert("Please enter at least one search criterion");
      return;
    }

    try {
      const devToken = localStorage.getItem("trustvault_dev_token");
      const prodToken = localStorage.getItem("trustvault_prod_token");
      const token = devToken || prodToken;
      if (!token) {
        window.location.href = "./login.html";
        return;
      }

      // Store search params in session storage for results page
      sessionStorage.setItem("searchParams", searchParams.toString());

      // Redirect to results page
      window.location.href = "./searchpr.html";
    } catch (error) {
      console.error("Search error:", error);
      alert("An error occurred while searching. Please try again.");
    }
  }

  // Event Listeners
  if (searchButton) {
    searchButton.addEventListener("click", handleSearch);
  }

  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      history.back();
    });
  }

  // Form submission
  const form = document.querySelector(".container");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSearch();
    });
  }

  // Initial auth check
  checkAuth();
});
