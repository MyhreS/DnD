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
          "Browse them on the Classes tab of this Handbook. For now, simply choose your class on page 1 of your character sheet and note your Armor Training, Saving Throws and starting equipment — we come back to your class in later steps.",
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
          "A background gives you a feat, which grants your character particular capabilities. Feats are detailed in chapter 4 of the handbook — browse them on the Feats tab of this Handbook.",
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
          "Your table may instead use the DM's more ambitious min-maxing variant — the “Maduhausu” point buy. You have 57 points to spend and can buy scores from 3 to 16, using the Ability Score Point Costs V2 table below.",
          "The table has three columns — First Cost, Second Cost and Third Cost + — because buying the same score more than once gets pricier. The first purchase of a given score uses its First Cost, the second purchase of that same score uses its Second Cost, and the third or later purchase uses its Third Cost +.",
          "Scores 3–13 cost the same in every column — the score minus 3: 3 → 0, 4 → 1, 5 → 2, 6 → 3, 7 → 4, 8 → 5, 9 → 6, 10 → 7, 11 → 8, 12 → 9, 13 → 10.",
          "Score 14 — First Cost 12, Second Cost 14, Third Cost + 17.",
          "Score 15 — First Cost 14, Second Cost 18, Third Cost + 23.",
          "Score 16 — First Cost 20, Second Cost 26, Third Cost + too expensive (a score of 16 cannot be bought a third time).",
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
          "Write each score and its modifier on page 1 of your character sheet — the sheet's step guidance and info dots repeat this maths whenever you need it.",
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
          "Record your Main Armor, add-ons and final AC on page 2 of your character sheet — the sheet's step guidance walks you through the calculation.",
        ],
      },
    ],
  },
  {
    id: "step-5-details",
    title: "Step 5 — Fill in Details",
    summary: "Record features, saving throws, skills, HP, Sanity, attacks and rite formulas.",
    sections: [
      {
        heading: "Record class features",
        body: [
          "Now fill in the rest of your character sheet.",
          "Look at your class's feature table (the Classes tab of this Handbook), and write down the level 1 features. The class features are detailed there too. Some class features offer choices. Make sure to read all your features and make any offered choices.",
        ],
      },
      {
        heading: "Saving throws & skills",
        body: [
          "Fill in numbers. Note these numbers on your character sheet.",
          "Saving Throws. For the saving throws you have proficiency in, add your Proficiency Bonus to the appropriate ability modifier and note the total. Some players also like to note the modifier for saving throws they're not proficient in, which is just the relevant ability modifier.",
          "Skills. For skills you have proficiency in, add your Proficiency Bonus to the ability modifier associated with that skill, and note the total. You might also wish to note the modifier for skills you're not proficient in, which is just the relevant ability modifier.",
        ],
      },
      {
        heading: "Passive Perception",
        body: [
          "Sometimes your DM will determine whether your character notices something without asking you to make a Wisdom (Perception) check; the DM uses your Passive Perception instead. Passive Perception is a score that reflects a general awareness of your surroundings when you're not actively looking for something. Use this formula to determine your Passive Perception score:",
          "Passive Perception = 10 + Wisdom (Perception) check modifier",
          "Include all modifiers that apply to your Wisdom (Perception) checks. For example, if your character has a Wisdom of 15 and proficiency in the Perception skill, you have a Passive Perception of 14 (10 + 2 for your Wisdom modifier + 2 for proficiency).",
        ],
      },
      {
        heading: "Hit Points at level 1",
        body: [
          "Your class and Constitution modifier determine your Hit Point maximum at level 1, as shown on the Level 1 Hit Points by Class table. The character sheet includes room to note your current Hit Points when you take damage, as well as any Temporary Hit Points you might gain. There's also space to track Death Saving Throws.",
          "Level 1 Hit Points by Class — Hit Points Maximum:",
          "Bloodbound — 12 + Con. modifier.",
          "Brute, Scout, or Warden — 10 + Con. modifier.",
          "Stalker (the source's “Rouge”) — 8 + Con. modifier.",
          "Deepcaller — 6 + Con. modifier.",
        ],
      },
      {
        heading: "Sanity",
        body: [
          "Your class + Wisdom modifier determine your Max Sanity.",
          "Sanity Dice. Your class's description tells you the die type of your character's Sanity Dice. Write this on your character sheet. You always have one Sanity Die, one which you can roll once on every Long Rest. Roll the die and add your Wisdom modifier. You regain Sanity equal to the total.",
        ],
      },
      {
        heading: "Hit Point Dice & rests",
        body: [
          "Your class's description tells you the die type of your character's Hit Point Dice (or Hit Dice for short); write this on your character sheet. At level 1, your character has 1 Hit Die.",
          "During a Short Rest, you can spend a number of Hit Point Dice up to your Proficiency Bonus. For each Hit Point Die you spend, roll the die and add your Constitution modifier. You regain Hit Points equal to the total. Your character sheet also includes space to note how many Hit Dice you've spent.",
          "You can spend Hit Point Dice only if the Short Rest takes place in a Safe Zone.",
          "A Long Rest inside the Hunters Lodge recovers all Hit Points and expended Hit Dice.",
          "When you finish a Long Rest outside the Hunter's Lodge, you regain Hit Points equal to half your Hit Point maximum, up to your Hit Point maximum. You do not regain any expended Hit Point Dice from this Long Rest.",
        ],
      },
      {
        heading: "Transformation Level",
        body: [
          "You start off with 0 Transformation Level. Whenever you gain a Transformation Level roll a D20 for the level you end up at. See the results on the Transformation Table for that level. A Short Rest will remove 1 level of Transform, a Long Rest will remove all levels. (See the Transformation chapter for the full rules.)",
        ],
      },
      {
        heading: "Initiative & attacks",
        body: [
          "Initiative. Write your Dexterity modifier in the space for Initiative on your character sheet.",
          "Attacks. In the Weapons section of the character sheet, write your starting weapons. The attack roll bonus for a weapon with which you have proficiency is one of the following unless a weapon's property says otherwise:",
          "Melee attack bonus = Strength modifier + Proficiency Bonus",
          "Ranged attack bonus = Dexterity modifier + Proficiency Bonus",
          "Look up the damage and properties of your weapons in the Equipment chapter. You add the same ability modifier you use for attacks with a weapon to your damage rolls with that weapon.",
        ],
      },
      {
        heading: "Rite Performing",
        body: [
          "Note both the saving throw DC for your Rites and Whispers and the attack bonus for attacks you make with them, using these formulas:",
          "Rite save DC = 8 + Rite Performing ability modifier + Proficiency Bonus",
          "Rite attack bonus = Rite Performing ability modifier + Proficiency Bonus",
          "Your Rite Performing ability modifier for a Rite is determined by whatever feature gives you the ability to perform the Rite.",
        ],
      },
      {
        heading: "Strains, Whispers, and Prepared Whispers",
        body: [
          "If your class gives you the Eldritch Comprehension feature, your class features table shows the number of Strains you have available, and how many Whispers you have prepared. Choose your Whispers, and note them along with your number of Prepared Whispers on your character sheet.",
        ],
      },
    ],
  },
  {
    id: "level-advancement",
    title: "Level Advancement & Insight",
    summary: "Insight thresholds per level, and the steps for gaining a level.",
    sections: [
      {
        heading: "Insight",
        body: [
          "While going on hunts, your character gains knowledge and experience, represented by Insight. A character who reaches a specified Insight total advances in capability. This advancement is called gaining a level.",
          "The Character Advancement table lists the Insight you need to advance to a level. When your Insight total equals or exceeds a number in the Insight column, you reach the corresponding level only after a Long Rest.",
        ],
      },
      {
        heading: "Character Advancement table",
        body: [
          "Level — Insight required:",
          "Level 1 — 0 · Level 2 — 6 · Level 3 — 15 · Level 4 — 30 · Level 5 — 50.",
          "Level 6 — 75 · Level 7 — 105 · Level 8 — 140 · Level 9 — 180 · Level 10 — 225.",
          "Level 11 — 275 · Level 12 — 330 · Level 13 — 390 · Level 14 — 455 · Level 15 — 525.",
          "Level 16 — 600 · Level 17 — 680 · Level 18 — 765 · Level 19 — 855 · Level 20 — 950.",
        ],
      },
      {
        heading: "Gaining a Level",
        body: [
          "When you gain a level, follow these steps:",
          "1: Adjust Hit Points and Hit Point Dice. Each time you gain a level, you gain an additional Hit Die. Gain Hit Point maximum by using the fixed value shown in the Fixed Hit Points by Class table.",
          "2: Record New Class Features. Look at your class features table, and note the features you gain at your new level in that class. Make any choices offered by a new feature.",
          "4: Adjust Proficiency Bonus. A character's Proficiency Bonus increases at certain levels, as shown in the Character Advancement table and your class features table. When your Proficiency Bonus increases, increase all the numbers on your character sheet that include your Proficiency Bonus.",
          "5: Adjust Ability Modifiers. If you choose a feat that increases one or more of your ability scores, your ability modifier also changes if the new score is an even number. When that happens, adjust all the numbers on your character sheet that use that ability modifier. When your Constitution modifier increases by 1, your Hit Point maximum increases by 1 for each level you have attained.",
          "(The steps are numbered 1, 2, 4, 5 in the handbook.)",
        ],
      },
      {
        heading: "Fixed Hit Points by Class",
        body: [
          "Hit Points gained per level after 1st:",
          "Bloodbound — 7 + Con. modifier.",
          "Brute, Scout, or Warden — 6 + Con. modifier.",
          "Stalker (the source's “Rouge”) — 5 + Con. modifier.",
          "Deepcaller — 4 + Con. modifier.",
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
          "Alongside Hit Points, every hunter has a Max Sanity — how much the mind can hold together against the horrors of the hunt. Your class + Wisdom modifier determine your Max Sanity; your class also sets your Sanity Die (for example the Brute's 2d6 or the Deepcaller's d20).",
          "Sanity Dice. You always have one Sanity Die, which you can roll once on every Long Rest. Roll the die and add your Wisdom modifier. You regain Sanity equal to the total.",
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
          "The Deepcaller's Fracturing Mind also permanently raises their maximum Sanity by 1 each time they level up (to a maximum of 26 Max Sanity), even as the forbidden knowledge takes its toll.",
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
          "Your Transformation Level is a number from 0–10 that shows how far your blood has shifted. When you gain 1 Transformation Level, increase the level by 1, then roll 1d20 on the Transformation Table using your NEW level. The roll happens physically at the table; your DM records your level and any result on your hunter card.",
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
    id: "rites-rules",
    title: "The Deepcaller's Rites",
    summary: "How Rites are performed: types, range, duration, Concentration, targets, save DC and attacks.",
    sections: [
      {
        heading: "Types of Rites",
        body: [
          "Each Rite has a type. The types are listed in the Types of Rites table. These categories help describe Rites but have no rules of their own, although some other rules refer to them.",
          "Types of Rites: Protection Rite · Summoning Rite · Detection Rite · Mind Influence Rite · Evocation Rite · Illusion Rite · Teleportation Rite.",
          "(The Rites tab of this Handbook groups Teleportation Rites under “Traversal”.)",
        ],
      },
      {
        heading: "Longer performing than one Action",
        body: [
          "Certain Rites require more Actions to perform. While you perform a Rite with a Performing of two or more Actions, you must take the Rite action on each of your turns until the requirement is met, and you must maintain Concentration (see below) while you do so.",
          "If your Concentration is broken, the Rite fails, but you don't expend a Strain. To perform the Rite again, you must start over.",
        ],
      },
      {
        heading: "Range",
        body: [
          "A Rite's range indicates how far from the performer of the Rite the Rite's effect can originate, and the Rite's description specifies which part of the effect is limited by the range. A range usually takes one of the following forms:",
          "Distance. The range is expressed in feet.",
          "Touch. The Rite's effect originates on something, as defined by the Rite, that the performer of the Rite must touch within their reach.",
          "Self. The Rite is performed on the performer self, or emanates from them, as specified in the Rite.",
          "If a Rite has movable effects, they aren't restricted by its range unless the Rite's description says otherwise.",
        ],
      },
      {
        heading: "Duration",
        body: [
          "A Rite's duration is the length the Rite persists after it is performed. A duration typically takes one of the following forms:",
          "Concentration. A duration that requires Concentration follows the Concentration rules (see below).",
          "Instantaneous. An instantaneous duration means the Rite's outcome appears only for a moment and then disappears.",
          "Span. A duration that provides a span specifies how many rounds the Rite lasts. While a span Rite that you perform is ongoing, you can dismiss it (no action required) if you don't have the Incapacitated condition or it is a Summoning Rite.",
        ],
      },
      {
        heading: "Concentration",
        body: [
          "Some Rites and other effects require Concentration to remain active, as specified in their descriptions. If the effect's creator loses Concentration, the effect ends. If the effect has a maximum duration, the effect's description specifies for how many rounds the performer can concentrate on it. The creator can end Concentration at any time (no action required).",
          "The following factors break Concentration.",
          "Another Concentration Effect. You lose Concentration on an effect the moment you start performing a Rite that requires Concentration or activate another effect that requires Concentration.",
          "Damage. If you take damage, you must succeed on a Constitution saving throw to maintain Concentration. The DC equals 10 or half the damage taken (round down), whichever number is higher, up to a maximum DC of 30.",
          "Incapacitated or Dead. Your Concentration ends if you have the Incapacitated condition or you die.",
        ],
      },
      {
        heading: "Rite effects & targets",
        body: [
          "The effects of a Rite are detailed after its Duration entry. These effects describe exactly what the Rite does, often ignoring the normal laws of nature. Any outcomes beyond those effects are determined by the DM. A Rite's effects typically involve targets, saving throws, Rite attacks, or a combination of the three.",
          "Most Rites require you to choose one or more targets. A Rite's description specifies whether it targets creatures, objects, areas, or something else.",
          "A Clear Path to the Target. To target something with a Rite, you must have a clear path to it. A target behind Total Cover cannot be targeted unless the Rite states otherwise.",
          "Targeting Yourself. If a Rite targets a creature of your choice, you may choose yourself unless the Rite specifies a hostile creature or a creature other than yourself.",
          "Areas of Effect. Some Rites affect an area rather than a specific target. The Rite's description specifies the shape of the affected area, which is typically one of the following: Cone, Cube, Cylinder, Emanation, Line, Sphere. A creature or object within the area is affected as described by the Rite.",
          "Awareness of Being Targeted. Unless a Rite produces an obvious effect, a creature is unaware it was targeted. Effects such as lightning, explosions, or summoned horrors are obvious. More subtle effects, such as reading thoughts or influencing the mind, typically go unnoticed unless the Rite states otherwise.",
          "Invalid Targets. If you perform a Rite on a creature or object that cannot be affected by it, the Rite has no effect on that target. Any Strain spent to perform the Rite is still expended. If the Rite normally allows a saving throw and has no effect on a successful save, an invalid target appears to have succeeded on its saving throw. Otherwise, you perceive that the Rite had no effect.",
        ],
      },
      {
        heading: "Saving throws & Rite attacks",
        body: [
          "Many Rites allow a target to make a saving throw to avoid some or all of their effects. The Rite specifies which ability is used and what happens on a success or failure. The saving throw DC for your Rites is calculated as follows:",
          "Rite Save DC = 8 + your Rite Performing Ability Modifier + your Proficiency Bonus",
          "Your Rite Performing Ability is determined by your class.",
          "Some Rites require you to make a Rite Attack to determine whether the Rite hits its target. Your Rite Attack modifier is calculated as follows:",
          "Rite Attack Modifier = your Rite Performing Ability Modifier + your Proficiency Bonus",
        ],
      },
      {
        heading: "Combining Rite effects",
        body: [
          "The effects of different Rites stack while their durations overlap. However, the effects of the same Rite do not stack with themselves. If the same Rite affects a target multiple times, only the most potent effect applies. If multiple instances are equally potent, the most recent effect applies.",
          "For example, if two Deepcallers perform the same Rite on the same target, the target benefits from only one instance of that Rite unless the Rite specifically states otherwise.",
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
  {
    id: "equipment",
    title: "Equipment",
    summary: "Coins, weapons and their properties, masteries, tools and hunting gear.",
    sections: [
      {
        heading: "Types of equipment & Coins",
        body: [
          "Equipment can make a difference between success and failure for some Hunts. This chapter provides rules for weapons, armor, and other kinds of equipment that characters might start off with, purchase or find. The DM lets you know if a shop has an item for sale.",
          "Types of Equipment: Coins, Weapons, Armor, Tools, Hunting Gear, Storage Items, Unique Items.",
          "Coins. Coins are used to purchase goods and services, pay for information, and gain favors. Coins come in a single denomination: Gold Pieces (GP). Each coin weighs approximately one-third of an ounce. Fifty coins weigh one pound.",
        ],
      },
      {
        heading: "Weapons: reading the table",
        body: [
          "The Weapons table in this section shows the game's main weapons. The table lists the weight of each weapon, as well as the following details:",
          "Category. Every weapon falls into a category: Simple or Martial. Weapon proficiencies are usually tied to one of these categories. For example, you might have proficiency with Simple weapons.",
          "Melee or Ranged. A weapon is classified as either Melee or Ranged. A Melee weapon is used to attack a target within 5 feet, whereas a Ranged weapon is used to attack at a greater distance.",
          "Damage. The table lists the amount of damage a weapon deals when an attacker hits with it as well as the type of that damage.",
          "Properties. Any properties a weapon has are listed in the Properties column. Each property is defined in the “Weapon properties” section.",
          "Mastery. Each weapon has a mastery property, which is defined in the “Mastery properties” section later in this chapter. To use that property, you must have a feature that lets you use it.",
          "Improvised Weapons. If you use an object — such as a table leg, frying pan, or bottle — as a makeshift weapon, see “Improvised Weapons” in the rules glossary. Also see those rules if you wield a weapon in an unusual way, such as using a Ranged weapon to make a melee attack.",
          "Weapon Proficiency. Anyone can wield a weapon, but you must have proficiency with it to add your Proficiency Bonus to an attack roll you make with it. A player character's features can provide weapon proficiencies. A monster is proficient with any weapon in its stat block.",
        ],
      },
      {
        heading: "Weapons table",
        body: [
          "Name — Category — Damage — Properties — Mastery — Weight — Carrying Category:",
          "Club — Simple Melee — 1d4 Bludgeoning — Light — Slow — 2 lb. — Significant Item.",
          "Dagger — Simple Melee — 1d4 Piercing — Finesse, Light, Thrown (20/60) — Nick — 1 lb. — Significant Item.",
          "Greatclub — Simple Melee — 1d8 Bludgeoning — Two-Handed — Push — 10 lb. — Oversized Item.",
          "Handaxe — Simple Melee — 1d6 Slashing — Light, Thrown (20/60) — Vex — 2 lb. — Significant Item.",
          "Javelin — Simple Melee — 1d6 Piercing — Thrown (30/120) — Slow — 2 lb. — Significant Item (back).",
          "Light Hammer — Simple Melee — 1d4 Bludgeoning — Light, Thrown (20/60) — Nick — 2 lb. — Significant Item.",
          "Mace — Simple Melee — 1d6 Bludgeoning — — — Sap — 4 lb. — Significant Item.",
          "Sickle — Simple Melee — 1d4 Slashing — Light — Nick — 2 lb. — Significant Item.",
          "Spear — Simple Melee — 1d6 Piercing — Thrown (20/60), Versatile (1d8) — Sap — 3 lb. — Oversized Item.",
          "Throwing Knife — Simple Ranged — 1d4 Piercing — Finesse, Thrown (20/60) — Vex — 1/4 lb. — Insignificant Item.",
          "Battleaxe — Martial Melee — 1d8 Slashing — Versatile (1d10) — Topple — 4 lb. — Significant Item.",
          "Flail — Martial Melee — 1d8 Bludgeoning — — — Sap — 2 lb. — Significant Item.",
          "Glaive — Martial Melee — 1d10 Slashing — Heavy, Reach, Two-Handed — Graze — 12 lb. — Oversized Item.",
          "Greataxe — Martial Melee — 1d12 Slashing — Heavy, Two-Handed — Cleave — 14 lb. — Oversized Item.",
          "Greatsword — Martial Melee — 2d6 Slashing — Heavy, Two-Handed — Graze — 14 lb. — Oversized Item.",
          "Halberd — Martial Melee — 1d10 Slashing — Heavy, Reach, Two-Handed — Cleave — 12 lb. — Oversized Item.",
          "Longsword — Martial Melee — 1d8 Slashing — Versatile (1d10) — Sap — 3 lb. — Significant Item.",
          "Maul — Martial Melee — 2d6 Bludgeoning — Heavy, Two-Handed — Topple — 14 lb. — Oversized Item.",
          "Morningstar — Martial Melee — 1d8 Piercing — — — Sap — 4 lb. — Significant Item.",
          "Pike — Martial Melee — 1d10 Piercing — Heavy, Reach, Two-Handed — Push — 12 lb. — Oversized Item.",
          "Rapier — Martial Melee — 1d8 Piercing — Finesse — Vex — 2 lb. — Significant Item.",
          "Scimitar — Martial Melee — 1d6 Slashing — Finesse, Light — Nick — 3 lb. — Significant Item.",
          "Shortsword — Martial Melee — 1d6 Piercing — Finesse, Light — Vex — 2 lb. — Significant Item.",
          "Trident — Martial Melee — 1d8 Piercing — Thrown (20/60), Versatile (1d10) — Topple — 12 lb. — Oversized Item.",
          "Warhammer — Martial Melee — 1d8 Bludgeoning — Versatile (1d10) — Push — 5 lb. — Significant Item.",
          "War Pick — Martial Melee — 1d8 Piercing — Versatile (1d10) — Sap — 2 lb. — Significant Item.",
          "Whip — Martial Melee — 1d4 Slashing — Finesse, Reach — Slow — 3 lb. — Significant Item.",
          "Hunter Rifle — Martial Ranged — 1d10 Piercing — Ammunition (100/400; Bullet), Two-Handed — Slow — 10 lb. — Significant Item (back).",
          "Pistol — Martial Ranged — 1d10 Piercing — Ammunition (30/90; Bullet) — Vex — 3 lb. — Significant Item.",
        ],
      },
      {
        heading: "Weapon properties",
        body: [
          "Here are definitions of the properties in the Properties column of the Weapons table.",
          "Ammunition. You can use a weapon that has the Ammunition property to make a ranged attack only if you have ammunition to fire from it. The type of ammunition required is specified with the weapon's range. Each attack expends one piece of ammunition. Drawing the ammunition is part of the attack (you need a free hand to load a one-handed weapon). After a fight, you can spend 1 minute to recover half the ammunition (round down) you used in the fight; the rest is lost.",
          "Finesse. When making an attack with a Finesse weapon, use your choice of your Strength or Dexterity modifier for the attack and damage rolls. You must use the same modifier for both rolls.",
          "Heavy. You have Disadvantage on attack rolls with a Heavy weapon if it's a Melee weapon and your Strength score isn't at least 13 or if it's a Ranged weapon and your Dexterity score isn't at least 13.",
          "Light. When you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn. That extra attack must be made with a different Light weapon, and you don't add your ability modifier to the extra attack's damage unless that modifier is negative. For example, you can attack with a Shortsword in one hand and a Dagger in the other using the Attack action and a Bonus Action, but you don't add your Strength or Dexterity modifier to the damage roll of the Bonus Action unless that modifier is negative.",
          "Loading. You can fire only one piece of ammunition from a Loading weapon when you use an action, a Bonus Action, or a Reaction to fire it, regardless of the number of attacks you can normally make.",
          "Range. A Range weapon has a range in parentheses after the Ammunition or Thrown property. The range lists two numbers. The first is the weapon's normal range in feet, and the second is the weapon's long range. When attacking a target beyond normal range, you have Disadvantage on the attack roll. You can't attack a target beyond the long range.",
          "Reach. A Reach weapon adds 5 feet to your reach when you attack with it, as well as when determining your reach for Opportunity Attacks with it.",
          "Thrown. If a weapon has the Thrown property, you can throw the weapon to make a ranged attack, and you can draw that weapon as part of the attack. If the weapon is a Melee weapon, use the same ability modifier for the attack and damage rolls that you use for a melee attack with that weapon.",
          "Two-Handed. A Two-Handed weapon requires two hands when you attack with it.",
          "Versatile. A Versatile weapon can be used with one or two hands. A damage value in parentheses appears with the property. The weapon deals that damage when used with two hands to make a melee attack.",
        ],
      },
      {
        heading: "Mastery properties",
        body: [
          "Each weapon has a mastery property, which is usable only by a character who has a feature, such as Weapon Mastery, that unlocks the property for the character. The properties are defined below.",
          "Cleave. If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon's damage, but don't add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn.",
          "Graze. If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is the same type dealt by the weapon, and the damage can be increased only by increasing the ability modifier.",
          "Nick. When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn.",
          "Push. If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller.",
          "Sap. If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.",
          "Slow. If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn't exceed 10 feet.",
          "Topple. If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition.",
          "Vex. If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn.",
        ],
      },
      {
        heading: "Tools",
        body: [
          "Tools can be utilized in certain ways or can craft items, or both. A tool can be used repeatedly until it breaks, is expended through crafting, or is otherwise destroyed. A tool's description includes the tool's weight, as well as the following entries:",
          "Ability. This entry lists the ability to use when making an ability check with the tool.",
          "Utilize. This entry lists things you can do with the tool when you take the Utilize action. You can do one of those things each time you take the action. This entry also provides the DC for the action. A tool breaks and is expended if you roll a 1 on the d20 for the ability check, or if the total result of the check is more than 5 lower than the DC.",
          "Craft. This entry lists what, if anything, can be crafted with the tool. You can craft only one of those items each time you use the tool to craft. When you craft with a tool, the tool is expended and removed from your inventory, replaced by the crafted item. Crafting can only be performed during a Short or Long Rest. A character who crafts during a Short Rest gains none of the normal benefits of that Short Rest.",
          "Tool Proficiency. If you have proficiency with a tool, add your Proficiency Bonus to any ability check you make that uses the tool. Your features might give you proficiency with a tool. A monster has proficiency with any tool in its stat block.",
        ],
      },
      {
        heading: "Artisan's Tools",
        body: [
          "Artisan's Tools are each focused on crafting items. Each of these tools requires a separate proficiency.",
          "Alchemist's Supplies — Ability: Intelligence; Weight: 8 lb.; Utilize: Identify a substance (DC 15); Craft: Acid (3 vials), Oil (1 flask).",
          "Carpenter's Tools — Ability: Strength; Weight: 6 lb.; Utilize: Seal or pry open a door or container (DC 20); Craft: Club, Greatclub, Barrel, Chest, Ladder, Pole, Portable Ram, Torch.",
          "Cultist's Tools — Ability: Intelligence; Weight: 8 lb.; Utilize: Chisel a symbol or hole in stone (DC 10); Craft: Block and Tackle.",
          "Poisoner's Kit — Ability: Intelligence; Weight: 2 lb.; Utilize: Detect a poisoned object or drink (DC 10); Craft: Basic Poison (1 vial), Antitoxin (1 vial).",
          "Smith's Tools — Ability: Dexterity; Weight: 10 lb.; Craft: Hunter Rifle, Pistol, Bell, Bullseye Lantern, Hooded Lantern, Hunting Trap, Lock, Manacles, Mirror, Shovel, Signal Whistle, Tinderbox.",
        ],
      },
      {
        heading: "Other Tools",
        body: [
          "These tools may be useful for any hunt.",
          "Blood-drainer's Tools — Ability: Constitution; Weight: 2 lb.; Utilize: Identify the purity of blood within a Bloodvial (DC 10), or drain blood from a creature that is Incapacitated, Paralyzed, Restrained, Unconscious, or has been Dead for no longer than 1 round. A creature can only be drained once. Make a Constitution check when draining blood: DC 10 — obtain 1 Bloodvial; DC 20 — obtain 2 Bloodvials; DC 30 — obtain 3 Bloodvials. The creature drained determines the purity of the Bloodvials obtained.",
          "Navigator's Tools — Ability: Wisdom; Weight: 2 lb.; Utilize: Plot a course (DC 10), or determine position by stargazing (DC 15).",
          "Thieves' Tools — Ability: Dexterity; Weight: 1 lb.; Utilize: Pick a lock (DC 15), or disarm a trap (DC 15).",
        ],
      },
      {
        heading: "Hunting Gear: Hunting Trap",
        body: [
          "The Hunting Gear tables in the handbook include gear that hunters often find useful. One item deserves its full rules here:",
          "Hunting Trap. As a Utilize action, you can set a Hunting Trap, which is a sawtooth steel ring that snaps shut when a creature steps on a pressure plate in the center. The trap is affixed by a heavy chain to an immobile object, such as a tree or a spike driven into the ground. A creature that steps on the plate must succeed on a DC 13 Dexterity saving throw or take 1d4 Piercing damage and have its Speed reduced to 0 until the start of its next turn. Thereafter, until the creature breaks free of the trap, its movement is limited by the length of the chain (typically 3 feet). A creature can use its action to make a DC 13 Strength (Athletics) check, freeing itself or another creature within its reach on a success. Each failed check deals 1 Piercing damage to the trapped creature.",
          "Hunting Trap — Weight: 25 lb.; Carrying Category: Significant Item.",
        ],
      },
    ],
  },
];
