import type { AbilityKey, Skill } from "@/types";

export const SKILLS: Skill[] = [
  { name: "Athletics", ability: "str" },
  { name: "Acrobatics", ability: "dex" }, { name: "Sleight of Hand", ability: "dex" }, { name: "Stealth", ability: "dex" },
  { name: "Grit", ability: "con" },
  { name: "Eldritch Knowledge", ability: "int" }, { name: "Old World History", ability: "int" }, { name: "Investigation", ability: "int" }, { name: "Blood Nature", ability: "int" }, { name: "Religion", ability: "int" },
  { name: "Animal Handling", ability: "wis" }, { name: "Insight", ability: "wis" }, { name: "Medicine", ability: "wis" }, { name: "Perception", ability: "wis" }, { name: "Survival", ability: "wis" },
  { name: "Deception", ability: "cha" }, { name: "Intimidation", ability: "cha" }, { name: "Presence", ability: "cha" }, { name: "Persuasion", ability: "cha" },
];

export const SKILL_BY_NAME: Record<string, Skill> = Object.fromEntries(SKILLS.map((skill) => [skill.name, skill]));
export function skillAbility(name: string): AbilityKey { return SKILL_BY_NAME[name]?.ability ?? "int"; }

export const SHEET_SKILL_FIELD: Record<string, string> = {
  Athletics: "skAthletics", Acrobatics: "skAcrobatics", "Sleight of Hand": "skSleight", Stealth: "skStealth", Grit: "skGrit",
  "Eldritch Knowledge": "skEldritch", "Old World History": "skHistory", Investigation: "skInvestigation", "Blood Nature": "skBlood", Religion: "skReligion",
  "Animal Handling": "skAnimal", Insight: "skInsight", Medicine: "skMedicine", Perception: "skPerception", Survival: "skSurvival",
  Deception: "skDeception", Intimidation: "skIntimidation", Presence: "skPresence", Persuasion: "skPersuasion",
};
