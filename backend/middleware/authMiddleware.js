const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../config/jwt");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log("AUTH ERROR: Authorization header missing");

      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("AUTH ERROR: Invalid Bearer format");

      return res.status(401).json({
        success: false,
        message: "Invalid authentication format.",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    // ===============================================
    // VERIFY JWT
    // ===============================================

    const decoded = jwt.verify(
      token,
      JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    // ===============================================
    // DEBUG: SHOW DECODED USER ID
    // ===============================================

    console.log("=================================");
    console.log("JWT VERIFIED SUCCESSFULLY");
    console.log("JWT DECODED DATA:", decoded);
    console.log("JWT USER ID:", decoded.id);
    console.log("JWT USER_ID:", decoded.user_id);
    console.log("JWT EMAIL:", decoded.email);
    console.log("=================================");

    // ===============================================
    // SET AUTHENTICATED USER
    // ===============================================

    req.user = {
      id: decoded.id,
      user_id: decoded.user_id || null,
      email: decoded.email || null,
    };

    console.log("Authenticated user ID:", req.user.id);
    console.log("Authenticated user object:", req.user);

    next();

  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }
};

module.exports = authMiddleware;