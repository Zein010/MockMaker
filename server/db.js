import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
configDotenv();
const connectDB = async () => {
  try {
    // Replace <password> with your actual password
    const uri = process.env.MONGO_URI;
    
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected Successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1); // Stop the app if connection fails
  }
};

export default connectDB;