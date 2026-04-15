const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Missing or invalid bearer token."
      });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!token || !jwtSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Token validation failed."
      });
    }

    const decodedUser = jwt.verify(token, jwtSecret);
    req.user = decodedUser;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Invalid or expired token."
    });
  }
};

module.exports = authMiddleware;
