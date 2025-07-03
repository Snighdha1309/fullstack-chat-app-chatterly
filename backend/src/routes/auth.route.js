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

// Input validation middlewares
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
      message: "Wrong password" 
    });
  }
  req.body.email = email.toLowerCase().trim();
  next();
};



// Auth Routes
router.post("/firebase/signup", authLimiter, validateFirebaseAuth, handleFirebaseSignup);
router.post("/firebase/login", authLimiter, validateAuthInput, handleFirebaseLogin);
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