
const jwt = require("jsonwebtoken");

function protect(req, res, next) {
  try {
    // 1. Read the Authorization header.
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader); // Debugging line

    // 2. Check whether a Bearer token was supplied.
    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // 3. Extract the token after "Bearer ".
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // 4. Verify the token's signature and expiration.
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 5. Attach the authenticated user's ID to the request.
    req.user = {
      id: decoded.userId,
    };

    // 6. Allow Express to continue to the next handler.
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

module.exports = protect;
