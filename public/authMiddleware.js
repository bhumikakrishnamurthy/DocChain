import { getAuthHeaders } from './auth.js';

async function checkGovAccess() {
    try {
        const response = await fetch("/getUserData", {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        const isGovUser = userData.type === "government" || userData.email?.endsWith("@rvce.edu.in");
        const currentPath = window.location.pathname;

        // If government user and not on govdash page, redirect
        if (isGovUser && currentPath !== "/govdash.html") {
            window.location.href = "/govdash.html";
            return false;
        }

        // If on govdash page but not government user, redirect to dashboard
        if (!isGovUser && currentPath === "/govdash.html") {
            window.location.href = "/dashboard.html";
            return false;
        }

        return true;
    } catch (error) {
        console.error("Access check failed:", error);
        return false;
    }
}

// Automatically run the check when script loads
checkGovAccess();

// Also check when navigation occurs (for SPA-like behavior)
window.addEventListener('popstate', checkGovAccess);

// Export for manual usage if needed
export { checkGovAccess };