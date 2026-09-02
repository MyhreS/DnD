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

/** The 14 Battle Master maneuvers, transcribed from the subclass's own
 * "Maneuver Options" text (core-rulebook.txt [page 52]). A Battle Master
 * learns three at Hunter Brute level 3 and two more at levels 7, 10 and 15 —
 * nine picks in all, each recorded in its own upgrade row. */
export const MANEUVERS: ReadonlyArray<{ name: string; text: string }> = [
  { name: "Bait and Switch", text: "When you're within 5 feet of a creature on your turn, you can expend one Superiority Die and switch places with that creature, provided you spend at least 5 feet of movement and the creature is willing and doesn't have the Incapacitated condition. This movement doesn't provoke Opportunity Attacks. Roll the Superiority Die. Until the start of your next turn, you or the other creature (your choice) gains a bonus to AC equal to the number rolled." },
  { name: "Disarming Attack", text: "When you hit a creature with an attack roll, you can expend one Superiority Die to attempt to disarm the target. Add the Superiority Die roll to the attack's damage roll. The target must succeed on a Strength saving throw or drop one object of your choice that it's holding, with the object landing in its space." },
  { name: "Distracting Strike", text: "When you hit a creature with an attack roll, you can expend one Superiority Die to distract the target. Add the Superiority Die roll to the attack's damage roll. The next attack roll against the target by an attacker other than you has Advantage if the attack is made before the start of your next turn." },
  { name: "Evasive Footwork", text: "As a Bonus Action, you can expend one Superiority Die and take the Disengage action. You also roll the die and add the number rolled to your AC until the start of your next turn." },
  { name: "Feinting Attack", text: "As a Bonus Action, you can expend one Superiority Die to feint, choosing one creature within 5 feet of yourself as your target. You have Advantage on your next attack roll against that target this turn. If that attack hits, add the Superiority Die to the attack's damage roll." },
  { name: "Goading Attack", text: "When you hit a creature with an attack roll, you can expend one Superiority Die to attempt to goad the target into attacking you. Add the Superiority Die to the attack's damage roll. The target must succeed on a Wisdom saving throw or have Disadvantage on attack rolls against targets other than you until the end of your next turn." },
  { name: "Lunging Attack", text: "As a Bonus Action, you can expend one Superiority Die and take the Dash action. If you move at least 5 feet in a straight line immediately before hitting with a melee attack as part of the Attack action on this turn, you can add the Superiority Die to the attack's damage roll." },
  { name: "Maneuvering Attack", text: "When you hit a creature with an attack roll, you can expend one Superiority Die to maneuver one of your comrades into another position. Add the Superiority Die roll to the attack's damage roll, and choose a willing creature who can see or hear you. That creature can use its Reaction to move up to half its Speed without provoking an Opportunity Attack from the target of your attack." },
  { name: "Menacing Attack", text: "When you hit a creature with an attack roll, you can expend one Superiority Die to attempt to frighten the target. Add the Superiority Die to the attack's damage roll. The target must succeed on a Wisdom saving throw or have the Frightened condition until the end of your next turn." },
  { name: "Precision Attack", text: "When you miss with an attack roll, you can expend one Superiority Die, roll that die, and add it to the attack roll, potentially causing the attack to hit." },
  { name: "Pushing Attack", text: "When you hit a creature with an attack roll using a weapon or an Unarmed Strike, you can expend one Superiority Die to attempt to drive the target back. Add the Superiority Die to the attack's damage roll. If the target is Large or smaller, it must succeed on a Strength saving throw or be pushed up to 15 feet directly away from you." },
  { name: "Riposte", text: "When a creature misses you with a melee attack roll, you can take a Reaction and expend one Superiority Die to make a melee attack roll with a weapon or an Unarmed Strike against the creature. If you hit, add the Superiority Die to the attack's damage." },
  { name: "Sweeping Attack", text: "When you hit a creature with a melee attack roll using a weapon or an Unarmed Strike, you can expend one Superiority Die to attempt to damage another creature. Choose another creature within 5 feet of the original target and within your reach. If the original attack roll would hit the second creature, it takes damage equal to the number you roll on your Superiority Die. The damage is of the same type dealt by the original attack." },
  { name: "Trip Attack", text: "When you hit a creature with an attack roll using a weapon or an Unarmed Strike, you can expend one Superiority Die and add the die to the attack's damage roll. If the target is Large or smaller, it must succeed on a Strength saving throw or have the Prone condition." },
];

/** How many maneuvers a Battle Master learns on reaching each level. */
export const MANEUVER_LEVELS: ReadonlyArray<{ level: number; count: number }> = [
  { level: 3, count: 3 },
  { level: 7, count: 2 },
  { level: 10, count: 2 },
  { level: 15, count: 2 },
];

/** Upgrade-row key prefix for a maneuver slot, e.g. `7:maneuver:2`. */
export const MANEUVER_KEY = "maneuver";
