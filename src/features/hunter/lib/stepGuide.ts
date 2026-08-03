/** What to do in each character-creation step — the toolbar's step-guidance
 * panel. Steps 1–4 are distilled from the Handbook's step chapters
 * (`src/data/handbook.ts`, `step-1-class` … `step-4-armor`); step 5 ("Fill in
 * Details") summarises the derived values the sheet asks for. Each guide
 * deep-links into the app's Handbook, opened in a new tab like the info dots. */
export interface StepGuide {
  /** Chapter title, e.g. "Step 1 — Choose a Class". */
  title: string;
  /** Short ordered to-do list for the step. */
  todo: string[];
  /** Human-readable "read more" caption. */
  refTitle: string;
  /** Handbook deep link (tab / chapter), opened in a new tab. */
  link: string;
}

const rules = (chapter: string) => `/handbook?tab=rules&chapter=${chapter}`;

export const STEP_GUIDES: Record<number, StepGuide> = {
  1: {
    title: "Step 1 — Choose a Class",
    todo: [
      "Pick one of the six classes — the biggest part of your build.",
      "Write your class on page 1 and start at level 1; subclass waits until level 3.",
      "Tick the Armor Training your class grants (page 2), and note its saving throws and starting equipment — later steps come back to them.",
    ],
    refTitle: "Rules → Step 1 — Choose a Class",
    link: rules("step-1-class"),
  },
  2: {
    title: "Step 2 — Determine a Background",
    todo: [
      "Choose the occupation your hunter had before the hunt and write it on page 1.",
      "Record its Origin feat (page 4), and mark its two skill and one tool proficiencies — plus the ones your class grants.",
      "Write your Proficiency Bonus: +2 at level 1.",
      "Note your starting coins, equipment and storage slots (pages 2–3).",
    ],
    refTitle: "Rules → Step 2 — Determine a Background",
    link: rules("step-2-background"),
  },
  3: {
    title: "Step 3 — Determine Ability Scores",
    todo: [
      "Spend 27 points across the six abilities (8 costs 0 … 15 costs 9; nothing above 15 yet).",
      "Adjust for your background: +2 and +1, or +1 to all three of its listed abilities.",
      "Write each modifier: (score − 10) ÷ 2, rounded down.",
    ],
    refTitle: "Rules → Step 3 — Determine Ability Scores",
    link: rules("step-3-abilities"),
  },
  4: {
    title: "Step 4 — Select and Equip Armor",
    todo: [
      "Choose a Main Armor, up to five Add-ons, and Extras — one per slot (page 2).",
      "Calculate AC: 10 (unarmored) or Main Armor base, + add-on and upgrade bonuses, then DEX by armor category.",
      "Record armor category, weight, weight condition, impressions and special properties.",
    ],
    refTitle: "Rules → Step 4 — Select and Equip Armor",
    link: rules("step-4-armor"),
  },
  5: {
    title: "Step 5 — Fill in Details",
    todo: [
      "Hit Points: your class's hit die maximum + CON modifier; note your hit dice.",
      "Saving throws and skills: ability modifier, + proficiency bonus where the dot is marked.",
      "Initiative = DEX modifier; Passive Perception = 10 + your Perception bonus.",
      "Sanity: class base + WIS modifier, plus your class's Sanity Dice.",
      "Copy your class features (page 4); Deepcallers also fill in rites and prepared whispers (page 5).",
    ],
    refTitle: "Handbook → Classes tab",
    link: "/handbook?tab=classes",
  },
};
