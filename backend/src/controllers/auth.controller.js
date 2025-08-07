// File: main/server/src/controllers/auth.controller.js

import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
import { setAuthCookie } from "./auth.helper.js";
import { adminAuth } from "../lib/firebaseadmin.js";

// Utility to send only safe user fields
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

export const handleFirebaseSignup = async (req, res) => {
  try {
    const { email, firebaseUid, fullName } = req.body;

    if (!email || !firebaseUid || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, firebaseUid, fullName",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      firebaseUid,
      authProvider: "firebase",
      role: "user",
      profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}`,
    });

    const token = generateToken(newUser._id);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      user: filterUserData(newUser),
      token,
    });

  } catch (error) {
    console.error("[FIREBASE SIGNUP ERROR]", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User with this UID already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Account creation failed. Please try again later.",
    });
  }
};

export const handleFirebaseLogin = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Firebase ID token is required",
    });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    console.log("✅ Firebase token verified:", decodedToken);

    const { uid, email, email_verified } = decodedToken;

    if (!email_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    // Find user in MongoDB by Firebase UID
    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { lastLogin: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with that Firebase UID",
      });
    }

    // Generate custom JWT for your app
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: filterUserData(user),
      token,
    });

  } catch (error) {
    console.error("❌ [FIREBASE LOGIN ERROR]:", error);

    let message = "Authentication failed";

    if (error.code === "auth/id-token-expired") {
      message = "Token expired. Please login again.";
    } else if (error.code === "auth/argument-error" || error.name === "Error") {
      message = "Invalid Firebase token";
    }

    return res.status(401).json({ success: false, message });
  }
};

// ======================
// COMMON AUTH HANDLERS
// ======================

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("[LOGOUT ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: filterUserData(req.user),
    });
  } catch (error) {
    console.error("[AUTH CHECK ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Session verification failed",
    });
  }
};

// ======================
// PROFILE & USER UPDATE
// ======================

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("[USER UPDATE ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};
