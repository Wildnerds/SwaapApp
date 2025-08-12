// src/scripts/cleanup.ts
import { FileHandler } from '../utils/fileHandler';
import IdentityVerification from '../models/IdentityVerification';

export async function cleanupOldFiles() {
  try {
    // Delete files from verifications older than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(process.env.FILE_RETENTION_DAYS || '90'));

    const oldVerifications = await IdentityVerification.find({
      submittedAt: { $lt: cutoffDate },
      status: { $in: ['verified', 'rejected'] }
    });

    for (const verification of oldVerifications) {
      if (verification.frontImagePath && verification.frontImagePath !== 'deleted') {
        await FileHandler.deleteFile(verification.frontImagePath);
      }
      if (verification.backImagePath && verification.backImagePath !== 'deleted') {
        await FileHandler.deleteFile(verification.backImagePath);
      }
      
      // Update record to remove file paths
      verification.frontImagePath = 'deleted';
      verification.backImagePath = verification.backImagePath ? 'deleted' : null;
      await verification.save();
    }

    console.log(`🧹 Cleaned up ${oldVerifications.length} old verification files`);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// Schedule cleanup to run daily at 2 AM
const scheduleCleanup = () => {
  const now = new Date();
  const scheduled = new Date();
  scheduled.setHours(2, 0, 0, 0); // 2 AM

  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1); // Next day
  }

  const timeUntilCleanup = scheduled.getTime() - now.getTime();

  setTimeout(() => {
    cleanupOldFiles();
    setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000); // Every 24 hours
  }, timeUntilCleanup);
};

// Start cleanup scheduler
scheduleCleanup();
console.log('🕐 File cleanup scheduler started - will run daily at 2 AM');