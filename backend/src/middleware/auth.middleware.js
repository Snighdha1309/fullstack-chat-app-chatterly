import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import createHttpError from "http-errors";

// Middleware to protect routes - verifies JWT token
export const protectRoute = async (req, res, next) => {
  try {
    // 1. Extract token from cookies or Authorization header
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer") &&
        req.headers.authorization.split(" ")[1]);

    if (!token) {
      throw createHttpError(401, "Unauthorized - No authentication token provided");
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Fetch user from DB
    const currentUser = await User.findById(decoded.userId);

    if (!currentUser) {
      throw createHttpError(401, "Unauthorized - User no longer exists");
    }

    // 4. Optional: Check if user is active
    // Comment this block if you’re not using 'active' field in your model
    if (currentUser.active === false) {
      throw createHttpError(401, "Unauthorized - Account is inactive");
    }

    // 5. Attach user to request
    req.user = currentUser;
    next();

  } catch (error) {
    // Convert JWT-specific errors to user-friendly messages
    if (error.name === "JsonWebTokenError") {
      error = createHttpError(401, "Unauthorized - Invalid token");
    } else if (error.name === "TokenExpiredError") {
      error = createHttpError(401, "Unauthorized - Token expired");
    }

    // Clear invalid JWT cookie if present
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    next(error);
  }
};

// Role-based access control middleware
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        createHttpError(403, "Forbidden - You do not have permission to perform this action")
      );
    }
    next();
  };
};

// Optional CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  if (req.method !== "GET") {
    const csrfToken = req.headers["x-csrf-token"] || req.body._csrf;
    if (!csrfToken || csrfToken !== req.csrfToken()) {
      return next(createHttpError(403, "Invalid CSRF token"));
    }
  }
  next();
};
