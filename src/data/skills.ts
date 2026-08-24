import type { AbilityKey, Skill } from "@/types";

export const SKILLS: Skill[] = [
  { name: "Athletics", ability: "str", description: "Climb, jump, grapple, escape physical holds, and force obstacles." },
  { name: "Acrobatics", ability: "dex", description: "Balance, tumble, land safely, and slip free through agility." },
  { name: "Sleight of Hand", ability: "dex", description: "Pick pockets, hide or plant small objects, and perform delicate tricks." },
  { name: "Stealth", ability: "dex", description: "Move quietly, stay unseen, hide, and approach without warning." },
  { name: "Grit", ability: "con", description: "Endure pain, exhaustion, blood loss, and other physical ordeals." },
  { name: "Eldritch Knowledge", ability: "int", description: "Recognize rites, patrons, unnatural forces, and cosmic threats." },
  { name: "Old World History", ability: "int", description: "Recall old places, peoples, events, customs, and lost records." },
  { name: "Investigation", ability: "int", description: "Search for clues, connect evidence, and uncover how things work." },
  { name: "Blood Nature", ability: "int", description: "Understand blood, beasts, transformations, and their unnatural traits." },
  { name: "Religion", ability: "int", description: "Recall churches, doctrines, rituals, sacred symbols, and cults." },
  { name: "Animal Handling", ability: "wis", description: "Calm, guide, read, or control animals and beasts." },
  { name: "Insight", ability: "wis", description: "Read motives, emotions, lies, and unspoken intentions." },
  { name: "Medicine", ability: "wis", description: "Diagnose wounds or illness, stabilize the dying, and provide care." },
  { name: "Perception", ability: "wis", description: "Notice hidden creatures, sounds, movement, traps, and other details." },
  { name: "Survival", ability: "wis", description: "Track, navigate, forage, predict hazards, and endure the wild." },
  { name: "Deception", ability: "cha", description: "Lie convincingly, conceal motives, disguise intent, and mislead." },
  { name: "Intimidation", ability: "cha", description: "Pressure, frighten, or coerce through threat and force of personality." },
  { name: "Presence", ability: "cha", description: "Command attention, perform, inspire, and project your personality." },
  { name: "Persuasion", ability: "cha", description: "Win trust, negotiate, make a case, and influence without threats." },
];

export const SKILL_BY_NAME: Record<string, Skill> = Object.fromEntries(SKILLS.map((skill) => [skill.name, skill]));
export function skillAbility(name: string): AbilityKey { return SKILL_BY_NAME[name]?.ability ?? "int"; }

export const SHEET_SKILL_FIELD: Record<string, string> = {
  Athletics: "skAthletics", Acrobatics: "skAcrobatics", "Sleight of Hand": "skSleight", Stealth: "skStealth", Grit: "skGrit",
  "Eldritch Knowledge": "skEldritch", "Old World History": "skHistory", Investigation: "skInvestigation", "Blood Nature": "skBlood", Religion: "skReligion",
  "Animal Handling": "skAnimal", Insight: "skInsight", Medicine: "skMedicine", Perception: "skPerception", Survival: "skSurvival",
  Deception: "skDeception", Intimidation: "skIntimidation", Presence: "skPresence", Persuasion: "skPersuasion",
};
