// server/controllers/admin.controller.js
import User from "../models/user.model.js";
import createHttpError from "http-errors";

// Admin Dashboard Statistics
export const adminDashboard = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          latest: { $max: "$createdAt" }
        }
      },
      {
        $project: {
          role: "$_id",
          count: 1,
          latest: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        message: "Admin Dashboard",
        stats,
        user: req.user // Current admin user
      }
    });
  } catch (error) {
    next(createHttpError(500, "Failed to load dashboard data"));
  }
};

// Get All Users (with filtering)
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, active, search } = req.query;
    
    const filter = {};
    if (role) filter.role = role;
    if (active) filter.active = active === 'true';
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('-password -twoFactorSecret');

    res.status(200).json({
      success: true,
      results: users.length,
      data: users
    });
  } catch (error) {
    next(createHttpError(500, "Failed to fetch users"));
  }
};

// Update User Role
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'moderator'].includes(role)) {
      return next(createHttpError(400, "Invalid role specified"));
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret');

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(createHttpError(500, "Failed to update user role"));
  }
};

// Deactivate/Reactivate User
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // Prevent deactivating other admins
    if (user.role === 'admin' && req.user._id.toString() !== userId) {
      return next(createHttpError(403, "Cannot modify other admins"));
    }

    user.active = !user.active;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        active: user.active
      }
    });
  } catch (error) {
    next(createHttpError(500, "Failed to toggle user status"));
  }
};