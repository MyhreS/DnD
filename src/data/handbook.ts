import type { HandbookChapter } from "@/types";

// Player's Handbook content, structured for in-app reading.
// Source: CATACOMBS & STARSPAWNS Player's Handbook, Chapter 1.
// The full PDF is also linked from the Handbook page.
//
// NOTE: This is the "v1" subset. When the updated handbook / character-creation
// table arrives, this file (plus classes.ts / armor.ts) is the single place to
// update — the UI is driven entirely from this data.

export const HANDBOOK_PDF_PATH = "/handbook/catacombs-and-starspawns-handbook.pdf";

export const HANDBOOK: HandbookChapter[] = [
  {
    id: "intro",
    title: "Welcome, Hunter",
    summary: "What Catacombs & Starspawns is, and how character creation works.",
    sections: [
      {
        heading: "A darker hunt",
        body: [
          "Character creation in C&S follows a framework broadly similar to the latest edition of D&D (5e). However, adventurers in C&S are referred to as hunters, reflecting the darker themes and setting of the world.",
          "Below are the steps to make a character. Each is explored in detail in this chapter. At the end of the full handbook there is a character sheet where every space is labelled with a number that corresponds to one of these steps.",
        ],
      },
      {
        heading: "The five steps",
        body: [
          "1. Choose a Class. Every hunter is a member of a class. This is the biggest part of your build.",
          "2. Determine a Background. What did your character do before becoming a hunter? This sets some attributes such as skills.",
          "3. Determine Ability Scores. Allocate and calculate your six Ability Scores and their modifiers.",
          "4. Select and Equip Armor. Choose the armor that fits your build — or whatever you feel like.",
          "5. Fill in Details. Using the choices you've made, fill in the remaining details on your sheet.",
        ],
      },
    ],
  },
  {
    id: "step-1-class",
    title: "Step 1 — Choose a Class",
    summary: "Six classes define the bulk of your build.",
    sections: [
      {
        heading: "Pick your hunter",
        body: [
          "In C&S you have six classes to choose from: Brute, Scout, Stalker, Deepcaller, Bloodbound and Warden.",
          "Browse them on the Hunters screen or in the character builder. For now, simply choose your class and note your Armor Training, Saving Throws and starting equipment — we come back to your class in later steps.",
        ],
      },
    ],
  },
  {
    id: "step-2-background",
    title: "Step 2 — Determine a Background",
    summary: "Your life before the hunt — a feat, two skills, a tool and ability points.",
    sections: [
      {
        heading: "What you were before",
        body: [
          "A character's background is the occupation that was most formative before they became a Hunter. A background gives your character a Feat, proficiency with two skills and one tool, and some more points towards a selection of Ability Scores.",
          "You can choose whatever background you want. When you've chosen, write it on your sheet — it influences Step 3, when you determine your ability scores.",
        ],
      },
      {
        heading: "Record your feat & proficiencies",
        body: [
          "A background grants a feat, which gives your character particular capabilities. Feats are detailed in chapter 5 of the original D&D Player's Handbook — buy it, or just look it up online.",
          "Your background gives proficiency in two skills and with one tool. Your class also gives proficiencies — check the class description and note them all. On the sample sheet you mark proficiency in skills and saving throws by filling the circle next to them.",
          "Your Proficiency Bonus is +2 for a level 1 character. Note this number; you'll use it for many other values in Step 5.",
        ],
      },
    ],
  },
  {
    id: "step-3-abilities",
    title: "Step 3 — Determine Ability Scores",
    summary: "Spend 27 points across six abilities, then adjust for background.",
    sections: [
      {
        heading: "Assign ability scores (point buy)",
        body: [
          "Your character has six Ability Scores: Strength (STR), Dexterity (DEX), Constitution (CON), Intelligence (INT), Wisdom (WIS) and Charisma (CHA).",
          "You have 27 points to spend. Cost per score: 8 → 0, 9 → 1, 10 → 2, 11 → 3, 12 → 4, 13 → 5, 14 → 7, 15 → 9. For example, buying a 14 in Wisdom costs 7 points.",
          "During this step no Ability Score can be higher than 15. It can go higher in the next step once we account for your background, or later as your character gains levels and features — but Ability Scores cap at 20 even at max level.",
        ],
      },
      {
        heading: "Adjust for background",
        body: [
          "After assigning scores, adjust them for your background. Your background lists three abilities: increase one of them by 2 and a different one by 1, or increase all three by 1. None of these increases can raise a score above 20.",
        ],
      },
      {
        heading: "Determine ability modifiers",
        body: [
          "Finally, find each modifier: 3 → −4, 4–5 → −3, 6–7 → −2, 8–9 → −1, 10–11 → +0, 12–13 → +1, 14–15 → +2, 16–17 → +3, 18–19 → +4, 20 → +5.",
          "The character builder in this app does all of this maths for you.",
        ],
      },
    ],
  },
  {
    id: "step-4-armor",
    title: "Step 4 — Select and Equip Armor",
    summary: "Armor is modular: a Main piece, Add-ons, Upgrades and Extras.",
    sections: [
      {
        heading: "See your hunter in the world",
        body: [
          "A major part of C&S is being able to visualise your hunter. Armor is not only a number on your sheet — it is something your character wears and uses.",
          "Base AC (unarmored) = 10 + your Dexterity modifier. A character can only ever use one base AC calculation at a time.",
        ],
      },
      {
        heading: "Layering order",
        body: [
          "1. Background Garments — when unarmored, your character still wears these.",
          "2. Main Armor — worn over your Background Garments (you may wear only one).",
          "3. Add-on Armor — worn over your Main Armor (max five pieces).",
          "4. Extras & Specific Gear — Extras, class-specific and background-specific equipment (one Extra per subcategory).",
          "5. Carried Items — decide how weapons, tools and supplies are stored or carried.",
          "Special: a pauldron and vambrace on the same arm count as one Shield Arm and give +2 AC total; you can benefit from only one Shield Arm at a time.",
        ],
      },
      {
        heading: "Calculate your Armor Class",
        body: [
          "Start with 10 (unarmored) or your Main Armor value. Add bonuses from Add-on Armor and Armor Upgrades to get your base armor AC.",
          "That base determines your category: Unarmored (10) and Light (11–12) add your full Dex modifier; Medium (13–14) adds Dex up to +2; Heavy (15+) adds no Dex. Then add Dex accordingly and record your final AC.",
          "The character builder computes your AC from your chosen Main Armor and Dexterity automatically.",
        ],
      },
    ],
  },
  {
    id: "carrying",
    title: "Carrying & Encumbrance",
    summary: "Weight and item slots — what your hunter can actually haul.",
    sections: [
      {
        heading: "Carried weight",
        body: [
          "C&S uses carried weight to decide whether you move freely, carry a heavy load, or are overburdened.",
          "Featherweight (≤ STR × 2 lb.): speed +5 ft. Encumbered (> STR × 5 lb.): speed −10 ft. Heavily Encumbered (> STR × 10 lb.): speed −20 ft and disadvantage on STR/DEX checks, attack rolls and saving throws. Over Capacity (> STR × 15 lb.): you cannot carry this normally.",
        ],
      },
      {
        heading: "Item slots",
        body: [
          "Items also fall into carrying categories. Insignificant Items: keys, letters, coins, blood vials, kits, tools. Significant Items: daggers, pistols, rope, rifles, lanterns, tool belts. Oversized Items: great weapons, crates, barrels, corpses, ladders.",
          "By default you have unlimited insignificant slots and 3 significant slots, plus your hands (2 significant items or 1 oversized item). Holding something always keeps your hands occupied. Add significant slots by equipping a backpack, bandolier or tool belt.",
        ],
      },
    ],
  },
];

export const CHAPTER_BY_ID: Record<string, HandbookChapter> = Object.fromEntries(
  HANDBOOK.map((c) => [c.id, c]),
);
