import express from "express";
import {
  checkAuth,
  logout,
  updateProfile,
  handleFirebaseSignup,
  handleFirebaseLogin,
  updateUser
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many attempts, please try again later",
});

/**
 * Middleware to validate Firebase ID Token
 * - Checks for token existence
 * - Verifies token structure (basic format check)
 * - Doesn't verify with Firebase yet (that happens in controller)
 */
const validateFirebaseToken = (req, res, next) => {
  // 1. Check if token exists in request
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(400).json({ 
      success: false,
      message: "Firebase ID token is required" 
    });
  }

  // 2. Basic token format validation (optional but recommended)
  // Firebase ID tokens are JWTs with 3 parts separated by dots
  const tokenParts = idToken.split('.');
  if (tokenParts.length !== 3) {
    return res.status(400).json({
      success: false,
      message: "Invalid token format"
    });
  }

  // 3. Attach to request and proceed
  req.firebaseToken = idToken; // Optional: attach for easy access
  next();
};
const validateFirebaseAuth = (req, res, next) => {
  const { email, firebaseUid, fullName } = req.body;
  
  if (!email || !email.includes("@")) {
    return res.status(400).json({ 
      success: false,
      message: "Please provide a valid email address" 
    });
  }
  if (!firebaseUid) {
    return res.status(400).json({ 
      success: false,
      message: "Firebase UID is required" 
    });
  }
  if (!fullName) {
    return res.status(400).json({ 
      success: false,
      message: "Full name is required" 
    });
  }
  req.body.email = email.toLowerCase().trim();
  next();
};


// Auth Routes
router.post("/firebase/signup", authLimiter, validateFirebaseAuth, handleFirebaseSignup);
router.post("/firebase/login", authLimiter, validateFirebaseToken, handleFirebaseLogin);
router.post("/logout", logout);

// User Profile Routes
router.route("/profile")
  .get(protectRoute, checkAuth)
  .put(protectRoute, updateProfile);

// Admin Routes
router.put("/admin/update-user/:id", protectRoute, updateUser);

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString() 
  });
});

export default router;