import type { AbilityKey, Skill } from "@/types";

// The C&S skill list and the ability each one keys off.
// Source: Player's Handbook character sheet ("Ability and Skills").
// Note: the handbook's source spellings ("Eldrich", "Chrisma") are normalised
// here to the canonical forms used throughout the app.

export const SKILLS: Skill[] = [
  { name: "Athletics", ability: "str" },

  { name: "Acrobatics", ability: "dex" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },

  { name: "Grit", ability: "con" },

  { name: "Eldritch Knowledge", ability: "int" },
  { name: "Old World History", ability: "int" },
  { name: "Investigation", ability: "int" },
  { name: "Blood Nature", ability: "int" },
  { name: "Religion", ability: "int" },

  { name: "Animal Handling", ability: "wis" },
  { name: "Insight", ability: "wis" },
  { name: "Medicine", ability: "wis" },
  { name: "Perception", ability: "wis" },
  { name: "Survival", ability: "wis" },

  { name: "Deception", ability: "cha" },
  { name: "Intimidation", ability: "cha" },
  { name: "Presence", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
];

export const SKILL_BY_NAME: Record<string, Skill> = Object.fromEntries(
  SKILLS.map((s) => [s.name, s]),
);

/** Skills grouped by their governing ability, in ability order. */
export const SKILLS_BY_ABILITY: { ability: AbilityKey; skills: Skill[] }[] = (
  ["str", "dex", "con", "int", "wis", "cha"] as AbilityKey[]
).map((ability) => ({
  ability,
  skills: SKILLS.filter((s) => s.ability === ability),
}));

/** The ability a skill keys off (defaults to INT for unknown names). */
export function skillAbility(name: string): AbilityKey {
  return SKILL_BY_NAME[name]?.ability ?? "int";
}
