import type { HandbookChapter } from "@/types";

// Player's Handbook content, structured for in-app reading.
// Source: CATACOMBS & STARSPAWNS Player's Handbook, Chapter 1.
// The full PDF is also linked from the Handbook page.
//
// NOTE: This is the "v1" subset. When the updated handbook / character-creation
// table arrives, this file (plus classes.ts / armor.ts) is the single place to
// update — the UI is driven entirely from this data.

export const HANDBOOK_PDF_PATH = "/handbook/catacombs-and-starspawns-handbook.pdf";
export const WHISPERS_PDF_PATH = "/docs/whispers.pdf";
export const DEEPCALLER_BOOK_PDF_PATH = "/docs/book-of-the-deepcaller.pdf";

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
        heading: "Alternative: the Maduhausu point buy",
        body: [
          "Your table may instead use the DM's more ambitious min-maxing variant — the “Maduhausu” point buy. You have 57 points to spend and can buy scores from 3 to 16 (Ability Score Point Costs V2).",
          "Scores 3–13 always cost the same: score − 3 points (a 10 costs 7). Buying 14+ gets pricier each time you buy that same score again: a 14 costs 12, then 14, then 17; a 15 costs 14, then 18, then 23; a 16 costs 20, then 26 — and a third 16 is simply too expensive.",
          "Under this method, no Ability Score may be higher than 17 as a level 1 character — that includes the extra points from your background or anything else.",
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
    id: "sanity",
    title: "Sanity, Madness & Blood Tinge",
    summary: "The mind's resilience against the truths of the night.",
    sections: [
      {
        heading: "Your Sanity pool",
        body: [
          "Alongside Hit Points, every hunter has a Max Sanity — how much the mind can hold together against the horrors of the hunt. Your class sets your Max Sanity and your Sanity Die (for example the Brute's 2d6 or the Deepcaller's d20).",
          "When the night frays your mind you suffer Madness. Madness accumulates: each point eats into your Sanity. Your hunter card tracks it for you.",
        ],
      },
      {
        heading: "The Insane condition",
        body: [
          "When your current Madness equals or exceeds your Max Sanity, you gain the Insane condition. It ends immediately when your Madness is reduced below your Max Sanity.",
          "What being Insane means for your hunter is not written here. The DM knows. You'll find out.",
        ],
      },
      {
        heading: "Madness from forbidden power",
        body: [
          "Some power has a price paid in the mind. The Deepcaller suffers Madness each time they perform a Rite from the Book of the Deepcaller — and risks far worse by reaching past the limits of their Strain.",
          "The Deepcaller's Fracturing Mind also permanently raises their maximum Sanity by 1 each time they level up, even as the forbidden knowledge takes its toll.",
        ],
      },
      {
        heading: "Blood Tinge",
        body: [
          "Blood Tinge is the C&S take on Heroic Inspiration. When you hold Blood Tinge you can spend it to reroll a d20.",
          "Hunters do not start with Blood Tinge, and you cannot give it to yourself — only the DM grants it (and a few rare features). Your card tracks whether you're holding it; spend it from there.",
        ],
      },
      {
        heading: "What C&S does NOT use",
        body: [
          "Unlike standard 5e, C&S does not use Languages or Species. The bonuses those would grant are baked into your Background and Class instead, so you won't find them on your hunter card.",
        ],
      },
    ],
  },
  {
    id: "transformation",
    title: "Transformation",
    summary: "How far the blood has shifted — and what crawls out when it does.",
    sections: [
      {
        heading: "Transformation Level",
        body: [
          "Your Transformation Level is a number from 0–10 that shows how far your blood has shifted. When you gain 1 Transformation Level, increase the level by 1, then roll 1d20 on the Transformation Table using your NEW level. The app's tracker rolls for you.",
          "Not every result is a Transformation. Nothing Happens is nothing. Blood Lust is a compulsion, not a Transformation. Lost is a special catastrophic result that counts as a Transformation — what it means is between you and the DM.",
        ],
      },
      {
        heading: "The results",
        body: [
          "Blood Lust — Drink another Blood Vial or suffer 3 Madness.",
          "Mutated Arm — Suffer 2 Madness. Add +1d12 to your damage roll and 5 ft to your range if melee damage. Suffer 1 Madness if you do.",
          "Blood Fangs — As a melee attack action, bite a creature within 5 ft for 4d3 piercing damage; you heal the same amount. Suffer 1 Madness if you do.",
          "Dreadblood Eyes — As an action, gain Blindsight for 10 rounds. Suffer 1 Madness if you do.",
          "Dreadblood Ears — Your Wisdom (Perception) modifier increases by +5. You may suffer 1 Madness to make a Wisdom (Perception) check with Advantage.",
          "Lost — …",
          "Low rolls grow more dangerous the higher your Transformation Level climbs: at high levels, a bad roll is Lost.",
        ],
      },
      {
        heading: "Reducing your Transformation Level",
        body: [
          "Your Transformation Level is reduced only when a rule, effect, rest, or condition specifically says so. Every reduction also sheds all your active Transformations.",
          "Short Rest: reduce your Transformation Level by 1. During the same rest, make a DC 13 Constitution (Grit) check — on a success, reduce it by 1 more.",
          "Long Rest: reduce your Transformation Level to 0.",
          "Unconscious: the first time you gain the Unconscious condition after gaining a Transformation, reduce your Transformation Level by 2. You can't reduce it this way again until you finish a rest or gain another Transformation.",
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
