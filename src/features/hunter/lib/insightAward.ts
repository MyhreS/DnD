import type { HunterCard } from "@/types";
/** Apply an Insight award without ever spending accumulated Insight.
 * Reaching a threshold makes an upgrade available; the level and its derived
 * pools are committed together only after the player finishes that upgrade. */
export function insightAwardPatch(card: HunterCard, delta: number): Partial<HunterCard> {
  const insight = Math.max(0, (card.insight ?? 0) + delta);
  return { insight };
}
