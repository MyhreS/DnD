import type { AbilityKey } from "@/types";

export const ABILITY_NAME: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

/** D&D-standard ability modifier; matches the handbook's table. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
