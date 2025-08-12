export const getLevelFromSwaps = (
  swapCount: number
): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' => {
  if (swapCount >= 30) return 'Platinum';
  if (swapCount >= 15) return 'Gold';
  if (swapCount >= 5) return 'Silver';
  return 'Bronze';
};
