import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
// Constants
import { setAuthCookie } from "./auth.helper.js"; 
import { adminAuth } from '../lib/firebaseadmin.js';
import { getAuth } from "firebase-admin/auth";
const filterUserData = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  role: user.role,
  createdAt: user.createdAt
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


    
    console.log("userdata",newUser);
    res.status(201).json({
      success:true,
      console:"user created successfully",
      user:newUser,
    })

    

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
  // First, get the idToken from the request body
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ 
      success: false, 
      message: "Firebase ID token is required" 
    });
  }

  try {
    // 1. Verify Firebase token using the pre-initialized adminAuth
    // (Make sure you've imported adminAuth from your firebase-admin config)
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, email_verified } = decodedToken;

    // 2. Check email verification
    if (!email_verified) {
      return res.status(403).json({ 
        success: false, 
        message: "Please verify your email first" 
      });
    }

    const safeFullName = (decodedToken.name && decodedToken.name.trim()) || (email && email.trim()) || "User";
const safeEmail = (email && email.trim()) || `user_${uid}@noemail.local`;

    // 3. Sync with MongoDB
   const user = await User.findOneAndUpdate(
  { firebaseUid: uid },
  {
    $set: {
      lastLogin: new Date(),
      fullName: safeFullName,
      email: safeEmail,
      firebaseUid: uid,
      authProvider: "firebase",
      profilePic: decodedToken.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeFullName)}`
    }
  },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);

    // 4. Generate JWT
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      user: filterUserData(user),
      token
    });

  } catch (error) {
    console.error("[FIREBASE LOGIN ERROR]", error);
    
    // More specific error handling
    let message = "Authentication failed";
    if (error.code === 'auth/id-token-expired') {
      message = "Token expired. Please login again.";
    } else if (error.code === 'auth/argument-error') {
      message = "Invalid token";
    }

    res.status(401).json({ 
      success: false, 
      message 
    });
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

// ======================
// PROFILE & USER UPDATE
// ======================

/**
 * Update user profile picture
 */
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ 
        success: false,
        message: "Profile picture is required" 
      });
    }

    // In case you use Cloudinary later
    // const uploadResponse = await cloudinary.uploader.upload(profilePic, {
    //   folder: "profile_pics",
    //   quality: "auto:good",
    // });

    // For now, just store provided URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update profile" 
    });
  }
};

/**
 * General-purpose user update (like name or other non-sensitive info)
 */
export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error("[USER UPDATE ERROR]", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update user" 
    });
  }
};