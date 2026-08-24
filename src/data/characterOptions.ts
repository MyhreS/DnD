import { CURRENT_RITES, CURRENT_WHISPERS, type CurrentRite, type CurrentWhisper } from "./codex";

/** Established character-builder choices. These remain part of the Hunter
 * workflow; source-specific Deepcaller choices below come from master.json. */
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

export type ToolProficiency = typeof TOOL_PROFICIENCIES[number];

export const TOOL_DETAILS: Record<ToolProficiency, { ability: string; description: string }> = {
  "Alchemist's Supplies": { ability: "Intelligence", description: "Identify a substance (DC 15), or expend the supplies to craft Acid or Oil during a rest." },
  "Blood-drainer's Tools": { ability: "Constitution", description: "Identify a Bloodvial's purity (DC 10), or drain an eligible creature to obtain Bloodvials. A creature can be drained only once." },
  "Brewer's Supplies": { ability: "Intelligence", description: "Brewing vessels and ingredients used to prepare, inspect, and work with drinks and other brewed mixtures." },
  "Carpenter's Tools": { ability: "Strength", description: "Seal or pry open a door or container (DC 20), or expend the tools to craft useful wooden equipment during a rest." },
  "Cultist's Tools": { ability: "Intelligence", description: "Chisel a symbol or hole in stone (DC 10), or expend the tools to craft a Block and Tackle during a rest." },
  "Mason's Tools": { ability: "Strength", description: "Shape, repair, and examine stonework, including walls, structures, and worked-stone surfaces." },
  "Navigator's Tools": { ability: "Wisdom", description: "Plot a course (DC 10), or determine your position by stargazing (DC 15)." },
  "Poisoner's Kit": { ability: "Intelligence", description: "Detect a poisoned object or drink (DC 10), or expend the kit to craft Basic Poison or Antitoxin during a rest." },
  "Smith's Tools": { ability: "Dexterity", description: "Work metal and expend the tools to craft weapons, lanterns, traps, locks, and other metal equipment during a rest." },
  "Thieves' Tools": { ability: "Dexterity", description: "Pick a lock (DC 15), or disarm a trap (DC 15)." },
  "Tinker's Tools": { ability: "Dexterity", description: "Repair, adjust, and assemble small mechanisms and other intricate pieces of equipment." },
};

export const WHISPERS = CURRENT_WHISPERS.map(({ id, name }) => ({ id, name }));

/** Compact player-facing reference projected from the current Deepcaller and
 * Whispers records. The source text is authored once in resources/master.json. */
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

const DAMAGE_PATTERN = /(\d+d\d+|\d+)\s+(Eldritch Power|Fire|Lightning|Cold|Acid|Bludgeoning|Mind)\s+damage/gi;

function damageDetails(entry: CurrentRite | CurrentWhisper): Pick<DeepcallerReference, "damage" | "damageType"> {
  if (entry.id === "eldritch-strike") {
    return { damage: "Weapon damage", damageType: "Weapon's normal type or Eldritch Power" };
  }
  const matches = [...entry.text.matchAll(DAMAGE_PATTERN)];
  if (matches.length === 0) return { damage: "—", damageType: "—" };
  const rolls = [...new Set(matches.map((match) => match[1]))];
  const types = [...new Set(matches.map((match) => match[2]))];
  return { damage: rolls.join(" · "), damageType: types.join(" / ") };
}

function toReference(entry: CurrentRite | CurrentWhisper, kind: "Whisper" | "Rite"): DeepcallerReference {
  return {
    id: entry.id,
    name: entry.name,
    level: entry.level,
    kind,
    school: entry.type.replace(/\s+Rite$/i, ""),
    performing: entry.performing,
    range: entry.range,
    duration: entry.duration,
    ...damageDetails(entry),
  };
}

export const DEEPCALLER_WHISPERS: readonly DeepcallerReference[] = CURRENT_WHISPERS.map((entry) => toReference(entry, "Whisper"));
export const DEEPCALLER_RITES: readonly DeepcallerReference[] = CURRENT_RITES.map((entry) => toReference(entry, "Rite"));

/** Applies the published Whisper upgrades to the table-facing damage readout. */
export function whisperDamageAtLevel(whisper: DeepcallerReference, characterLevel: number): string {
  if (whisper.id === "eldritch-blast") return `${characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1} × 1d10`;
  if (whisper.id === "eldritch-lightning" || whisper.id === "mindcrack") return `${characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1}d6`;
  if (whisper.id === "eldritch-strike") return characterLevel >= 17 ? "Weapon + 3d6" : characterLevel >= 11 ? "Weapon + 2d6" : characterLevel >= 5 ? "Weapon + 1d6" : "Weapon damage";
  return whisper.damage;
}
