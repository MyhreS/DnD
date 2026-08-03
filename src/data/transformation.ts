// Transformation results — resources/pdf/appendices/"Transformation Table
// Final Version.pdf" (the full d20 table lives in resources/master.json →
// `transformation`; the app deliberately does NOT roll it).
//
// A hunter's Transformation Level runs 0–10. When you GAIN a level you first
// increase the level, then roll 1d20 on the table using the NEW level — the
// roll happens PHYSICALLY at the table, and the DM records the level and any
// persistent result on the hunter card. Not every result is a Transformation:
// "Nothing Happens" is nothing, "Blood Lust" is a compulsion, and "Lost" is a
// catastrophic result whose meaning is a DM secret — the app must never
// explain it.

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
