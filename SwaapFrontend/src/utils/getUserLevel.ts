// src/utils/getUserLevel.ts

type UserLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

interface LevelInfo {
  level: UserLevel;
  badge: string;
}

export const getUserLevel = (swaps: number | string | undefined | null): LevelInfo => {
  const parsedSwaps = typeof swaps === 'number' ? swaps : parseInt(swaps as string, 10) || 0;

  if (parsedSwaps >= 50) return { level: 'platinum', badge: '💎' };
  if (parsedSwaps >= 20) return { level: 'gold', badge: '🥇' };
  if (parsedSwaps >= 10) return { level: 'silver', badge: '🥈' };
  return { level: 'bronze', badge: '🥉' };
};
