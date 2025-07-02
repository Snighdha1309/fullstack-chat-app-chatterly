import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";

// Constants
const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
};

const filterUserData = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  role: user.role,
  createdAt: user.createdAt,
});

// ======================
// FIREBASE AUTH HANDLERS
// ======================

/**
 * Handles Firebase user sign-up:
 * - Creates a new user in MongoDB if not exists
 */
export const handleFirebaseSignup = async (req, res) => {
  try {
    const { email, firebaseUid, fullName } = req.body;

    // Validate required fields
    if (!email || !firebaseUid || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, firebaseUid, fullName"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await User.findOne({ firebaseUid });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    // Create new user
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      firebaseUid,
      authProvider: "firebase",
      role: "user",
      profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}`
    });

    // Generate token
    const token = generateToken(newUser._id, res);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      user: filterUserData(newUser),
      token
    });

  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    // Handle duplicate key error (e.g., unique constraint)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User with this UID already exists"
      });
    }

    console.error("[FIREBASE SIGNUP ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Account creation failed. Please try again later."
    });
  }
};

/**
 * Handles Firebase user login:
 * - Finds user by Firebase UID and email
 * - Issues JWT cookie
 */
export const handleFirebaseLogin = async (req, res) => {
  const { email, firebaseUid } = req.body;

  try {
    // Basic validation
    if (!email?.trim() || !firebaseUid?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email and Firebase UID are required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.firebaseUid !== firebaseUid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, res);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      user: filterUserData(user),
      token
    });

  } catch (error) {
    console.error("[FIREBASE LOGIN ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

// ======================
// COMMON AUTH HANDLERS
// ======================

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("[LOGOUT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: filterUserData(req.user)
    });
  } catch (error) {
    console.error("[AUTH CHECK ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Session verification failed"
    });
  }
};