import { CURRENT_RITES, CURRENT_WHISPERS, type CurrentRite, type CurrentWhisper } from "./codex";

/** Established character-builder choices. These remain part of the Hunter
 * workflow. The tool roster is the beta's complete list of eight tools
 * (core-rulebook.txt [page 115]); the Deepcaller choices below are projected
 * from the generated Codex data. */
export const TOOL_PROFICIENCIES = [
  "Alchemist's Supplies",
  "Blood-drainer's Tools",
  "Carpenter's Tools",
  "Cultist's Tools",
  "Navigator's Tools",
  "Poisoner's Kit",
  "Smith's Tools",
  "Thieves' Tools",
] as const;

export type ToolProficiency = typeof TOOL_PROFICIENCIES[number];

export const TOOL_DETAILS: Record<ToolProficiency, { ability: string; description: string }> = {
  "Alchemist's Supplies": { ability: "Intelligence", description: "Identify a substance (DC 15), or expend the supplies to craft Acid or Oil during a rest." },
  "Blood-drainer's Tools": { ability: "Constitution", description: "Identify a Bloodvial's purity (DC 10), or drain an eligible creature to obtain Bloodvials. A creature can be drained only once." },
  "Carpenter's Tools": { ability: "Strength", description: "Seal or pry open a door or container (DC 20), or expend the tools to craft useful wooden equipment during a rest." },
  "Cultist's Tools": { ability: "Intelligence", description: "Chisel a symbol or hole in stone (DC 10), or expend the tools to craft a Block and Tackle during a rest." },
  "Navigator's Tools": { ability: "Wisdom", description: "Plot a course (DC 10), or determine your position by stargazing (DC 15)." },
  "Poisoner's Kit": { ability: "Intelligence", description: "Detect a poisoned object or drink (DC 10), or expend the kit to craft Basic Poison or Antitoxin during a rest." },
  "Smith's Tools": { ability: "Dexterity", description: "Work metal and expend the tools to craft weapons, lanterns, traps, locks, and other metal equipment during a rest." },
  "Thieves' Tools": { ability: "Dexterity", description: "Pick a lock (DC 15), or disarm a trap (DC 15)." },
};

export const WHISPERS = CURRENT_WHISPERS.map(({ id, name }) => ({ id, name }));

/** Compact player-facing reference projected from the current Deepcaller and
 * Whispers records. The source text is authored once in the current source
 * documents and reaches the app through `src/data/codex.generated.json`. */
export type DeepcallerReference = {
  id: string;
  name: string;
  level: number | null;
  kind: "Whisper" | "Rite";
  school: string;
  performing: string;
  range: string;
  duration: string;
  damage: string;
  damageType: string;
  upgrade: string;
  special?: string;
  section?: string;
  sourceNote?: string;
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
    level: "level" in entry ? entry.level : null,
    kind,
    school: entry.type.replace(/\s+Rite$/i, ""),
    performing: entry.performing,
    range: entry.range,
    duration: entry.duration,
    upgrade: entry.upgrade,
    special: entry.special,
    section: "section" in entry ? entry.section : undefined,
    sourceNote: "sourceNote" in entry ? entry.sourceNote : undefined,
    ...damageDetails(entry),
  };
}

export const DEEPCALLER_WHISPERS: readonly DeepcallerReference[] = CURRENT_WHISPERS.map((entry) => toReference(entry, "Whisper"));
export const DEEPCALLER_RITES: readonly DeepcallerReference[] = CURRENT_RITES.map((entry) => toReference(entry, "Rite"));

/** Carved Eldritch Strike and Carved Armor of The Drowned Star — a Hunter
 * Zealot always has both prepared and neither counts against the number of
 * Whispers they can prepare (core-rulebook.txt [pages 76–77]). They are granted
 * rather than stored, so no saved selection is consumed. */
export const ALWAYS_PREPARED_ZEALOT_IDS: readonly string[] = ["eldritch-strike", "armor-of-the-drowned-star"];

/** Read the effective Rite level carried by a Forbidden Revelation upgrade
 * key such as `11:Forbidden Revelation (Level 6 Rite)`. */
export function forbiddenRevelationLevel(value: string): number | null {
  const level = Number(value.match(/Forbidden Revelation\s*\(Level\s+(\d+)\s+Rite\)/i)?.[1]);
  return level >= 6 && level <= 9 ? level : null;
}

/** The class rule permits either a Rite of the Revelation's own level or a
 * Level 1-5 Rite that explicitly offers a Higher-Level Strain option. */
export function forbiddenRevelationOptions(level: number): readonly DeepcallerReference[] {
  if (level < 6 || level > 9) return [];
  return DEEPCALLER_RITES.filter((rite) => rite.level === level
    || (rite.level != null && rite.level <= 5 && rite.upgrade.trim().length > 0));
}

/** Applies the published Whisper upgrades to the table-facing damage readout. */
export function whisperDamageAtLevel(whisper: DeepcallerReference, characterLevel: number): string {
  if (whisper.id === "eldritch-blast") return `${characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1} × 1d10`;
  if (whisper.id === "eldritch-lightning" || whisper.id === "mindcrack") return `${characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1}d6`;
  if (whisper.id === "eldritch-strike") return characterLevel >= 17 ? "Weapon + 3d6" : characterLevel >= 11 ? "Weapon + 2d6" : characterLevel >= 5 ? "Weapon + 1d6" : "Weapon damage";
  return whisper.damage;
}

/** Apply only the higher-Strain damage changes explicitly printed in the
 * current Book of the Deepcaller. Non-damage upgrades remain in `upgrade` and
 * are shown verbatim beside the compact readout. */
export function riteDamageAtStrain(rite: DeepcallerReference, strainLevel: number): string {
  const strain = Math.max(rite.level ?? 0, Math.floor(strainLevel));
  switch (rite.id) {
    case "eldritch-rebuke": return `${strain + 1}d10`;
    case "eldritch-chain-of-bolts": return `${strain + 1}d12 initial · 1d12 ongoing`;
    case "armor-of-the-drowned-star": return String(strain * 5);
    case "mindgrab": return `${strain + 1}d8`;
    case "eldritch-cacophony": return `${8 + Math.max(0, strain - 5) * 2}d6`;
    case "arms-of-hastur": return `${strain + 1}d6`;
    case "grasp-of-yog-sothoth": return `${strain}d6`;
    default: return rite.damage;
  }
}
