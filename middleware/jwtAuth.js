const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "24h";

const generateToken = async (userId) => {
  const signAsync = promisify(jwt.sign);
  return await signAsync({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const verifyToken = async (token) => {
  const verifyAsync = promisify(jwt.verify);
  try {
    return await verifyAsync(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const jwtAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = { generateToken, verifyToken, jwtAuth };
