import { auth } from "../firebase.js";
import {
  isAuthenticated,
  setToken,
  getToken,
  logout as removeToken,
  getAuthHeaders,
} from "./auth.js";

// Define handleCardClick in the global scope
window.handleCardClick = function (service) {
  switch (service) {
    case "land-registry":
      window.location.href = "landregservice.html";
      break;
    case "document-verification":
      window.location.href = "documentverservice.html";
      break;
    default:
      console.error("Unknown service:", service);
  }
};

async function checkAuth() {
  try {
    const token = getToken();
    if (!token) {
      window.location.href = "./Login.html";
      return false;
    }

    const response = await fetch("/checkAuth", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!data.authenticated) {
      removeToken();
      window.location.href = "./Login.html";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Auth check failed:", error);
    removeToken();
    window.location.href = "./Login.html";
    return false;
  }
}

async function getUserName() {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("No token available");
    }

    const response = await fetch("/getUserData", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return "User";
  }
}

// Function to get greeting based on time
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17) return "Good Evening";
  return "Good Morning";
}

// Initialize greeting immediately with a placeholder
function initializeGreeting() {
  const greetingElement = document.querySelector("h1");
  if (greetingElement) {
    greetingElement.textContent = `${getTimeBasedGreeting()}`;
  }
}

// Update greeting once user data is fetched
async function updateGreeting() {
  try {
    const userName = await getUserName();
    const greetingElement = document.querySelector("h1");
    if (greetingElement) {
      greetingElement.textContent = `${getTimeBasedGreeting()}, ${userName}`;
    }
  } catch (error) {
    console.error("Error updating greeting:", error);
  }
}

async function initializeDashboard() {
  if (window.isAuthenticating) return;
  window.isAuthenticating = true;

  try {
    // Set initial greeting immediately
    initializeGreeting();

    // Check authentication
    const isAuthed = await checkAuth();
    if (isAuthed) {
      // Update with actual user name
      await updateGreeting();
    }
  } finally {
    window.isAuthenticating = false;
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeDashboard);

// Add event listener for visibility change
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkAuth();
  }
});

export { checkAuth };
