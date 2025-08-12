// src/utils/getUserLevel.ts
export function getUserLevel(swapCount: number) {
  if (swapCount >= 30) return { level: 'Platinum', badge: '🥇' };
  if (swapCount >= 20) return { level: 'Gold', badge: '🥈' };
  if (swapCount >= 10) return { level: 'Silver', badge: '🥉' };
  return { level: 'Bronze', badge: '🔰' };
}
