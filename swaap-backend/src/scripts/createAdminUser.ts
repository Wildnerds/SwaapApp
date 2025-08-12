// Script to create admin user for testing
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

// Import User model
import User from '../models/User';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI!;
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@swaap.com' });
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
      existingAdmin.role = 'admin'; // Ensure role is admin
      await existingAdmin.save();
      console.log('✅ Admin role updated');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = new User({
      fullName: 'Admin User',
      email: 'admin@swaap.com',
      mobile: '+1234567890',
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      phoneVerified: true,
      isVerified: true,
      trustScore: 100,
      verificationLevel: 5,
      level: 'gold',
      isPro: true,
      isAdmin: true,
      plan: 'pro'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@swaap.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();