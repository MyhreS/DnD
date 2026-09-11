import type { HunterCard } from "@/types";

/** The outcome of a Hunter's death, once the at-the-moment-of-death Favor
 * decision has been made. core-rulebook.txt [page 44]: "When you die, you may
 * expend one Favor. This decision must be made when you die. If you expend a
 * Favor, your body and everything you were wearing or carrying disappear from
 * the world." — hence no loot drop on the Favor path. [page 45]: "You may
 * choose not to expend a Favor when you die. If you do not expend one, death
 * proceeds normally." */
export interface DeathOutcome {
  /** True when a Favor was actually expended (only possible if one is held). */
  favorSpent: boolean;
  /** Their gear drops as claimable loot only when no Favor is expended. */
  dropsLoot: boolean;
  /** The card as archived — one Favor fewer when one was expended. */
  card: HunterCard;
}

/** Can this Hunter expend a Favor at the moment of death? */
export function canSpendFavor(card: HunterCard): boolean {
  return (card.favors ?? 0) > 0;
}

/** Resolve a death. `spendFavor` is the player's decision, taken at the moment
 * of death; it is ignored when no Favor is held. */
export function resolveDeath(card: HunterCard, spendFavor: boolean): DeathOutcome {
  const favorSpent = spendFavor && canSpendFavor(card);
  return {
    favorSpent,
    dropsLoot: !favorSpent,
    card: favorSpent ? { ...card, favors: Math.max(0, (card.favors ?? 0) - 1) } : card,
  };
}
