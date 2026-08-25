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
import type { AbilityKey } from "@/types";

export type BuyMode = "pointbuy" | "maduhausu";
export type AbilityScores = Record<AbilityKey, number>;

export interface AbilityBuySummary {
  budget: number;
  spent: number | null;
  pointsLeft: number | null;
  valid: boolean;
  complete: boolean;
}

export interface BackgroundBonusSummary {
  used: number;
  remaining: number;
  valid: boolean;
  complete: boolean;
}

export const budgetFor = (mode: BuyMode) => mode === "maduhausu" ? MADUHAUSU_BUDGET : POINT_BUY_BUDGET;

export function scoreRangeFor(mode: BuyMode): { minimum: number; maximum: number } {
  return mode === "maduhausu"
    ? { minimum: MADUHAUSU_MIN, maximum: MADUHAUSU_MAX }
    : { minimum: POINT_BUY_MIN, maximum: POINT_BUY_MAX };
}

export function finalCreationMaximum(mode: BuyMode): number {
  return mode === "maduhausu" ? MADUHAUSU_FINAL_MAX : 20;
}

/** Calculate the full six-score purchase. Invalid or out-of-range scores never
 * become zero-cost purchases; they make the result invalid. */
export function spentFor(mode: BuyMode, scores: AbilityScores): number | null {
  const values = ABILITY_KEYS.map((key) => scores[key]);
  if (mode === "maduhausu") return maduhausuSpent(values);
  let total = 0;
  for (const score of values) {
    if (!Number.isInteger(score) || !Object.prototype.hasOwnProperty.call(POINT_COST, score)) return null;
    total += POINT_COST[score];
  }
  return total;
}

export function abilityBuySummary(mode: BuyMode, scores: AbilityScores): AbilityBuySummary {
  const budget = budgetFor(mode);
  const spent = spentFor(mode, scores);
  const pointsLeft = spent == null ? null : budget - spent;
  return {
    budget,
    spent,
    pointsLeft,
    valid: spent != null && spent <= budget,
    complete: spent === budget,
  };
}

/** Validate both partial and complete background allocations. Each background
 * grants exactly three points as +2/+1 on different abilities or +1/+1/+1. */
export function backgroundBonusSummary(
  eligible: readonly AbilityKey[],
  bonuses: Partial<Record<AbilityKey, number>>,
  base: AbilityScores,
  mode: BuyMode,
): BackgroundBonusSummary {
  const eligibleSet = new Set(eligible);
  const maximum = finalCreationMaximum(mode);
  let used = 0;
  let valid = true;
  const positive: number[] = [];

  for (const key of ABILITY_KEYS) {
    const amount = bonuses[key] ?? 0;
    if (!Number.isInteger(amount) || amount < 0 || amount > 2) valid = false;
    if (amount > 0 && !eligibleSet.has(key)) valid = false;
    if (base[key] + amount > maximum) valid = false;
    used += amount;
    if (amount > 0) positive.push(amount);
  }

  if (used > 3) valid = false;
  positive.sort((a, b) => a - b);
  const pattern = positive.join(",");
  return {
    used,
    remaining: Math.max(0, 3 - used),
    valid,
    complete: valid && (pattern === "1,2" || pattern === "1,1,1"),
  };
}
