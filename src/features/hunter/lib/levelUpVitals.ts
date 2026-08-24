/**
 * Apply the level-up refill rule to a tracked pool. A pool is restored only
 * when this level change actually raises its maximum; level reductions still
 * keep the saved value within the new maximum.
 */
export function levelAdjustedPool(
  current: number,
  currentMaximum: number | undefined,
  nextMaximum: number | undefined,
  levelIncreased: boolean,
): number | undefined {
  if (nextMaximum == null) return undefined;
  if (levelIncreased && (currentMaximum == null || nextMaximum > currentMaximum)) return nextMaximum;
  return Math.min(current, nextMaximum);
}
