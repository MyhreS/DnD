import type { AbilityKey } from "@/types";

/** Ability names and the skills placed under them on the supplied character sheet. */
export const ABILITIES: { key: AbilityKey; name: string; short: string; description: string }[] = [
  { key: "str", name: "Strength", short: "STR", description: "Athletics and raw physical force." },
  { key: "dex", name: "Dexterity", short: "DEX", description: "Acrobatics, Sleight of Hand, and Stealth." },
  { key: "con", name: "Constitution", short: "CON", description: "Grit and physical endurance." },
  { key: "int", name: "Intelligence", short: "INT", description: "Blood Nature, Eldritch Knowledge, Investigation, Old World History, and Religion." },
  { key: "wis", name: "Wisdom", short: "WIS", description: "Animal Handling, Insight, Medicine, Perception, and Survival." },
  { key: "cha", name: "Charisma", short: "CHA", description: "Deception, Intimidation, Presence, and Persuasion." },
];

export const ABILITY_NAME: Record<AbilityKey, string> = Object.fromEntries(
  ABILITIES.map((ability) => [ability.key, ability.name]),
) as Record<AbilityKey, string>;

/** Standard character creation: 27 points, with bought scores from 8 through 15. */
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_COST: Readonly<Record<number, number>> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

/** Maduhausu character creation: 57 points and escalating costs when the same
 * score is bought repeatedly. The third entry is also used for later repeats. */
export const MADUHAUSU_BUDGET = 57;
export const MADUHAUSU_MIN = 3;
export const MADUHAUSU_MAX = 16;
export const MADUHAUSU_FINAL_MAX = 17;
export const MADUHAUSU_COST: Readonly<Record<number, readonly [number, number, number | null]>> = {
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

/** Total Maduhausu cost, or null when any score or repeated purchase is illegal. */
export function maduhausuSpent(scores: readonly number[]): number | null {
  const timesBought: Record<number, number> = {};
  let total = 0;
  for (const score of scores) {
    if (!Number.isInteger(score)) return null;
    const costs = MADUHAUSU_COST[score];
    if (!costs) return null;
    const nth = (timesBought[score] = (timesBought[score] ?? 0) + 1);
    const cost = costs[Math.min(nth, 3) - 1];
    if (cost == null) return null;
    total += cost;
  }
  return total;
}

/** Established app calculation. The replacement source set names Modifier
 * fields but does not define a modifier formula. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod);
}
