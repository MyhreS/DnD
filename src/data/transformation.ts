// The Transformation Table — resources/pdf/appendices/"Transformation Table
// Final Version.pdf" (mirrored in resources/master.json → `transformation`).
//
// A hunter's Transformation Level runs 0–10. When you GAIN a level you first
// increase the level, then roll 1d20 on the table using the NEW level. Not
// every result is a Transformation: "Nothing Happens" is nothing, "Blood Lust"
// is a compulsion, and "Lost" is a catastrophic result whose meaning is a DM
// secret — the app must never explain it.

export type TransformationKind = "none" | "compulsion" | "transformation" | "catastrophic";

export interface TransformationResult {
  key: string;
  name: string;
  kind: TransformationKind;
  /** Counts as an active Transformation (remains until a rule removes it). */
  isTransformation: boolean;
  /** Player-facing text. For "Lost" this stays deliberately unexplained. */
  text: string;
}

export const TRANSFORMATION_RESULTS: Record<string, TransformationResult> = {
  nothing: {
    key: "nothing",
    name: "Nothing Happens",
    kind: "none",
    isTransformation: false,
    text: "Your blood stirs… and settles. Nothing happens.",
  },
  bloodLust: {
    key: "bloodLust",
    name: "Blood Lust",
    kind: "compulsion",
    isTransformation: false,
    text: "Drink another Blood Vial or suffer 3 Madness.",
  },
  mutatedArm: {
    key: "mutatedArm",
    name: "Mutated Arm",
    kind: "transformation",
    isTransformation: true,
    text: "Suffer 2 Madness. Add +1d12 to your damage roll and 5 ft to your range if melee damage. Suffer 1 Madness if you do.",
  },
  bloodFangs: {
    key: "bloodFangs",
    name: "Blood Fangs",
    kind: "transformation",
    isTransformation: true,
    text: "As a melee attack action you can bite a creature within 5 ft, on hit dealing 4d3 piercing damage. You heal the same amount as damage dealt. Suffer 1 Madness if you do.",
  },
  dreadbloodEyes: {
    key: "dreadbloodEyes",
    name: "Dreadblood Eyes",
    kind: "transformation",
    isTransformation: true,
    text: "As an action you can gain Blindsight for 10 rounds. Suffer 1 Madness if you do.",
  },
  dreadbloodEars: {
    key: "dreadbloodEars",
    name: "Dreadblood Ears",
    kind: "transformation",
    isTransformation: true,
    text: "Your Wisdom (Perception) modifier increases by +5. You may suffer 1 Madness to make a Wisdom (Perception) check with Advantage.",
  },
  lost: {
    key: "lost",
    name: "Lost",
    kind: "catastrophic",
    isTransformation: true,
    // What "Lost" implies is a table secret — never spell it out in the app.
    text: "Something in your blood gives way. Tell your DM — they know what happens now.",
  },
};

// Rows: d20 roll (1–20) → result key per Transformation Level 1–10.
const NH = "nothing";
const BL = "bloodLust";
const MA = "mutatedArm";
const BF = "bloodFangs";
const DE = "dreadbloodEyes";
const DR = "dreadbloodEars";
const LO = "lost";

export const TRANSFORMATION_TABLE: Record<number, string[]> = {
  1: [BL, BL, LO, LO, LO, LO, LO, LO, LO, LO],
  2: [MA, BL, BL, LO, LO, LO, LO, LO, LO, LO],
  3: [BF, MA, BL, BL, LO, LO, LO, LO, LO, LO],
  4: [DE, BF, BL, BL, BL, LO, LO, LO, LO, LO],
  5: [DR, DE, MA, BL, BL, BL, LO, LO, LO, LO],
  6: [NH, DE, MA, BL, BL, BL, BL, LO, LO, LO],
  7: [NH, DR, BF, MA, BL, BL, BL, BL, LO, LO],
  8: [NH, DR, BF, MA, MA, BL, BL, BL, LO, LO],
  9: [NH, NH, DE, BF, MA, MA, BL, BL, BL, LO],
  10: [NH, NH, DE, BF, MA, MA, MA, MA, MA, MA],
  11: [NH, NH, DR, DE, BF, MA, MA, MA, MA, MA],
  12: [NH, NH, DR, DE, BF, MA, MA, MA, MA, MA],
  13: [NH, NH, NH, DR, BF, BF, MA, MA, MA, MA],
  14: [NH, NH, NH, DR, DE, BF, MA, MA, MA, MA],
  15: [NH, NH, NH, NH, DE, BF, BF, BF, BF, BF],
  16: [NH, NH, NH, NH, DR, DE, BF, BF, BF, BF],
  17: [NH, NH, NH, NH, DR, DE, BF, BF, BF, BF],
  18: [NH, NH, NH, NH, NH, DR, BF, BF, BF, BF],
  19: [NH, NH, NH, NH, NH, DR, DE, DE, DE, DE],
  20: [NH, NH, NH, NH, NH, NH, DR, DR, DR, DR],
};

/** Look up the table: a d20 roll against a Transformation Level (1–10). */
export function transformationResult(roll: number, level: number): TransformationResult {
  const row = TRANSFORMATION_TABLE[Math.max(1, Math.min(20, Math.round(roll)))];
  const col = Math.max(1, Math.min(10, Math.round(level))) - 1;
  return TRANSFORMATION_RESULTS[row[col]];
}

/** Gain a Transformation Level: roll 1d20 against the NEW level. Runtime-only. */
export function rollTransformation(newLevel: number): {
  roll: number;
  result: TransformationResult;
} {
  const roll = Math.floor(Math.random() * 20) + 1;
  return { roll, result: transformationResult(roll, newLevel) };
}
