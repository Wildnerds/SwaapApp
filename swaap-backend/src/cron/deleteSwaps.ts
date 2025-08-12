import cron from 'node-cron';
import { deleteOldSwaps } from '@/utils/deleteOldSwaps';

cron.schedule('0 3 * * *', async () => {
  console.log('[⏰] Running old swap cleanup...');
  await deleteOldSwaps();
});
