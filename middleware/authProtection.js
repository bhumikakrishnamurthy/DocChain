async function checkAuthStatus() {
  try {
    const response = await fetch("/checkAuth");
    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = "/login.html";
      return false;
    }

    // Add government user check
    if (data.user) {
      const isGovUser =
        data.user.type === "government" || data.user.email.endsWith("@rvce.edu.in");
      const currentPath = window.location.pathname;

      if (isGovUser && currentPath !== "/govdash.html") {
        window.location.href = "/govdash.html";
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Auth check failed:", error);
    window.location.href = "/login.html";
    return false;
  }
}
