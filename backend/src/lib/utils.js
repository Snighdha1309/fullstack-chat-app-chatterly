import jwt from "jsonwebtoken";

/**
 * Generates a JWT token for a user and optionally sets it as an HTTP-only cookie
 *
 * @param {string} userId - The MongoDB ObjectId of the user
 * @param {Object} [res] - Express response object (optional)
 * @returns {string} - The generated JWT token
 */
export const generateToken = (userId, res = null) => {
  // Sign the token with user ID and secret
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Token expires in 7 days
  });

  // If response object is provided, set the token as an HTTP-only cookie
  if (res) {
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      path: "/", // Make cookie accessible across all routes
    });
  }

  return token;
};