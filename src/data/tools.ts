// Tool proficiencies a hunter can pick when a feat grants a free choice of
// "skills or tools" (the Skilled origin feat). Union of the handbook's Tools
// chapter (Artisan's Tools + Other Tools) and the tools granted by backgrounds.
export const TOOL_PROFICIENCIES: string[] = [
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
];

/** The one origin feat whose benefit is a player choice: proficiency in any
 * combination of three skills or tools. The builder shows a picker for it. */
export const SKILLED_FEAT = "Skilled";
export const SKILLED_PICKS = 3;
