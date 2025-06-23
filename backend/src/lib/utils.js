import jwt from "jsonwebtoken";
/**
 * Generates a JWT and optionally sets it as an HTTP-only cookie
 * @param {string} userId - MongoDB user ID
 * @param {Object} [res] - Express response object (optional)
 * @returns {string} JWT token
 */
export const generateToken = (userId, res = null) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  if (res) {
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV !== "development",
    });
  }

  return token;
};