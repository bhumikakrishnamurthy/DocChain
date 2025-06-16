const crypto = require("crypto");

function generateCSRFToken() {
  return crypto.randomBytes(32).toString("hex");
}

function csrfProtection(req, res, next) {
  if (req.method === "GET") {
    const csrfToken = generateCSRFToken();
    req.session.csrfToken = csrfToken;
    res.locals.csrfToken = csrfToken;
    next();
  } else {
    const requestToken = req.body._csrf || req.headers["x-csrf-token"];
    const sessionToken = req.session.csrfToken;

    if (!requestToken || !sessionToken || requestToken !== sessionToken) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
    next();
  }
}

module.exports = { csrfProtection };
