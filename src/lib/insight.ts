/** Total Insight required for each character level (index = level). */
export const INSIGHT_BY_LEVEL = [0, 0, 6, 15, 30, 50, 75, 105, 140, 180, 225, 275, 330, 390, 455, 525, 600, 680, 765, 855, 950] as const;

/** The highest level earned by a character's accumulated Insight. */
export function levelForInsight(insight: number): number {
  let level = 1;
  for (let candidate = 2; candidate < INSIGHT_BY_LEVEL.length; candidate += 1) {
    if (insight >= INSIGHT_BY_LEVEL[candidate]) level = candidate;
  }
  return level;
}
