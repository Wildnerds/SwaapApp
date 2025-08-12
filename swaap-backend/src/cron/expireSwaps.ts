// src/cron/expireSwaps.ts
import cron from 'node-cron';
import { expireOldSwaps } from '@/utils/expireOldSwaps';

// Runs every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('[⏰] Running scheduled swap expiry...');
  await expireOldSwaps();
});
