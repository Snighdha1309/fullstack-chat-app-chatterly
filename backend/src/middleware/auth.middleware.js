import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import createHttpError from "http-errors";

// Token verification middleware
export const protectRoute = async (req, res, next) => {
  try {
    // 1. Get token from cookies or Authorization header
    const token = req.cookies?.jwt || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw createHttpError(401, 'Unauthorized - No authentication token provided');
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      throw createHttpError(401, 'Unauthorized - User no longer exists');
    }

    // 4. Ensure user is active
    if (!currentUser.active) {
      throw createHttpError(401, 'Unauthorized - Account is inactive');
    }

    // 5. Grant access
    req.user = currentUser;
    next();

  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      error = createHttpError(401, 'Unauthorized - Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      error = createHttpError(401, 'Unauthorized - Token expired');
    }

    // Clear invalid token cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    next(error);
  }
};

// Role-based authorization middleware
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createHttpError(403, 'Forbidden - You do not have permission')
      );
    }
    next();
  };
};

// CSRF protection middleware (optional)
export const csrfProtection = (req, res, next) => {
  if (req.method !== 'GET') {
    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    if (!csrfToken || csrfToken !== req.csrfToken()) {
      return next(createHttpError(403, 'Invalid CSRF token'));
    }
  }
  next();
};