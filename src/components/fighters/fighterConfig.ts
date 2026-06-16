// Config for the 3D fighter overlay. Everything that depends on the *model* is
// here so swapping the character is a one-file change.
//
// SWAPPING IN A REAL MIXAMO WARRIOR
// ---------------------------------
// The committed default (`/models/fighter.glb`) is three.js' RobotExpressive —
// directly downloadable, guaranteed to load, and ships with combat-ish clips
// (Punch/Walking/Idle/Wave) so the "fighting" is real and verifiable. To use a
// badass realistic fighter instead:
//   1. On mixamo.com (free Adobe login), pick a character, then add a few
//      animations: an idle, a walk/run, a sword/weapon attack, and a cheer.
//   2. Download each as glTF (or download the character once + animations as
//      FBX and merge in Blender), exporting ONE `.glb` that contains the mesh +
//      all the clips.
//   3. Drop it at `public/models/fighter.glb` (or change `url` below).
//   4. Update `clips` to match the clip names in your file, and tune
//      `scale` / `yOffset` so the fighter stands at a good size. That's it.

export interface FighterClips {
  /** Looping resting pose. */
  idle: string;
  /** Looping locomotion clip, used while moving across the screen. */
  walk: string;
  /** The weapon swing / attack — played on repeat during the fight beat. */
  attack: string;
  /** A flourish (wave / cheer / taunt) played as a finisher. */
  cheer: string;
}

export interface FighterConfig {
  url: string;
  clips: FighterClips;
  /** Uniform model scale. */
  scale: number;
  /** Vertical offset so the feet land on the camera's "floor" line. */
  yOffset: number;
}

export const FIGHTER: FighterConfig = {
  url: "/models/fighter.glb",
  clips: { idle: "Idle", walk: "Walking", attack: "Punch", cheer: "Wave" },
  // Model is ~4.8 units tall (feet at local y≈0). Centred low in a portrait
  // viewport so the fighter stands in the lower part of the screen.
  scale: 0.8,
  yOffset: -2.6,
};

// Burst-then-rest timing. The user wants a short show now and then — NOT a
// canvas running the whole time. A show plays its choreography (~25s) and the
// whole WebGL canvas is then torn down for a long, quiet rest (zero GPU cost)
// before the next one.
export const SHOW = {
  /** Let first paint settle before the very first show. */
  firstDelayMs: 9_000,
  /** Quiet gap between shows (randomised in this range). */
  restMinMs: 9 * 60_000,
  restMaxMs: 12 * 60_000,
  /** Safety cap: end the show even if choreography never signals done. */
  maxMs: 90_000,
};
