import Swap from '@/models/Swap';

export const expireOldSwaps = async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await Swap.updateMany(
    { status: 'pending', createdAt: { $lte: sevenDaysAgo } },
    { $set: { status: 'expired' } }
  );

  console.log(`✅ Expired ${result.modifiedCount} old swaps`);
};
