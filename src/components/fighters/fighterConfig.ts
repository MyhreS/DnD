// The roster of 3D fighters that occasionally perform a "show". Each entry is a
// rigged KayKit character (CC0 — see public/models/CREDITS.md) carrying a full
// animation set. KayKit characters embed *every* weapon variant as a mesh node,
// so each fighter lists the equipment nodes to `hide` — leaving just its own
// loadout (e.g. the knight keeps its sword + round shield, hides the rest).

export interface FighterClips {
  /** Looping resting pose. */
  idle: string;
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

// All four share the same rig/scale; only loadout + attack flavour differ.
// yOffset is a small vertical nudge on top of the auto ground placement.
const SCALE = 0.55;
const Y_OFFSET = 0;

export const FIGHTERS: FighterConfig[] = [
  {
    id: "knight",
    url: "/models/knight.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: {
      idle: "Idle",
      walk: "Walking_A",
      cheer: "Cheer",
      attack: ["1H_Melee_Attack_Chop", "1H_Melee_Attack_Slice_Diagonal", "1H_Melee_Attack_Stab"],
    },
    hide: ["1H_Sword_Offhand", "Badge_Shield", "Rectangle_Shield", "Spike_Shield", "2H_Sword"],
  },
  {
    id: "barbarian",
    url: "/models/barbarian.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: {
      idle: "2H_Melee_Idle",
      walk: "Walking_A",
      cheer: "Cheer",
      attack: ["2H_Melee_Attack_Chop", "2H_Melee_Attack_Slice", "2H_Melee_Attack_Spin", "2H_Melee_Attack_Stab"],
    },
    hide: ["1H_Axe", "1H_Axe_Offhand", "Barbarian_Round_Shield", "Mug"],
  },
  {
    id: "mage",
    url: "/models/mage.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: {
      idle: "Idle",
      walk: "Walking_A",
      cheer: "Cheer",
      attack: ["Spellcast_Shoot", "Spellcasting", "Spellcast_Long"],
    },
    hide: ["1H_Wand", "Spellbook", "Spellbook_open"],
  },
  {
    id: "rogue",
    url: "/models/rogue.glb",
    scale: SCALE,
    yOffset: Y_OFFSET,
    clips: {
      idle: "Idle",
      walk: "Walking_A",
      cheer: "Cheer",
      attack: ["Dualwield_Melee_Attack_Chop", "Dualwield_Melee_Attack_Slice", "Dualwield_Melee_Attack_Stab"],
    },
    hide: ["1H_Crossbow", "2H_Crossbow", "Throwable"],
  },
];

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
