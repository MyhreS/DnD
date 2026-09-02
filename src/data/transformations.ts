/** Transformations. core-rulebook.txt [page 27] (the Transformation Table) and
 * [page 28] (Transformation Effects).
 *
 * 🔒 `lost` is deliberately left without effect text — [page 28]: "This hidden
 * effect can only be found in the Hidden Condition Sheet." Nothing from the
 * Hidden Condition Sheet may appear in this file, the Codex, or any UI. */

interface TransformationEffect {
  id: string;
  name: string;
  /** Madness suffered when the Transformation is gained ("When Gained."). */
  madnessOnGain: number;
  text: string;
}

const NOTHING = "nothingHappens";
const EARS = "dreadbloodEars";
const EYES = "dreadbloodEyes";
const SPEED = "dreadbloodSpeed";
const FANGS = "bloodFangs";
const ARM = "mutatedArm";
const LUST = "bloodLust";
const DREADLORD = "dreadlordConnection";
const LOST = "lost";

/** The d20 × Transformation Level 1–10 table, core-rulebook.txt [page 27].
 * `TRANSFORMATION_TABLE[roll - 1][level - 1]` is the rolled effect id. */
export const TRANSFORMATION_TABLE: string[][] = [
  [LUST, LUST, LOST, LOST, LOST, LOST, LOST, LOST, LOST, LOST],
  [ARM, LUST, LUST, LOST, LOST, LOST, LOST, LOST, LOST, LOST],
  [FANGS, ARM, LUST, DREADLORD, LOST, LOST, LOST, LOST, LOST, LOST],
  [EYES, FANGS, LUST, LUST, DREADLORD, LOST, LOST, LOST, LOST, LOST],
  [EARS, EYES, ARM, LUST, LUST, DREADLORD, LOST, LOST, LOST, LOST],
  [NOTHING, EYES, ARM, LUST, LUST, LUST, DREADLORD, LOST, LOST, LOST],
  [NOTHING, EARS, FANGS, LUST, LUST, LUST, LUST, DREADLORD, LOST, LOST],
  [NOTHING, EARS, FANGS, ARM, LUST, LUST, LUST, LUST, LOST, LOST],
  [NOTHING, NOTHING, EYES, ARM, ARM, LUST, LUST, LUST, LOST, LOST],
  [NOTHING, NOTHING, EYES, FANGS, ARM, ARM, ARM, ARM, DREADLORD, DREADLORD],
  [NOTHING, NOTHING, EARS, FANGS, ARM, ARM, ARM, ARM, ARM, ARM],
  [NOTHING, NOTHING, EARS, EYES, FANGS, ARM, ARM, ARM, ARM, ARM],
  [NOTHING, NOTHING, NOTHING, EYES, FANGS, ARM, ARM, ARM, ARM, ARM],
  [NOTHING, NOTHING, NOTHING, EARS, FANGS, FANGS, FANGS, FANGS, ARM, ARM],
  [NOTHING, NOTHING, NOTHING, EARS, EYES, FANGS, FANGS, FANGS, ARM, ARM],
  [NOTHING, NOTHING, NOTHING, SPEED, EYES, FANGS, FANGS, FANGS, FANGS, FANGS],
  [NOTHING, NOTHING, NOTHING, NOTHING, EARS, FANGS, FANGS, FANGS, FANGS, FANGS],
  [NOTHING, NOTHING, NOTHING, NOTHING, EARS, EYES, EYES, EYES, EYES, EYES],
  [NOTHING, NOTHING, NOTHING, NOTHING, SPEED, EARS, EARS, EARS, EARS, EARS],
  [NOTHING, NOTHING, NOTHING, NOTHING, NOTHING, SPEED, SPEED, SPEED, SPEED, SPEED],
];

/** The seven Transformation Effects of core-rulebook.txt [page 28], plus the
 * two table results that are not active Transformations. */
const TRANSFORMATION_EFFECTS: TransformationEffect[] = [
  {
    id: NOTHING,
    name: "Nothing Happens",
    madnessOnGain: 0,
    text: "You gain no active Transformation.",
  },
  {
    id: EARS,
    name: "Dreadblood ears",
    madnessOnGain: 2,
    text: "Heightened Hearing. You gain a +2 bonus to Wisdom (Perception) checks and Passive Perception. Listen Beyond. Before making a Wisdom (Perception) check, you may suffer 1 Madness to make the check with Advantage.",
  },
  {
    id: EYES,
    name: "Dreadblood eyes",
    madnessOnGain: 2,
    text: "Open the Eyes. As an action, you may suffer 1 Madness to gain Blindsight out to 30 feet for 10 rounds.",
  },
  {
    id: SPEED,
    name: "Dreadblood speed",
    madnessOnGain: 1,
    text: "Unnatural Movement. Once per turn, you may suffer 1 Madness to gain one or both of the following until the end of that turn: you may take the Dash action as a Bonus Action; your movement does not provoke Opportunity Attacks.",
  },
  {
    id: FANGS,
    name: "Blood fangs",
    madnessOnGain: 3,
    text: "Bite. Once per turn when you take the Attack action, you may replace one attack with a bite against a creature within 5 feet. Make a melee attack roll using your Strength modifier and Proficiency Bonus. On a hit, the target suffers 4d3 Piercing damage. If the target has blood, you regain Hit Points equal to the Piercing damage dealt. After making the attack, hit or miss, suffer 1 Madness.",
  },
  {
    id: ARM,
    name: "Mutated arm",
    madnessOnGain: 4,
    text: "Distorted Strike. Once per turn, before making a melee weapon attack or Unarmed Strike, you may suffer 1 Madness. That attack gains 5 feet of additional reach. On a hit, a melee weapon attack deals an extra 1d12 damage of the weapon's normal damage type; an Unarmed Strike instead deals an extra 3d12 Slashing damage.",
  },
  {
    id: LUST,
    name: "Blood lust",
    madnessOnGain: 0,
    text: "Immediately choose one: drink another Bloodvial without using an action and resolve all its effects normally, or suffer 5 Madness. If you have no Bloodvial, you must suffer the Madness. Blood Lust is a compulsion, not an active Transformation. A Bloodvial consumed this way can trigger another Blood Lust; resolve each vial and Transformation fully before resolving the next choice.",
  },
  {
    id: DREADLORD,
    name: "Dreadlord connection",
    madnessOnGain: 6,
    text: "Dreadful Scream. As an action, suffer 3 Madness and release an inhuman scream. Every other Human and Dreadblood within 30 feet that doesn't have the Deafened condition must make a DC 15 Wisdom saving throw. On a failed save, the creature suffers 4 Madness and 1d10 + your Strength modifier Mind damage (minimum 1) and cannot take an action on its next turn. This scream affects allies and enemies. A creature that does not track Madness ignores the Madness suffered.",
  },
  {
    id: LOST,
    name: "Lost",
    madnessOnGain: 0,
    text: "Ask your GM.",
  },
];

export const TRANSFORMATION_EFFECT_BY_ID: Record<string, TransformationEffect> =
  Object.fromEntries(TRANSFORMATION_EFFECTS.map((effect) => [effect.id, effect]));

