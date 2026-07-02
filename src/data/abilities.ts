import type { AbilityKey } from "@/types";

export const ABILITIES: { key: AbilityKey; name: string; short: string }[] = [
  { key: "str", name: "Strength", short: "STR" },
  { key: "dex", name: "Dexterity", short: "DEX" },
  { key: "con", name: "Constitution", short: "CON" },
  { key: "int", name: "Intelligence", short: "INT" },
  { key: "wis", name: "Wisdom", short: "WIS" },
  { key: "cha", name: "Charisma", short: "CHA" },
];

export const ABILITY_NAME: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** Point-buy budget for character creation (handbook, Step 3). */
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

/** Cost of buying a given ability score (handbook Ability Score Point Costs). */
export const POINT_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

/** The "Maduhausu" 🤡 point buy — the DM's min-maxing variant (see
 * resources/master.json `abilityPointCostsV2`): 57 points, scores 3–16, and
 * buying the SAME score again costs more (first/second/third+ purchase). */
export const MADUHAUSU_BUDGET = 57;
export const MADUHAUSU_MIN = 3;
export const MADUHAUSU_MAX = 16;
/** No FINAL level-1 score (base + background bonus) may exceed 17. */
export const MADUHAUSU_FINAL_MAX = 17;

/** Cost per purchase of a score: [first, second, third and later].
 * `null` = not allowed ("Too expensive" — a third 16 can't be bought). */
export const MADUHAUSU_COST: Record<number, [number, number, number | null]> = {
  3: [0, 0, 0],
  4: [1, 1, 1],
  5: [2, 2, 2],
  6: [3, 3, 3],
  7: [4, 4, 4],
  8: [5, 5, 5],
  9: [6, 6, 6],
  10: [7, 7, 7],
  11: [8, 8, 8],
  12: [9, 9, 9],
  13: [10, 10, 10],
  14: [12, 14, 17],
  15: [14, 18, 23],
  16: [20, 26, null],
};

/** Total Maduhausu cost of a full set of bought scores, honouring the
 * escalating repeat costs; `null` if any purchase is not allowed. */
export function maduhausuSpent(scores: number[]): number | null {
  const timesBought: Record<number, number> = {};
  let total = 0;
  for (const score of scores) {
    const costs = MADUHAUSU_COST[score];
    if (!costs) return null;
    const nth = (timesBought[score] = (timesBought[score] ?? 0) + 1);
    const cost = costs[Math.min(nth, 3) - 1];
    if (cost === null) return null;
    total += cost;
  }
  return total;
}

/** D&D-standard ability modifier; matches the handbook's table. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

