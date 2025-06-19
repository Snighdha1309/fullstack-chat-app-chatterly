import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email"
      }
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
      minlength: [2, "Name must be at least 2 characters"]
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true // Allows null values for non-Firebase users
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      // Make password optional for Firebase-authenticated users
      required: function() {
        return !this.firebaseUid; // Only required if no Firebase UID
      }
    },
    profilePic: {
      type: String,
      default: function() {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.fullName)}&background=random`;
      }
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user"
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    accountLockedUntil: {
      type: Date,
      select: false
    },
    lastLogin: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    authProvider: {
      type: String,
      enum: ["local", "firebase"],
      default: "local"
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.twoFactorSecret;
        delete ret.firebaseUid;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Modified password hashing middleware
userSchema.pre("save", async function(next) {
  // Skip if password isn't modified (or user is Firebase-authenticated)
  if (!this.isModified("password") || this.firebaseUid) return next();

  try {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = Date.now() - 1000;
    next();
  } catch (err) {
    next(err);
  }
});

// Enhanced login attempt tracking
userSchema.methods.incrementLoginAttempts = async function() {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    this.accountLockedUntil = Date.now() + LOCK_TIME;
  }
  this.loginAttempts += 1;
  await this.save();
};

// Modified password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.firebaseUid) {
    throw new Error("Password comparison not available for Firebase-authenticated users");
  }

  if (this.accountLockedUntil && this.accountLockedUntil > Date.now()) {
    throw new Error("Account temporarily locked. Try again later");
  }

  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  if (!isMatch) {
    await this.incrementLoginAttempts();
    return false;
  }

  await this.resetLoginAttempts();
  return true;
};

// New method for Firebase users
userSchema.methods.verifyFirebaseUser = async function(firebaseUid) {
  if (this.firebaseUid !== firebaseUid) {
    throw new Error("Firebase UID mismatch");
  }
  await this.resetLoginAttempts();
  return true;
};

// Preserve all other existing methods
userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.accountLockedUntil = undefined;
  this.lastLogin = new Date();
  await this.save();
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  if (this.firebaseUid) {
    throw new Error("Password reset not available for Firebase-authenticated users");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Filter out inactive users
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// Virtual for avatar URL
userSchema.virtual("avatar").get(function() {
  return this.profilePic || `https://ui-avatars.com/api/?name=${this.fullName.split(" ").join("+")}&background=random`;
});

const User = mongoose.model("User", userSchema);

export default User;