/**
 * Apply the level-up refill rule to a tracked pool. A pool is restored only
 * when the change actually raises its maximum AND the caller says a refill is
 * owed; reductions still keep the saved value within the new maximum.
 *
 * `maximumShouldRefill` is not "the level went up": core-rulebook.txt [page 46]
 * — "When your Constitution modifier increases by 1, your Hit Point maximum
 * increases by 1 for each level you have attained" — so a Constitution increase
 * taken through a feat raises the maximum with no level change and must refill
 * too.
 */
export function levelAdjustedPool(
  current: number,
  currentMaximum: number | undefined,
  nextMaximum: number | undefined,
  maximumShouldRefill: boolean,
): number | undefined {
  if (nextMaximum == null) return undefined;
  if (maximumShouldRefill && (currentMaximum == null || nextMaximum > currentMaximum)) return nextMaximum;
  return Math.min(current, nextMaximum);
}
