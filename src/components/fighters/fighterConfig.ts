// The 3D fighters that occasionally perform a "show". Each is a rigged KayKit
// character (CC0 — see public/models/CREDITS.md) carrying a full animation set.
//
// Fighters are matched to the six hunter classes (see CLASS_FIGHTER): the
// fighter that walks on screen reflects a party member's class, labelled with
// their name. Several classes reuse the same model with a *different* weapon
// loadout — KayKit embeds every weapon variant as a mesh node, so each fighter
// lists the equipment nodes to `hide`, leaving just its own loadout (e.g. the
// Brute shows the knight's greatsword while the Warden shows sword + shield).
//
// The models are generic light-fantasy adventurers; the dark, Bloodborne look
// of the *hunters* comes from the scene (moody rim lighting, gritted materials,
// ground mist, sparks) — keyed off each class's `theme` colour. See Stage.tsx.

export interface FighterTheme {
  /** Strong coloured back/rim light — the class "glow" on the silhouette. */
  rim: string;
  /** Accent for sparks, ground mist and the subtle material undertone. */
  accent: string;
}

/** Fire a spark burst at a world position, tinted `color` (a clash/swing hit). */
export type Impact = (x: number, y: number, color: string) => void;

export interface FighterClips {
  /** Looping locomotion (slower stroll, used on the walk-off). */
  walk: string;
  /** Looping run, used to charge on stage. */
  run: string;
  /** Looping neutral stance. */
  idle: string;
  /** A loopable guard stance / brace. */
  block: string;
  /** A one-shot flinch when struck. */
  hit: string;
  /** A one-shot evasive hop. */
  dodge: string;
  /** A one-shot dramatic fall (ends lying down). */
  death: string;
  /** A one-shot recovery back to standing. */
  standUp: string;
  /** Weapon swings — one is picked at random for each strike of a flurry. */
  attack: string[];
  /** A flourish played as a finisher / victory. */
  cheer: string;
}

export interface FighterConfig {
  /** Display name (only used in dev tooling / logs). */
  id: string;
  url: string;
  clips: FighterClips;
  theme: FighterTheme;
  /** Uniform model scale. */
  scale: number;
  /** Vertical offset so the feet land low in the portrait viewport. */
  yOffset: number;
  /** Equipment mesh nodes to hide so only this fighter's loadout shows. */
  hide: string[];
}

// All share the same rig/scale; only model, loadout, attack flavour + theme
// differ. yOffset is a small vertical nudge on top of the auto ground placement.
const SCALE = 1.7;
const Y_OFFSET = 0;

// Shared clip vocabulary — every KayKit Adventurer GLB carries the same 76-clip
// set, so these names resolve on all models.
const COMMON = {
  walk: "Walking_A",
  run: "Running_A",
  idle: "Idle",
  block: "Block",
  hit: "Hit_A",
  dodge: "Dodge_Backward",
  death: "Death_A",
  standUp: "Lie_StandUp",
  cheer: "Cheer",
} as const;

const clips = (attack: string[]): FighterClips => ({ ...COMMON, attack });

const ATTACKS = {
  oneHand: ["1H_Melee_Attack_Chop", "1H_Melee_Attack_Slice_Diagonal", "1H_Melee_Attack_Stab"],
  twoHand: ["2H_Melee_Attack_Chop", "2H_Melee_Attack_Slice", "2H_Melee_Attack_Spin", "2H_Melee_Attack_Stab"],
  dualWield: ["Dualwield_Melee_Attack_Chop", "Dualwield_Melee_Attack_Slice", "Dualwield_Melee_Attack_Stab"],
  ranged: ["2H_Ranged_Shoot", "2H_Ranged_Shooting"],
  spell: ["Spellcast_Shoot", "Spellcasting", "Spellcast_Long"],
};

