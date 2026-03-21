const jwt = require("jsonwebtoken");
const { TOKEN_EXPIRY } = require("./constants");

/**
 * Generate JWT token for user
 * @param {Object} user - User object containing id, email, role
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || "default-secret-key-change-in-production",
    { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN },
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || "default-secret-key-change-in-production",
    );
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
};
