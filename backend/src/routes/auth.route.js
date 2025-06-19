import express from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: "Too many attempts, please try again later",
});

// Input validation middleware
const validateAuthInput = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !email.includes("@")) {
    return res.status(400).json({ 
      success: false,
      message: "Please provide a valid email address" 
    });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ 
      success: false,
      message: "Password must be at least 6 characters" 
    });
  }

  // Normalize email
  req.body.email = email.toLowerCase().trim();
  next();
};

// Auth Routes
router.post("/signup", authLimiter, validateAuthInput, signup);
router.post("/login", authLimiter, validateAuthInput, login);
router.post("/logout", logout);

// Protected Routes
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString() 
  });
});

export default router;