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

/** Established app calculation. The replacement source set names Modifier
 * fields but does not define a modifier formula. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod);
}
