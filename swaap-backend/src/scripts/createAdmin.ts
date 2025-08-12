// scripts/createAdmin.ts - Script to create admin user
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User'; // Adjust path based on your structure
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createAdminUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swaap');
    console.log('✅ Connected to MongoDB');

    // Admin user details
    const adminData = {
      fullName: 'Swaap Admin',
      email: 'admin@swaap.com', // Change this to your preferred admin email
      mobile: '+2348012345678', // Change this to your phone number
      password: 'admin123456', // Change this to a secure password
      role: 'admin' as const,
      verified: true,
      emailVerified: true,
      phoneVerified: true,
      trustScore: 100,
      verificationLevel: 4
    };

    console.log('👤 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', adminData.email);
      
      // Update existing user to admin
      existingAdmin.role = 'admin';
      existingAdmin.trustScore = 100;
      existingAdmin.verificationLevel = 4;
      await existingAdmin.save();
      
      console.log('✅ Updated existing user to admin role');
      console.log('📧 Admin Email:', adminData.email);
      console.log('🔒 Use your existing password or reset it');
      
      process.exit(0);
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    // Create admin user
    const adminUser = new User({
      ...adminData,
      password: hashedPassword
    });

    await adminUser.save();

    console.log('🎉 Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Login Credentials:');
    console.log('📧 Email:', adminData.email);
    console.log('🔒 Password:', adminData.password);
    console.log('');
    console.log('🚀 You can now login to the admin panel with these credentials');
    console.log('🔗 Admin Panel: http://localhost:3000 (or your React app URL)');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.log('💡 User with this email already exists. Try updating instead.');
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
createAdminUser();

// Alternative: Create admin via direct MongoDB insert
export const createAdminDirectly = async () => {
  const adminData = {
    fullName: 'Swaap Admin',
    email: 'admin@swaap.com',
    mobile: '+2348012345678',
    password: await bcrypt.hash('admin123456', 10), // Hash the password
    role: 'admin',
    verified: true,
    emailVerified: true,
    phoneVerified: true,
    addressVerified: true,
    identityVerified: true,
    trustScore: 100,
    verificationLevel: 4,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return adminData;
};

// Export for use in other scripts
export default createAdminUser;