import Swap from '@/models/Swap';

export const deleteOldSwaps = async () => {
  const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

  const result = await Swap.deleteMany({
    status: { $in: ['expired', 'rejected'] },
    updatedAt: { $lte: threshold }
  });

  console.log(`🗑️ Deleted ${result.deletedCount} old swaps`);
};
