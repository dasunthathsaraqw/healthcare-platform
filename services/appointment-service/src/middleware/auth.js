// services/appointment-service/src/middleware/auth.js

const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "123";
    
    // ✅ Allow internal service calls with INTERNAL_SECRET
    const internalSecret = process.env.INTERNAL_SECRET;
    if (internalSecret && token === internalSecret) {
      req.user = { id: "system", role: "admin", name: "Internal Service" };
      return next();
    }

    // Regular JWT verification
    try {
      const decoded = jwt.verify(token, secret);
      req.user = {
        id: decoded.userId || decoded.id || decoded._id,
        userId: decoded.userId || decoded.id || decoded._id,
        role: decoded.role || "patient",
        email: decoded.email || "",
        name: decoded.name || "",
      };
      next();
    } catch (err) {
      console.warn("❌ Auth failed:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

module.exports = { authenticate };