import mongoose from "mongoose";
import validator from "validator";

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
      required: [true, "Firebase UID is required"],
      unique: true
    },
    profilePic: {
      type: String,
      default: function () {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.fullName)}&background=random`;
      }
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user"
    },
    lastLogin: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    },
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
      default: "firebase"
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.twoFactorSecret;
        delete ret.firebaseUid;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Method to verify Firebase UID match
userSchema.methods.verifyFirebaseUser = async function (firebaseUid) {
  if (this.firebaseUid !== firebaseUid) {
    throw new Error("Firebase UID mismatch");
  }
  return true;
};

// Update last login timestamp
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save();
};

// Filter out inactive users in queries
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// Virtual for avatar URL
userSchema.virtual("avatar").get(function () {
  return (
    this.profilePic ||
    ` https://ui-avatars.com/api/?name=${this.fullName.split(" ").join("+")}&background=random`
  );
});

const User = mongoose.model("User", userSchema);

export default User;