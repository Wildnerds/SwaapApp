import mongoose from 'mongoose';
import User from '../models/User'; // adjust path if needed
import dotenv from 'dotenv';

dotenv.config();

async function migrateWalletToWalletBalance() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const affectedUsers = await User.find({ wallet: { $exists: true } });

    console.log(`🛠 Found ${affectedUsers.length} users to migrate...`);

    for (const user of affectedUsers) {
      const oldWallet = user.wallet || 0;
      user.walletBalance += oldWallet;
      user.set('wallet', undefined); // Remove old field
      await user.save();
      console.log(`✅ Migrated ₦${oldWallet} → ${user.email}`);
    }

    console.log('🎉 Wallet migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateWalletToWalletBalance();
