import type { AbilityKey } from "@/types";
import {
  MADUHAUSU_BUDGET,
  MADUHAUSU_FINAL_MAX,
  MADUHAUSU_MAX,
  MADUHAUSU_MIN,
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_COST,
  maduhausuSpent,
} from "@/data/abilities";
import { ABILITY_KEYS } from "@/lib/ability-keys";

// The single source of truth for Step 3's buy math: every cost and every
// blocking rule lives here, so the setters in CharacterEditor and the tiles'
// blocked-"+" explanations can never drift apart. Pure functions, no React.

export type BuyMode = "pointbuy" | "maduhausu";
type Scores = Record<AbilityKey, number>;

export const budgetFor = (mode: BuyMode): number =>
  mode === "maduhausu" ? MADUHAUSU_BUDGET : POINT_BUY_BUDGET;

/** Total points spent on a set of BASE scores. `null` = an illegal set (a
 * third 16 in Maduhausu). Out-of-range point-buy scores (a leveled hunter's
 * ASIs) count as 0 — the editor's historic behavior, preserved. */
export function spentFor(mode: BuyMode, base: Scores): number | null {
  if (mode === "maduhausu") return maduhausuSpent(ABILITY_KEYS.map((k) => base[k]));
  return ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 0), 0);
}

/** What the next + on `key` costs — a full recompute of the whole set, so
 * Maduhausu's escalating repeat prices are exact (a second 15 costs more than
 * the first). `null` = the increment is illegal at any price. */
export function nextBaseCost(mode: BuyMode, base: Scores, key: AbilityKey): number | null {
  if (base[key] + 1 > (mode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX)) return null;
  const current = spentFor(mode, base);
  const projected = spentFor(mode, { ...base, [key]: base[key] + 1 });
  if (current === null || projected === null) return null;
  return projected - current;
}

/** Why setting `key`'s BASE score to `next` is not allowed — the exact
 * user-facing reason — or `null` when the change is legal. Check order mirrors
 * the old setter guard: bounds → final-cap 17 → cost/budget. */
export function baseSetBlock(
  mode: BuyMode,
  base: Scores,
  bonus: Scores,
  key: AbilityKey,
  next: number,
): string | null {
  const min = mode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
  if (next < min) return `Min ${min}.`;
  if (mode === "pointbuy" && next > POINT_BUY_MAX) {
    return `Max ${POINT_BUY_MAX} before the background bonus.`;
  }
  if (mode === "maduhausu" && next > MADUHAUSU_MAX) {
    return `Max ${MADUHAUSU_MAX} — Maduhausu can't buy higher.`;
  }
  // Maduhausu's hard cap: no FINAL score above 17, background points included.
  if (mode === "maduhausu" && next + bonus[key] > MADUHAUSU_FINAL_MAX) {
    return `Cap ${MADUHAUSU_FINAL_MAX} at level 1 — background bonus included. Remove the bonus first.`;
  }
  const spent = spentFor(mode, { ...base, [key]: next });
  if (spent === null) return "A third 16 is too expensive — the table forbids it.";
  const budget = budgetFor(mode);
  if (spent > budget) {
    const current = spentFor(mode, base) ?? 0;
    const cost = spent - current;
    const left = budget - current;
    return mode === "maduhausu"
      ? `Next + costs ${cost} — you have ${left}.`
      : `Out of points — this + costs ${cost}, you have ${left}.`;
  }
  return null;
}

/** Why setting `key`'s BACKGROUND BONUS to `next` is not allowed, or `null`.
 * Check order mirrors the old setter guard: bounds → eligibility →
 * final-cap 17 → the 3-point total. */
export function bonusSetBlock(
  mode: BuyMode,
  base: Scores,
  bonus: Scores,
  eligible: readonly AbilityKey[],
  key: AbilityKey,
  next: number,
): string | null {
  if (next < 0) return "Min +0.";
  if (next > 2) return "Max +2 from your background on one ability.";
  if (!eligible.includes(key)) return "Not one of your background's abilities.";
  // Maduhausu's hard cap: no FINAL score above 17, background points included.
  if (mode === "maduhausu" && base[key] + next > MADUHAUSU_FINAL_MAX) {
    return `Cap ${MADUHAUSU_FINAL_MAX} at level 1 — lower the base score first.`;
  }
  const total = ABILITY_KEYS.reduce((sum, k) => sum + bonus[k], 0);
  if (next > bonus[key] && total + (next - bonus[key]) > 3) {
    return "Background bonus all used — 3 of 3.";
  }
  return null;
}
