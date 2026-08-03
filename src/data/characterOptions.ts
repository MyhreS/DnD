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
