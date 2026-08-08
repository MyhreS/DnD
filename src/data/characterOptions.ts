/** Finite character choices transcribed from master.json. The app deliberately
 * keeps uncertain/free-form feature choices out of dropdowns instead of
 * pretending the source defines options that it does not. */
export const TOOL_PROFICIENCIES = [
  "Alchemist's Supplies",
  "Blood-drainer's Tools",
  "Brewer's Supplies",
  "Carpenter's Tools",
  "Cultist's Tools",
  "Mason's Tools",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Smith's Tools",
  "Thieves' Tools",
  "Tinker's Tools",
] as const;

export const WHISPERS = [
  { id: "eldritch-blast", name: "Eldritch Blast" },
  { id: "eldritch-lightning", name: "Eldritch Lightning" },
  { id: "eldritch-strike", name: "Eldritch Strike" },
  { id: "mindcrack", name: "Mindcrack" },
  { id: "minor-illusion", name: "Minor Illusion" },
  { id: "third-hand", name: "Third Hand" },
] as const;

/** Compact, player-facing reference data from the Deepcaller rite boards.
 * The complete wording remains searchable in the Codex; this gives the
 * character overview the information needed at the table without loading the
 * full Codex data bundle into the character editor. */
export type DeepcallerReference = {
  id: string;
  name: string;
  level: number;
  kind: "Whisper" | "Rite";
  school: string;
  performing: string;
  range: string;
  duration: string;
  damage: string;
  damageType: string;
};

export const DEEPCALLER_WHISPERS: readonly DeepcallerReference[] = [
  { id: "eldritch-blast", name: "Eldritch Blast", level: 0, kind: "Whisper", school: "Evocation", performing: "Action", range: "120 feet", duration: "Instantaneous", damage: "1d10 per beam", damageType: "Eldritch Power" },
  { id: "eldritch-lightning", name: "Eldritch Lightning", level: 0, kind: "Whisper", school: "Evocation", performing: "Action", range: "Self", duration: "Instantaneous", damage: "1d6", damageType: "Lightning" },
  { id: "eldritch-strike", name: "Eldritch Strike", level: 0, kind: "Whisper", school: "Evocation", performing: "Action", range: "Self", duration: "Instantaneous", damage: "Weapon damage", damageType: "Weapon's normal type or Eldritch Power" },
  { id: "mindcrack", name: "Mindcrack", level: 0, kind: "Whisper", school: "Mind Influence", performing: "Action", range: "60 feet", duration: "1 round", damage: "1d6", damageType: "Mind" },
  { id: "minor-illusion", name: "Minor Illusion", level: 0, kind: "Whisper", school: "Illusion", performing: "Action", range: "30 feet", duration: "10 rounds", damage: "—", damageType: "—" },
  { id: "third-hand", name: "Third Hand", level: 0, kind: "Whisper", school: "Summoning", performing: "Action", range: "30 feet", duration: "Concentration, 10 rounds", damage: "—", damageType: "—" },
];

export const DEEPCALLER_RITES: readonly DeepcallerReference[] = [
  { id: "detect-eldritch-presence", name: "Detect Eldritch Presence", level: 1, kind: "Rite", school: "Detection", performing: "Action", range: "Self", duration: "Concentration, up to 20 rounds", damage: "—", damageType: "—" },
  { id: "eldritch-eye", name: "Eldritch Eye", level: 1, kind: "Rite", school: "Detection", performing: "Three Actions", range: "Self", duration: "Concentration, up to 20 rounds", damage: "—", damageType: "—" },
  { id: "eldritch-rebuke", name: "Eldritch Rebuke", level: 1, kind: "Rite", school: "Evocation", performing: "Reaction", range: "60 feet", duration: "Instantaneous", damage: "2d10", damageType: "Fire" },
  { id: "eldritch-chain-of-bolts", name: "Eldritch Chain of Bolts", level: 1, kind: "Rite", school: "Evocation", performing: "Action", range: "60 feet", duration: "Concentration, up to 10 rounds", damage: "2d12 initial · 1d12 each turn", damageType: "Lightning" },
  { id: "armor-of-agathys", name: "Armor of the Drowned Star", level: 1, kind: "Rite", school: "Protection", performing: "Bonus Action", range: "Self", duration: "20 rounds", damage: "5 on melee hit", damageType: "Cold" },
  { id: "arms-of-hadar", name: "Arms of Haster", level: 1, kind: "Rite", school: "Summoning", performing: "Action", range: "Self", duration: "Instantaneous", damage: "2d6", damageType: "Acid" },
  { id: "darkness", name: "Darkness", level: 2, kind: "Rite", school: "Evocation", performing: "Action", range: "60 feet", duration: "Concentration, up to 20 rounds", damage: "—", damageType: "—" },
  { id: "shattered-reflection", name: "Shattered Reflection", level: 2, kind: "Rite", school: "Illusion", performing: "Action", range: "Self", duration: "10 rounds", damage: "—", damageType: "—" },
  { id: "mindgrab", name: "Mindgrab", level: 2, kind: "Rite", school: "Mind Influence", performing: "Action", range: "120 feet", duration: "Concentration", damage: "3d8", damageType: "Mind" },
  { id: "enthrall", name: "Enthrall", level: 2, kind: "Rite", school: "Mind Influence", performing: "Action", range: "60 feet", duration: "Concentration, up to 10 rounds", damage: "—", damageType: "—" },
  { id: "hadars-grasp", name: "Hadar's Grasp", level: 2, kind: "Rite", school: "Summoning", performing: "Action", range: "60 feet", duration: "Concentration, up to 10 rounds", damage: "2d6", damageType: "Bludgeoning" },
  { id: "unknown-realm", name: "Unknown Realm", level: 3, kind: "Rite", school: "Summoning", performing: "Action", range: "120 feet", duration: "Concentration, up to 10 rounds", damage: "—", damageType: "—" },
  { id: "hadars-black-tentacles", name: "Hadar's Black Tentacles", level: 4, kind: "Rite", school: "Summoning", performing: "Action", range: "90 feet", duration: "Concentration, up to 10 rounds", damage: "3d6", damageType: "Bludgeoning" },
  { id: "misty-step", name: "Misty Step", level: 4, kind: "Rite", school: "Traversal", performing: "Bonus Action", range: "Self", duration: "Instantaneous", damage: "—", damageType: "—" },
  { id: "eldritch-cacophony", name: "Eldritch Cacophony", level: 5, kind: "Rite", school: "Mind Influence", performing: "Action", range: "120 feet", duration: "Instantaneous", damage: "8d6", damageType: "Mind" },
];

/** Applies the published Whisper upgrades to the table-facing damage readout. */
export function whisperDamageAtLevel(whisper: DeepcallerReference, characterLevel: number): string {
  if (whisper.id === "eldritch-blast") return `${characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1} × 1d10`;
  if (whisper.id === "eldritch-lightning" || whisper.id === "mindcrack") return `${characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1}d6`;
  if (whisper.id === "eldritch-strike") return characterLevel >= 17 ? "Weapon + 3d6" : characterLevel >= 11 ? "Weapon + 2d6" : characterLevel >= 5 ? "Weapon + 1d6" : "Weapon damage";
  return whisper.damage;
}
