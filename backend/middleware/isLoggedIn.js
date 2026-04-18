import jwt from "jsonwebtoken";

export const isLoggedIn = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication failed: Token not provided. Please login to access this resource.",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
      if (err) {
        console.error("Token Verification failed:", err.message);
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      req.user = decodedUser;
      next();
    });
  } catch (error) {
    console.error("Auth middleware error", error);
    res.status(500).json({
      succcess: false,
      message: "Internal Server Errror",
    });
  }
};



