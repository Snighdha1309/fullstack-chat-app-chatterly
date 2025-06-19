import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// Constants
const PASSWORD_MIN_LENGTH = 6;
const SALT_ROUNDS = 10;

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
    const newUser = new User({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newUser.save();
    
    // Generate token and set cookie
    const token = generateToken(newUser._id);
    setAuthCookie(res, token);

    // Response
    res.status(201).json({
      success: true,
      user: filterUserData(newUser),
      token // Optional: For clients that prefer header-based auth
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

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
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate token and set cookie
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    // Response
    res.status(200).json({
      success: true,
      user: filterUserData(user),
      token // Optional: For clients that prefer header-based auth
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

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
    console.error("Logout error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
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
      user: updatedUser
    });

  } catch (error) {
    console.error("Profile update error:", error);
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
    console.error("Auth check error:", error);
    res.status(500).json({ 
      success: false,
      message: "Session verification failed" 
    });
  }
};

// Helper Functions
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

function filterUserData(user) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    createdAt: user.createdAt
  };
}