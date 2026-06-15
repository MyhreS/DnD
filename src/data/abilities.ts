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

/** D&D-standard ability modifier; matches the handbook's table. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

