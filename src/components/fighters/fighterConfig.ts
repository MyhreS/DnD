// The 3D fighters that occasionally perform a "show". Each is a rigged KayKit
// character (CC0 — see public/models/CREDITS.md) carrying a full animation set.
//
// Fighters are matched to the six hunter classes (see CLASS_FIGHTER): the
// fighter that walks on screen reflects a party member's class, labelled with
// their name. Several classes reuse the same model with a *different* weapon
// loadout — KayKit embeds every weapon variant as a mesh node, so each fighter
// lists the equipment nodes to `hide`, leaving just its own loadout (e.g. the
// Brute shows the knight's greatsword while the Warden shows sword + shield).

export interface FighterClips {
  /** Looping locomotion clip, used while moving across the screen. */
  walk: string;
  /** Weapon swings — one is picked at random for each strike of the flurry. */
  attack: string[];
  /** A flourish played as a finisher. */
  cheer: string;
}

export interface FighterConfig {
  /** Display name (only used in dev tooling / logs). */
  id: string;
  url: string;
  clips: FighterClips;
  /** Uniform model scale. */
  scale: number;
  /** Vertical offset so the feet land low in the portrait viewport. */
  yOffset: number;
  /** Equipment mesh nodes to hide so only this fighter's loadout shows. */
  hide: string[];
}

// All share the same rig/scale; only model, loadout + attack flavour differ.
// yOffset is a small vertical nudge on top of the auto ground placement.
const SCALE = 0.55;
const Y_OFFSET = 0;
const WALK = "Walking_A";
const CHEER = "Cheer";

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
  // Wall of muscle in heavy plate with a greatsword.
  brute: {
    id: "brute",
    url: "/models/knight.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: { walk: WALK, cheer: CHEER, attack: ATTACKS.twoHand },
    hide: keepOnly(KNIGHT_KIT, ["2H_Sword"]),
  },
  // Eyes of the hunt, finger on the trigger — ranged crossbow.
  scout: {
    id: "scout",
    url: "/models/rogue.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: { walk: WALK, cheer: CHEER, attack: ATTACKS.ranged },
    hide: keepOnly(ROGUE_KIT, ["2H_Crossbow"]),
  },
  // A whisper, a glint, a slit throat — hooded, dual daggers.
  stalker: {
    id: "stalker",
    url: "/models/rogue_hooded.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: { walk: WALK, cheer: CHEER, attack: ATTACKS.dualWield },
    hide: keepOnly(ROGUE_KIT, ["Knife", "Knife_Offhand"]),
  },
  // Knowledge man was not meant to hold — staff spellcaster.
  deepcaller: {
    id: "deepcaller",
    url: "/models/mage.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: { walk: WALK, cheer: CHEER, attack: ATTACKS.spell },
    hide: keepOnly(MAGE_KIT, ["2H_Staff"]),
  },
  // The hunt sings in their veins — blood-fury greataxe.
  bloodbound: {
    id: "bloodbound",
    url: "/models/barbarian.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: { walk: WALK, cheer: CHEER, attack: ATTACKS.twoHand },
    hide: keepOnly(BARB_KIT, ["2H_Axe"]),
  },
  // The lantern others follow — sword and shield protector.
  warden: {
    id: "warden",
    url: "/models/knight.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: { walk: WALK, cheer: CHEER, attack: ATTACKS.oneHand },
    hide: keepOnly(KNIGHT_KIT, ["1H_Sword", "Round_Shield"]),
  },
};

export const FIGHTERS: FighterConfig[] = Object.values(CLASS_FIGHTER);

/** The fighter for a class id, or a random one when the class is unknown. */
export function fighterForClass(classId: string | undefined): FighterConfig {
  return (
    (classId && CLASS_FIGHTER[classId]) ||
    FIGHTERS[Math.floor(Math.random() * FIGHTERS.length)]
  );
}

// Burst-then-rest timing. A show plays its choreography (~25s) and the whole
// WebGL canvas is then torn down for a long, quiet rest (zero GPU cost) before
// the next one.
export const SHOW = {
  /** Let first paint settle before the very first show. */
  firstDelayMs: 9_000,
  /** Quiet gap between shows (randomised in this range). */
  restMinMs: 9 * 60_000,
  restMaxMs: 12 * 60_000,
  /** Safety cap: end the show even if choreography never signals done. */
  maxMs: 90_000,
};
