/** What every part of the paper sheet means, how to fill it in, and where the
 * handbook covers it. `pdfPage` cites the printable handbook PDF (it only
 * covers character creation, pp. 3–14); `link` deep-links into the app's
 * Handbook (or the Rules Reference) — opened in a new tab by the info dots. */
export interface SheetInfo {
  title: string;
  text: string;
  /** Page in the downloadable handbook PDF, when the topic exists there. */
  pdfPage?: number;
  /** Human-readable "where to read more": tab / chapter → section. */
  refTitle: string;
  /** App deep link (Handbook tab/chapter/section, or Rules Reference query). */
  link: string;
}

const rules = (chapter: string, section: string) =>
  `/handbook?tab=rules&chapter=${chapter}&section=${section}`;
const tab = (t: string) => `/handbook?tab=${t}`;
const ref = (q: string) => `/reference?q=${encodeURIComponent(q)}`;

export const SHEET_INFO: Record<string, SheetInfo> = {
  name: {
    title: "Your Name",
    text: "Your real name — so the table knows whose sheet this is. Your hunter takes shape through the numbered steps.",
    pdfPage: 3,
    refTitle: "Rules → Welcome, Hunter → The five steps",
    link: rules("intro", "the-five-steps"),
  },
  background: {
    title: "Background",
    text: "What your hunter was before the hunt. A background grants an Origin feat, two skill proficiencies, one tool and ability points — write its name here.",
    pdfPage: 4,
    refTitle: "Rules → Step 2 — Determine a Background",
    link: rules("step-2-background", "what-you-were-before"),
  },
  class: {
    title: "Class",
    text: "Step 1: pick one of the six classes (Brute, Scout, Stalker, Deepcaller, Bloodbound, Warden) and write it here. It sets your hit die, saves, training and features.",
    pdfPage: 3,
    refTitle: "Rules → Step 1 — Choose a Class · Classes tab",
    link: rules("step-1-class", "pick-your-hunter"),
  },
  subclass: {
    title: "Subclass",
    text: "Chosen at level 3 — leave it empty until then. Each class's subclasses are listed on its page in the Classes tab.",
    refTitle: "Handbook → Classes tab",
    link: tab("classes"),
  },
  level: {
    title: "Level",
    text: "Start at 1. The DM awards Insight; when you cross a threshold you level up after a Long Rest. Your class table shows what each level grants.",
    pdfPage: 3,
    refTitle: "Handbook → Classes tab (progression tables)",
    link: tab("classes"),
  },
  insight: {
    title: "Insight",
    text: "The campaign's XP currency, awarded by the DM. Track your total here — it decides the level you have earned.",
    refTitle: "Handbook → Classes tab (progression tables)",
    link: tab("classes"),
  },
  transformation: {
    title: "Transformation Level",
    text: "How far the hunt has changed you (0–10). Gains are rolled at the table and recorded by the DM; rests reduce it. Starts at 0.",
    refTitle: "Rules → Transformation",
    link: rules("transformation", "transformation-level"),
  },
  sanity: {
    title: "Sanity",
    text: "Your mind's hit points. Max Sanity = class base + WIS modifier; your class also sets your Sanity Dice. At 0 you gain the Insane condition — tick the box.",
    refTitle: "Rules → Sanity, Madness & Blood Tinge",
    link: rules("sanity", "your-sanity-pool"),
  },
  hp: {
    title: "Hit Points",
    text: "Max HP at level 1 = your class's hit die + CON modifier. Track current and temporary HP here during play.",
    pdfPage: 3,
    refTitle: "Handbook → Classes tab (hit die per class)",
    link: tab("classes"),
  },
  hitDice: {
    title: "Hit Dice",
    text: "You have one hit die per level (the die comes from your class). Spend them on Short Rests to heal; mark spent ones here.",
    pdfPage: 3,
    refTitle: "Handbook → Classes tab",
    link: tab("classes"),
  },
  deathSaves: {
    title: "Death Saves",
    text: "At 0 HP, roll a d20 each turn: 10+ is a success, else a failure. Three successes stabilize you; three failures and the hunt ends.",
    refTitle: "Rules Reference → Death Saving Throws",
    link: ref("death saving throw"),
  },
  profBonus: {
    title: "Proficiency Bonus",
    text: "+2 at level 1, rising with level (see your class table). Add it to rolls you're proficient in — marked skills, saves, weapons.",
    pdfPage: 4,
    refTitle: "Rules → Step 2 → Record your feat & proficiencies",
    link: rules("step-2-background", "record-your-feat-proficiencies"),
  },
  abilities: {
    title: "Ability Scores",
    text: "Step 3: buy scores with the 27-point buy, add your background's points, then write each modifier ((score − 10) ÷ 2, round down). Fill each skill line with modifier (+ proficiency bonus if its dot is marked).",
    pdfPage: 5,
    refTitle: "Rules → Step 3 — Determine Ability Scores",
    link: rules("step-3-abilities", "assign-ability-scores-point-buy"),
  },
  bloodTinge: {
    title: "Blood Tinge",
    text: "The C&S take on heroic inspiration — the DM grants it; spend it to reroll. Mark whether you hold it in the drop.",
    refTitle: "Rules → Sanity, Madness & Blood Tinge → Blood Tinge",
    link: rules("sanity", "blood-tinge"),
  },
  initiative: {
    title: "Initiative",
    text: "Your Dexterity modifier — added to the d20 roll that sets combat order.",
    refTitle: "Rules Reference → Initiative",
    link: ref("initiative"),
  },
  speed: {
    title: "Speed",
    text: "How far you move in a round, in feet — set by your class. Heavy carried weight can slow it (see Weight Condition).",
    pdfPage: 3,
    refTitle: "Handbook → Classes tab",
    link: tab("classes"),
  },
  passivePerception: {
    title: "Passive Perception",
    text: "10 + your Perception modifier — what you notice without actively searching.",
    refTitle: "Rules Reference → Perception",
    link: ref("passive perception"),
  },
  ac: {
    title: "Armor Class",
    text: "Unarmored: 10 + DEX. Otherwise: Main Armor base + Add-on bonuses + Studs, then DEX by weight class. A pauldron + vambrace on the same arm completes a Shield Arm.",
    pdfPage: 13,
    refTitle: "Rules → Step 4 → Calculate your Armor Class",
    link: rules("step-4-armor", "calculate-your-armor-class"),
  },
  armorCategory: {
    title: "Armor Category",
    text: "Light, Medium or Heavy — decided by your total base armor AC. It sets how much DEX applies to your AC.",
    pdfPage: 13,
    refTitle: "Rules → Step 4 → Calculate your Armor Class",
    link: rules("step-4-armor", "calculate-your-armor-class"),
  },
  weight: {
    title: "Weight",
    text: "Everything you carry, in pounds — worn armor counts. Compare it against your carrying capacity.",
    pdfPage: 13,
    refTitle: "Rules → Carrying & Encumbrance → Carried weight",
    link: rules("carrying", "carried-weight"),
  },
  weightCondition: {
    title: "Weight Condition",
    text: "How loaded you are (fine / heavy / over-encumbered) from the carried-weight table — heavy loads slow you down.",
    pdfPage: 13,
    refTitle: "Rules → Carrying & Encumbrance → Carried weight",
    link: rules("carrying", "carried-weight"),
  },
  mainArmor: {
    title: "Main Armor",
    text: "Your torso piece — it sets your base AC. Pick one from the Armory and write it (with its AC) here.",
    pdfPage: 8,
    refTitle: "Handbook → Armory tab (Main Armor)",
    link: tab("armory"),
  },
  extras: {
    title: "Extras (hats, scarves, gloves, boots)",
    text: "AC 0 flavour and utility pieces — you may wear ONE per slot. Each gives off an Impression while worn, and some hide transformations.",
    pdfPage: 11,
    refTitle: "Handbook → Armory tab (Extras)",
    link: tab("armory"),
  },
  addons: {
    title: "Add-on Armor & Studs",
    text: "Up to five bonus-AC pieces worn over your Main Armor. The Studs upgrade adds +1 AC if any piece is studded (+2 if all five), at +3 lb per studded piece.",
    pdfPage: 8,
    refTitle: "Handbook → Armory tab (Add-ons & Upgrades)",
    link: tab("armory"),
  },
  coins: {
    title: "Coins",
    text: "Gold pieces — the only currency. Your background sets your starting purse.",
    refTitle: "Handbook → Backgrounds tab",
    link: tab("backgrounds"),
  },
  impressions: {
    title: "Impressions",
    text: "What your worn gear says about you — each Extra lists the impression it gives off. NPCs read you by these lines.",
    pdfPage: 11,
    refTitle: "Rules → Step 4 → See your hunter in the world",
    link: rules("step-4-armor", "see-your-hunter-in-the-world"),
  },
  special: {
    title: "Special",
    text: "Special properties of your worn armor (from the Armory tables) and any other standing effects worth keeping in view.",
    pdfPage: 8,
    refTitle: "Handbook → Armory tab",
    link: tab("armory"),
  },
  storageItems: {
    title: "Storage Items",
    text: "Worn containers — sack, backpack, bandolier, tool belt. They occupy body slots and expand what you can carry.",
    pdfPage: 14,
    refTitle: "Rules → Carrying & Encumbrance → Item slots",
    link: rules("carrying", "item-slots"),
  },
  slots: {
    title: "Storage Slots",
    text: "Significant items each occupy a body slot (hand, back, hip, chest, ankle); oversized items need a hand. Write what sits where.",
    pdfPage: 13,
    refTitle: "Rules → Carrying & Encumbrance → Item slots",
    link: rules("carrying", "item-slots"),
  },
  training: {
    title: "Armor Training",
    text: "Which armor weights you can wear without penalty — granted by your class. Tick what you have.",
    pdfPage: 4,
    refTitle: "Handbook → Classes tab (armor training)",
    link: tab("classes"),
  },
  weaponsProf: {
    title: "Weapon Proficiencies",
    text: "Simple and/or martial weapon training from your class — you add your proficiency bonus with weapons you're trained in.",
    pdfPage: 4,
    refTitle: "Handbook → Classes tab (proficiencies)",
    link: tab("classes"),
  },
  tools: {
    title: "Tools",
    text: "Tool proficiencies from your class and background — list them here.",
    pdfPage: 4,
    refTitle: "Handbook → Backgrounds tab",
    link: tab("backgrounds"),
  },
  equipment: {
    title: "Equipment (All)",
    text: "Every item you own: its carrying category (insignificant / significant / oversized), the slot it occupies, and its weight.",
    pdfPage: 13,
    refTitle: "Rules → Carrying & Encumbrance",
    link: rules("carrying", "carried-weight"),
  },
  weaponDamage: {
    title: "Weapon Damage",
    text: "One line per weapon: attack bonus = ability modifier + proficiency (if trained), the damage dice + type, and any properties in notes.",
    refTitle: "Rules Reference → Attack rolls",
    link: ref("attack roll"),
  },
  classFeatures: {
    title: "Class Features",
    text: "Copy the features your class (and subclass) grants at your level — the Classes tab lists them level by level.",
    refTitle: "Handbook → Classes tab (features)",
    link: tab("classes"),
  },
  feats: {
    title: "Feats",
    text: "Your background's Origin feat, plus any feats picked at level-ups. Full descriptions live in the Feats tab.",
    pdfPage: 4,
    refTitle: "Handbook → Feats tab",
    link: tab("feats"),
  },
  rites: {
    title: "Whispers and Rites",
    text: "Deepcaller only. Rites key off Intelligence: modifier = INT, save DC = 8 + INT + proficiency, attack = INT + proficiency.",
    refTitle: "Handbook → Rites tab",
    link: tab("rites"),
  },
  preparedWhispers: {
    title: "Prepared Whispers",
    text: "The Whispers you have readied — level, performing time, range and duration come from each rite's entry in the Rites tab.",
    refTitle: "Handbook → Rites tab",
    link: tab("rites"),
  },
};
