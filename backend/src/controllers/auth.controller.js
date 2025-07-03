import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
// Constants
import { setAuthCookie } from "./auth.helper.js";
import { signInWithEmailAndPassword } from "firebase/auth"; 
import { auth } from "../lib/firebaseconfig.js"; 
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
  const { email, password } = req.body;

  // 1. Input Validation (replaces your first middleware)
  if (!email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    // 2. Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    const firebaseUser = userCredential.user;

    // 3. Optional: Email Verification Check
    if (!firebaseUser.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first"
      });
    }

    // 4. MongoDB Sync
    const user = await User.findOneAndUpdate(
      { firebaseUid: firebaseUser.uid }, // Find by Firebase UID
      { lastLogin: new Date() }, // Update last login
      { new: true } // Return updated doc
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not registered in our system"
      });
    }

    // 5. Generate JWT
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: filterUserData(user),
      token
    });

  } catch (error) {
    // 6. Firebase Error Handling
    const errorMap = {
      "auth/invalid-email": "Invalid email format",
      "auth/wrong-password": "Incorrect password",
      "auth/user-not-found": "Email not registered",
      "auth/too-many-requests": "Too many attempts. Try again later"
    };

    const message = errorMap[error.code] || "Login failed";
    const statusCode = error.code ? 401 : 500;

    return res.status(statusCode).json({
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