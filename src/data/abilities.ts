import type { AbilityKey } from "@/types";

export const ABILITIES: { key: AbilityKey; name: string; short: string; description: string }[] = [
  { key: "str", name: "Strength", short: "STR", description: "Melee power, Athletics, carrying, and raw force." },
  { key: "dex", name: "Dexterity", short: "DEX", description: "Armor Class, initiative, agile attacks, stealth, and balance." },
  { key: "con", name: "Constitution", short: "CON", description: "Hit Points, Grit, endurance, and resisting physical strain." },
  { key: "int", name: "Intelligence", short: "INT", description: "Investigation, history, blood lore, religion, and eldritch knowledge." },
  { key: "wis", name: "Wisdom", short: "WIS", description: "Perception, insight, survival, medicine, and sanity." },
  { key: "cha", name: "Charisma", short: "CHA", description: "Persuasion, deception, intimidation, and commanding presence." },
];

export const ABILITY_NAME: Record<AbilityKey, string> = Object.fromEntries(
  ABILITIES.map((ability) => [ability.key, ability.name]),
) as Record<AbilityKey, string>;

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const MADUHAUSU_BUDGET = 57;
export const MADUHAUSU_MIN = 3;
export const MADUHAUSU_MAX = 16;
export const MADUHAUSU_FINAL_MAX = 17;
export const MADUHAUSU_COST: Record<number, [number, number, number | null]> = {
  3: [0, 0, 0], 4: [1, 1, 1], 5: [2, 2, 2], 6: [3, 3, 3],
  7: [4, 4, 4], 8: [5, 5, 5], 9: [6, 6, 6], 10: [7, 7, 7],
  11: [8, 8, 8], 12: [9, 9, 9], 13: [10, 10, 10], 14: [12, 14, 17],
  15: [14, 18, 23], 16: [20, 26, null],
};

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
  return mod >= 0 ? `+${mod}` : String(mod);
}
