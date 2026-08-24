import type { AbilityKey } from "@/types";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { MADUHAUSU_BUDGET, POINT_BUY_BUDGET, POINT_COST, maduhausuSpent } from "@/data/abilities";

export type BuyMode = "pointbuy" | "maduhausu";
type Scores = Record<AbilityKey, number>;
export const budgetFor = (mode: BuyMode) => mode === "maduhausu" ? MADUHAUSU_BUDGET : POINT_BUY_BUDGET;
export function spentFor(mode: BuyMode, base: Scores): number | null {
  return mode === "maduhausu" ? maduhausuSpent(ABILITY_KEYS.map((key) => base[key])) : ABILITY_KEYS.reduce((sum, key) => sum + (POINT_COST[base[key]] ?? 0), 0);
}
