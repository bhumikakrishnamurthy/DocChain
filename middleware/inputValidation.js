const { body, validationResult } = require("express-validator");
const xss = require("xss");

const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return xss(input.trim());
  }
  return input;
};

const validateRegistrationInput = [
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    ),
  body("name").trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const sanitizeBody = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      req.body[key] = sanitizeInput(req.body[key]);
    });
  }
  next();
};

module.exports = { validateRegistrationInput, sanitizeBody };
