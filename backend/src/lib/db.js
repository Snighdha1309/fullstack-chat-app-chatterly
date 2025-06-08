import mongoose from "mongoose";
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);  // we used backtick here `` which is used when we use funcs like $
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
};