// Equipment node names per model (KayKit embeds them all; we hide the rest).
const KNIGHT_KIT = ["1H_Sword_Offhand", "Badge_Shield", "Rectangle_Shield", "Round_Shield", "Spike_Shield", "1H_Sword", "2H_Sword"];
const BARB_KIT = ["1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe", "Mug"];
const MAGE_KIT = ["1H_Wand", "2H_Staff", "Spellbook", "Spellbook_open"];
const ROGUE_KIT = ["Knife_Offhand", "1H_Crossbow", "2H_Crossbow", "Knife", "Throwable"];
const keepOnly = (kit: string[], keep: string[]) => kit.filter((n) => !keep.includes(n));

/** One fighter per hunter class. Different players of the same class share it. */
export const CLASS_FIGHTER: Record<string, FighterConfig> = {
  // Wall of muscle in heavy plate with a greatsword — ember of stubborn rage.
  brute: {
    id: "brute",
    url: "/models/knight.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    theme: { rim: "#ff7a3c", accent: "#ff9a4d" },
    clips: clips(ATTACKS.twoHand),
    hide: keepOnly(KNIGHT_KIT, ["2H_Sword"]),
  },
  // Eyes of the hunt, finger on the trigger — cold moonlit marksman.
  scout: {
    id: "scout",
    url: "/models/rogue.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    theme: { rim: "#52d6e6", accent: "#7fe6f2" },
    clips: clips(ATTACKS.ranged),
    hide: keepOnly(ROGUE_KIT, ["2H_Crossbow"]),
  },
  // A whisper, a glint, a slit throat — hooded, venom-green dual daggers.
  stalker: {
    id: "stalker",
    url: "/models/rogue_hooded.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    theme: { rim: "#74e36a", accent: "#9bf08f" },
    clips: clips(ATTACKS.dualWield),
    hide: keepOnly(ROGUE_KIT, ["Knife", "Knife_Offhand"]),
  },
  // Knowledge man was not meant to hold — eldritch violet staff caster.
  deepcaller: {
    id: "deepcaller",
    url: "/models/mage.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    theme: { rim: "#9d6bff", accent: "#b78cff" },
    clips: clips(ATTACKS.spell),
    hide: keepOnly(MAGE_KIT, ["2H_Staff"]),
  },
  // The hunt sings in their veins — blood-fury greataxe.
  bloodbound: {
    id: "bloodbound",
    url: "/models/barbarian.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    theme: { rim: "#ff3344", accent: "#ff5a66" },
    clips: clips(ATTACKS.twoHand),
    hide: keepOnly(BARB_KIT, ["2H_Axe"]),
  },
  // The lantern others follow — gold sword-and-shield protector.
  warden: {
    id: "warden",
    url: "/models/knight.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    theme: { rim: "#ffd27a", accent: "#ffe0a0" },
    clips: clips(ATTACKS.oneHand),
    hide: keepOnly(KNIGHT_KIT, ["1H_Sword", "Round_Shield"]),
  },
};

export const FIGHTERS: FighterConfig[] = Object.values(CLASS_FIGHTER);

const randomOf = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** The fighter for a class id, or a random one when the class is unknown. */
export function fighterForClass(classId: string | undefined): FighterConfig {
  return (classId && CLASS_FIGHTER[classId]) || randomOf(FIGHTERS);
}

/** A random fighter — used to fill a nameless slot (empty / short party). */
export const randomFighter = (): FighterConfig => randomOf(FIGHTERS);

// Burst-then-rest timing. A show plays its choreography and the whole WebGL
// canvas is then torn down for a quiet rest (zero GPU cost) before the next one.
export const SHOW = {
  /** Let first paint settle before the very first show. */
  firstDelayMs: 6_000,
  /** Quiet gap between shows (randomised in this range) — roughly 1–2 minutes. */
  restMinMs: 60_000,
  restMaxMs: 130_000,
  /** Safety cap: end the show even if choreography never signals done. */
  maxMs: 60_000,
  /** Probability a given show is a two-fighter duel (vs. a solo hero show). */
  duelChance: 0.5,
};
