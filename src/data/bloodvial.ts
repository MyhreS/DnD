/** Bloodvial purity. core-rulebook.txt [page 123] — the Bloodvial entry (the
 * page is two-column and interleaves with Silver Bullets; these figures are the
 * de-interleaved table).
 *
 * Purity is a FIELD on the single `blood-vial` catalog id, not four separate
 * items: every stored inventory line keeps resolving, and a line without a
 * purity is Tainted ("the most common form").
 *
 * The Grit check, the Transformation Levels and the Madness on a failure are
 * resolved at the table by the GM. The app DISPLAYS the DC and the
 * consequences; it does not roll them. */

import type { BloodvialPurity, HunterCard, InventoryEntry } from "@/types";

export const BLOODVIAL_ITEM_ID = "blood-vial";

/** Stored lines predating purity are Tainted. */
export const DEFAULT_BLOODVIAL_PURITY: BloodvialPurity = "tainted";

export interface BloodvialPurityFacts {
  id: BloodvialPurity;
  name: string;
  /** Hit Points regained, or null when the effect is a choice (Pure Old Blood). */
  healing: string | null;
  /** Madness removed, or null when the effect is a choice (Pure Old Blood). */
  madnessRemoved: number | null;
  /** Grit save DC on drinking. */
  gritDc: number;
  /** Transformation Levels gained on a failed Grit check. */
  transformationLevelsOnFailure: number;
  /** Madness suffered on a failed Grit check. */
  madnessOnFailure: number;
  /** The two Pure Old Blood options; empty for the other purities. */
  choices: string[];
  /** Verbatim flavour text from the source entry. */
  note: string;
}

export const BLOODVIAL_PURITIES: BloodvialPurityFacts[] = [
  {
    id: "tainted",
    name: "Tainted Blood",
    healing: "2d4 + 2",
    madnessRemoved: 2,
    gritDc: 10,
    transformationLevelsOnFailure: 1,
    madnessOnFailure: 3,
    choices: [],
    note: "The most common form of Bloodvial. Though its impurities dull its potency, they also make it the safest blood to consume.",
  },
  {
    id: "stirred",
    name: "Stirred Blood",
    healing: "4d4 + 4",
    madnessRemoved: 4,
    gritDc: 15,
    transformationLevelsOnFailure: 1,
    madnessOnFailure: 6,
    choices: [],
    note: "A more refined form of blood that offers greater healing, but might further awaken something within.",
  },
  {
    id: "concentrated",
    name: "Concentrated Blood",
    healing: "8d4 + 8",
    madnessRemoved: 8,
    gritDc: 20,
    transformationLevelsOnFailure: 2,
    madnessOnFailure: 10,
    choices: [],
    note: "Highly refined blood sought after by veteran Hunters, and those desperate enough to risk its power.",
  },
  {
    id: "pure",
    name: "Pure Old Blood",
    healing: null,
    madnessRemoved: null,
    gritDc: 25,
    transformationLevelsOnFailure: 6,
    madnessOnFailure: 15,
    choices: [
      "Regain all Hit Points and remove all Madness.",
      "Remove the Dead condition from a creature, if it has lasted no longer than 1 round, and restore that creature to 1 Hit Point.",
    ],
    note: "The purest remnants of the Old Blood. Few Hunters ever see it, and fewer still survive long after drinking it.",
  },
];

export const BLOODVIAL_PURITY_BY_ID: Record<BloodvialPurity, BloodvialPurityFacts> =
  Object.fromEntries(BLOODVIAL_PURITIES.map((facts) => [facts.id, facts])) as Record<
    BloodvialPurity,
    BloodvialPurityFacts
  >;

/** Where a Bloodvial comes from, core-rulebook.txt lines 5156-5162: humans
 * normally yield Tainted Blood; Beasts Tainted Blood or nothing usable;
 * Dreadbloods usually Stirred Blood, and greater sources Concentrated or Pure
 * Old Blood; the Old Ones yield Pure Old Blood. GM-facing only — the app never
 * picks a purity for you, so this stays a comment rather than UI text. */

function isPurity(value: unknown): value is BloodvialPurity {
  return typeof value === "string" && value in BLOODVIAL_PURITY_BY_ID;
}

/** The purity of a stored inventory line, defaulting to Tainted. */
export function bloodvialPurityOf(entry: Pick<InventoryEntry, "purity"> | undefined): BloodvialPurity {
  return isPurity(entry?.purity) ? entry.purity : DEFAULT_BLOODVIAL_PURITY;
}

/** The purity of the card's Bloodvial line, defaulting to Tainted. */
export function cardBloodvialPurity(card: Pick<HunterCard, "inventory">): BloodvialPurity {
  return bloodvialPurityOf((card.inventory ?? []).find((entry) => entry.itemId === BLOODVIAL_ITEM_ID));
}

/** A one-line summary of what drinking this purity does. */
export function bloodvialEffectLabel(facts: BloodvialPurityFacts): string {
  return facts.healing && facts.madnessRemoved != null
    ? `Heals ${facts.healing} HP · removes ${facts.madnessRemoved} Madness`
    : "Choose one effect below";
}

/** A one-line summary of a failed Grit check. */
export function bloodvialFailureLabel(facts: BloodvialPurityFacts): string {
  const levels = facts.transformationLevelsOnFailure;
  return `Grit DC ${facts.gritDc} — on a failure: +${levels} Transformation ${
    levels === 1 ? "Level" : "Levels"
  } and +${facts.madnessOnFailure} Madness.`;
}
