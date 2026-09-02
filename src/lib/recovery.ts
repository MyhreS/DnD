import type { HunterCard } from "@/types";
import { INSIGHT_BY_LEVEL } from "./insight";

/** A Hunter returning from death (the Favor path, core-rulebook.txt [page 45]):
 * "When you return, lose all Insight gained since reaching your current Level.
 * Reduce your Insight to the minimum total required for your current Level in
 * the Character Advancement table." The Level itself is untouched — "You never
 * lose a Level from expending a Favor."
 *
 * Forward only: already-recovered records carry no marker and are not
 * retro-fixed. */
export function recoveredCard(card: HunterCard): HunterCard {
  const level = Math.max(1, Math.min(INSIGHT_BY_LEVEL.length - 1, card.level));
  return { ...card, insight: INSIGHT_BY_LEVEL[level] };
}
