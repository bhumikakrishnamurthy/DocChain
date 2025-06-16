import {
  getToken,
  handleAuthRedirect,
  getDeviceId,
  getAuthHeaders,
} from "./auth.js";

document.addEventListener("DOMContentLoaded", function () {
  const resultsContainer = document.querySelector(".results");
  const searchInput = document.querySelector(".search-input");
  const backButton = document.getElementById("backButton");
  const propertyDetailsOverlay = document.createElement("div");
  propertyDetailsOverlay.className = "property-details-overlay";
  document.body.appendChild(propertyDetailsOverlay);

  // Handle back button
  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      history.back();
    });
  }

  // Handle new search
  if (searchInput) {
    searchInput.addEventListener("keypress", async function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const searchParams = new URLSearchParams();
        searchParams.append("mainSearch", searchInput.value.trim());
        await loadSearchResults(searchParams.toString());
      }
    });
  }

  async function loadSearchResults(overrideParams = null) {
    if (!resultsContainer) return;

    try {
      showLoadingState();

      const token = getToken();
      console.log("Token retrieved:", token ? "Yes" : "No");

      if (!token) {
        console.log("No token found, redirecting to login");
        handleAuthRedirect(window.location.pathname);
        return;
      }

      const searchParams =
        overrideParams || sessionStorage.getItem("searchParams");
      console.log("Search params:", searchParams);

      if (!searchParams) {
        showNoResults("No search criteria provided");
        return;
      }

      const headers = getAuthHeaders();

      // Debug logs
      console.log("Authorization header:", headers.get("Authorization"));
      console.log("All headers:");
      headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
      });

      const searchUrl = `/api/property/search?${searchParams}`;
      console.log("Making request to:", searchUrl);

      const response = await fetch(searchUrl, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });

      console.log("Search response status:", response.status);

      if (!response.ok) {
        if (response.status === 401) {
          const errorText = await response.text();
          console.log("Error response body:", errorText);
          await new Promise((resolve) => setTimeout(resolve, 100000)); // 100 second delay
          handleAuthRedirect(window.location.pathname);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();
      console.log("Search results count:", response.properties?.length || 0);

      if (!response.properties || response.properties.length === 0) {
        showNoResults("No properties found matching your criteria");
        return;
      }

      displayResults(response.properties);

      if (searchInput && searchParams) {
        const params = new URLSearchParams(searchParams);
        if (params.get("mainSearch")) {
          searchInput.value = params.get("mainSearch");
        }
      }
    } catch (error) {
      console.error("Error loading search results:", error);
      if (
        error.message?.toLowerCase().includes("token") ||
        error.message?.toLowerCase().includes("unauthorized")
      ) {
        handleAuthRedirect(window.location.pathname);
        return;
      }
      showError("Failed to load search results. Please try again.");
    }
  }

  function displayResults(properties) {
    if (!resultsContainer) return;

    const resultsHTML = properties
      .map(
        (property) => `
            <div class="card" data-pid="${property.pid}">
                <div class="card-content">
                    <img src="./assets/defaultlandimage.png" alt="${escapeHtml(
                      property.property_name || "Property"
                    )}">
                    <h3>${escapeHtml(
                      property.property_name || "Unnamed Property"
                    )}</h3>
                    <p>${escapeHtml(
                      property.type_of_property || "Property Type N/A"
                    )}<br>
                    ${escapeHtml(property.city || "Location N/A")}${
          property.pin_code ? ", " + escapeHtml(property.pin_code) : ""
        }</p>
                </div>
            </div>
        `
      )
      .join("");

    resultsContainer.innerHTML = resultsHTML;

    // Add click handlers to all cards
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", async (e) => {
        e.preventDefault();
        const pid = card.dataset.pid;
        if (pid) {
          await showPropertyDetails(pid);
        }
      });
    });
  }

  async function showPropertyDetails(pid) {
    if (!pid) {
      console.error("No property ID provided");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        handleAuthRedirect(window.location.pathname);
        return;
      }

      // Log the URL being called
      const requestUrl = `/api/property/${pid}`;
      console.log("Making request to:", requestUrl);

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for debugging
          handleAuthRedirect(window.location.pathname);
          return;
        }
        if (response.status === 404) {
          showError("Property not found");
          return;
        }
        throw new Error("Failed to fetch property details");
      }

      const property = await response.json();

      propertyDetailsOverlay.innerHTML = `
            <div class="property-details-content">
                <div class="details-header">
                    <button class="close-details">&times;</button>
                    <h2>${escapeHtml(
                      property.property_name || "Property Details"
                    )}</h2>
                </div>
                <div class="details-body">
                    <div class="details-section">
                        <h3>Basic Information</h3>
                        <p><strong>Property ID:</strong> ${escapeHtml(
                          property.pid || "N/A"
                        )}</p>
                        <p><strong>Type:</strong> ${escapeHtml(
                          property.type_of_property || "N/A"
                        )}</p>
                        <p><strong>Classification:</strong> ${escapeHtml(
                          property.property_classification || "N/A"
                        )}</p>
                        <p><strong>Land Area:</strong> ${escapeHtml(
                          property.land_area || "N/A"
                        )}</p>
                        <p><strong>Built Up Area:</strong> ${escapeHtml(
                          property.built_up_area || "N/A"
                        )}</p>
                    </div>
                    <div class="details-section">
                        <h3>Location Details</h3>
                        <p><strong>City:</strong> ${escapeHtml(
                          property.city || "N/A"
                        )}</p>
                        <p><strong>PIN Code:</strong> ${escapeHtml(
                          property.pin_code || "N/A"
                        )}</p>
                    </div>
                    <div class="details-section">
                        <h3>Property Information</h3>
                        <p><strong>Developer:</strong> ${escapeHtml(
                          property.developer || "N/A"
                        )}</p>
                        <p><strong>Project Name:</strong> ${escapeHtml(
                          property.property_name || "N/A"
                        )}</p>
                    </div>
                </div>
            </div>
        `;

      propertyDetailsOverlay.classList.add("active");

      // Add close button handler
      const closeButton =
        propertyDetailsOverlay.querySelector(".close-details");
      if (closeButton) {
        closeButton.addEventListener("click", (e) => {
          e.stopPropagation();
          propertyDetailsOverlay.classList.remove("active");
        });
      }

      // Close on clicking outside the content
      propertyDetailsOverlay.addEventListener("click", (e) => {
        if (e.target === propertyDetailsOverlay) {
          propertyDetailsOverlay.classList.remove("active");
        }
      });

      // Add escape key handler
      const escKeyHandler = (e) => {
        if (e.key === "Escape") {
          propertyDetailsOverlay.classList.remove("active");
          document.removeEventListener("keydown", escKeyHandler);
        }
      };
      document.addEventListener("keydown", escKeyHandler);
    } catch (error) {
      console.error("Error fetching property details:", error);
      if (
        error.message.includes("token") ||
        error.message.includes("unauthorized")
      ) {
        handleAuthRedirect(window.location.pathname);
        return;
      }
      showError("Failed to load property details. Please try again.");
    }
  }

  function showLoadingState() {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Searching properties...</p>
            </div>
        `;
  }

  function showNoResults(message) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
            <div class="no-results">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
  }

  function showError(message) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `
            <div class="error-message">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize by loading results when the page loads
  loadSearchResults();
});
