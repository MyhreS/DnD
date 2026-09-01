/** Insane Quirk Table. core-rulebook.txt [page 24].
 *
 * Rolled on a d100 when the Insane condition is gained ([page 23]: "When you
 * gain the Insane condition, roll a d100 and consult the Insane Quirks table.
 * You retain the rolled Insane Quirk until the Insane condition ends.").
 *
 * ⚠️ Ruined Presence's −5 is NEVER applied automatically: the source says it
 * "does not change your Charisma modifier for class features, Rite statistics,
 * resource maximums, or other derived values." */

interface InsaneQuirk {
  id: string;
  /** Inclusive d100 range. */
  low: number;
  high: number;
  name: string;
  text: string;
}

const INSANE_QUIRKS: InsaneQuirk[] = [
  {
    id: "boundShadow", low: 1, high: 10, name: "Bound Shadow",
    text: "Choose the character belonging to the player seated immediately to your left when this Quirk is rolled. You must use your available movement to end each of your turns within 5 feet of that character, if possible. You cannot willingly move farther than 5 feet from them unless no legal alternative exists.",
  },
  {
    id: "burdenHunger", low: 11, high: 18, name: "Burden Hunger",
    text: "You keep every unattended portable item you discover until you are Encumbered or worse. If an item requires an unavailable item slot, you must seek another object you can carry instead. If you cease being Encumbered, the compulsion immediately returns. During combat, you are required to collect only items already within reach or directly along your movement.",
  },
  {
    id: "compulsiveFalsehood", low: 19, high: 28, name: "Compulsive Falsehood",
    text: "Every factual statement you knowingly make must be false. You may still ask questions, issue commands, make meaningless noises, or remain silent.",
  },
  {
    id: "paranoidContrarian", low: 29, high: 36, name: "Paranoid Contrarian",
    text: "You believe every instruction is an attempt to manipulate you. You must refuse any direct instruction given to you and, when there is a clear and reasonably safe opposite action, attempt that instead.",
  },
  {
    id: "gallowsMirth", low: 37, high: 48, name: "Gallows Mirth",
    text: "You cannot take anything seriously. The more dangerous, solemn, tragic, or frightening a situation becomes, the funnier you find it. This does not make you immune to fear, danger, or consequences.",
  },
  {
    id: "voiceless", low: 49, high: 54, name: "Voiceless",
    text: "You lose the ability to speak or produce intelligible words. You may still make noises and communicate through gestures. This does not prevent you from performing a Rite unless that Rite explicitly requires speech.",
  },
  {
    id: "oneWordMind", low: 55, high: 64, name: "One-Word Mind",
    text: "Whenever you speak, you may utter only one word. You cannot speak another word until another creature speaks, or until the beginning of your next turn.",
  },
  {
    id: "compulsiveObedience", low: 65, high: 69, name: "Compulsive Obedience",
    text: "You must attempt the first clear instruction you hear from another creature. You continue attempting it until it is completed, becomes impossible, or another instruction replaces it. You are not compelled to follow an instruction that is obviously and immediately self-destructive, as determined by the GM.",
  },
  {
    id: "predatoryUrge", low: 70, high: 81, name: "Predatory Urge",
    text: "During combat, you must make at least one attack against an enemy or perform at least one harmful Rite affecting an enemy during each of your turns, if possible. If you cannot, you must use your movement and available actions to place yourself in a position to do so on your next turn.",
  },
  {
    id: "sirDeadlyBladeOfTheNight", low: 82, high: 91, name: "Sir Deadly Blade of the Night",
    text: "Your name is now Sir Deadly Blade of the Night. A creature must begin any sentence addressed to you by using this full name. Otherwise, you ignore everything it says and, when able, respond only: “Excuse me. My name is Sir Deadly Blade of the Night.”",
  },
  {
    id: "ruinedPresence", low: 92, high: 95, name: "Ruined Presence",
    text: "You suffer a −5 penalty to Charisma checks and Charisma saving throws. This penalty does not change your Charisma modifier for class features, Rite statistics, resource maximums, or other derived values.",
  },
  {
    id: "bloodRevulsion", low: 96, high: 100, name: "Blood Revulsion",
    text: "You refuse to willingly drink or receive a Blood Vial. You resist any attempt to administer one while you are conscious and capable of resisting.",
  },
];

export const INSANE_QUIRK_BY_ID: Record<string, InsaneQuirk> =
  Object.fromEntries(INSANE_QUIRKS.map((quirk) => [quirk.id, quirk]));

