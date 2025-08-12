// src/db.ts
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
   await mongoose.connect(process.env.MONGODB_URI as string, {
  retryWrites: true,
  serverSelectionTimeoutMS: 10000,
});
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};
