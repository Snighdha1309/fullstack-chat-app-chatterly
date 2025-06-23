import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// Constants
const PASSWORD_MIN_LENGTH = 6;
const SALT_ROUNDS = 10;

// Helper Functions
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
  createdAt: user.createdAt
});

// ======================
// LOCAL AUTH HANDLERS
// ======================
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    // Validation
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ 
        success: false,
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` 
      });
    }

    // Check existing user
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: "Email already exists" 
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      role: "user",
      profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}`
    });

    // Generate token
    const token = generateToken(newUser._id,res);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      user: filterUserData(newUser),
      token
    });

  } catch (error) {
    console.error("[LOCAL SIGNUP ERROR]", error);
    res.status(500).json({ 
      success: false,
      message: "Account creation failed" 
    });
  }
};

// LOCAL LOGIN HANDLER
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email?.trim() || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    // Find user
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Skip password check for Firebase-authenticated users
    if (user.authProvider === "firebase") {
      return res.status(401).json({
        success: false,
        message: "Use Firebase to log in"
      });
    }

    // Only compare password for local users
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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

    res.status(200).json({
      success: true,
      user: filterUserData(user),
      token
    });

  } catch (error) {
    console.error("[LOCAL LOGIN ERROR]", error);
    res.status(500).json({ 
      success: false,
      message: "Login failed" 
    });
  }
};

// ======================
// FIREBASE AUTH HANDLERS
// ======================
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
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { firebaseUid }]
    });

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
        message: "User with this email or UID already exists"
      });
    }

    console.error("[FIREBASE SIGNUP ERROR]", error);
    res.status(500).json({
      success: false,
      message: "Account creation failed. Please try again later."
    });
  }
};



    

export const handleFirebaseLogin = async (req, res) => {
  const { email, firebaseUid } = req.body;

  try {
    // Find user
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
    const token = generateToken(user._id,res);
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

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pics",
      quality: "auto:good",
    });

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: filterUserData(updatedUser)
    });

  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update profile" 
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