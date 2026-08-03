export const GAME_CARD_CATEGORIES = [
  "Turns & combat",
  "Conditions",
  "Movement & exploration",
  "Character & rites",
  "Equipment",
  "Transformation",
] as const;

export type GameCardCategory = (typeof GAME_CARD_CATEGORIES)[number];

export interface GameCardTable {
  caption?: string;
  columns: string[];
  rows: string[][];
}

export interface GameCardEntry {
  id: string;
  term: string;
  category: GameCardCategory;
  aliases?: string[];
  /** Searchable text, including flattened table rows. */
  body: string[];
  /** Paragraphs shown above any tables. */
  paragraphs: string[];
  tables?: GameCardTable[];
  sourcePage: number;
}

type EntryInput = Omit<GameCardEntry, "body" | "paragraphs"> & {
  paragraphs: string[];
  tables?: GameCardTable[];
};

function entry(input: EntryInput): GameCardEntry {
  const tableText = (input.tables ?? []).flatMap((table) => [
    table.caption ?? "",
    table.columns.join(" "),
    ...table.rows.map((row) => row.join(" ")),
  ]);
  return { ...input, body: [...input.paragraphs, ...tableText].filter(Boolean) };
}

function simple(
  id: string,
  term: string,
  category: GameCardCategory,
  sourcePage: number,
  paragraphs: string[],
  aliases?: string[],
): GameCardEntry {
  return entry({ id, term, category, sourcePage, paragraphs, aliases });
}

const turnEntries: GameCardEntry[] = [
  simple("attack", "Attack", "Turns & combat", 1, ["Take the Attack action using the weapon, unarmed strike, or feature available to your hunter."], ["action", "strike"]),
  simple("perform-rite", "Perform a Rite or Whisper", "Turns & combat", 1, ["Perform a Rite or Whisper using its listed performing time, range, duration, and effect."], ["cast", "magic"]),
  simple("climb-bigger-creature", "Climb onto a Bigger Creature", "Turns & combat", 1, ["Use the optional climbing-on-a-bigger-creature rules when the DM allows it."], ["mount creature"]),
  simple("dash", "Dash", "Turns & combat", 1, ["Move up to twice your current movement."], ["run", "sprint"]),
  simple("disarm", "Disarm", "Turns & combat", 1, ["Make an opposed Strength or Dexterity check. The opponent has disadvantage if it is holding the object with both hands."], ["drop weapon"]),
  simple("disengage", "Disengage", "Turns & combat", 1, ["Your movement does not provoke opportunity attacks until your next turn."], ["withdraw", "retreat"]),
  simple("dodge", "Dodge", "Turns & combat", 1, ["Attacks against you have disadvantage, and you make Dexterity rolls with advantage. The benefit ends if you are incapacitated or your speed drops to 0."], ["defend", "evade"]),
  simple("help", "Help", "Turns & combat", 1, ["Give another creature advantage on an attack or ability check."], ["assist", "aid"]),
  simple("search", "Search", "Turns & combat", 1, ["Devote your attention to finding something. Depending on the search, the DM may call for Wisdom (Perception) or Intelligence (Investigation)."], ["find", "perception", "investigation"]),
  simple("hide", "Hide", "Turns & combat", 1, ["Make a Dexterity (Stealth) check against the opposing Wisdom (Perception) check."], ["stealth"]),
  simple("overrun", "Overrun", "Turns & combat", 1, ["Make a Strength versus Strength check to move through an opponent's space."], ["move through enemy"]),
  simple("tumble", "Tumble", "Turns & combat", 1, ["Make a Dexterity versus Dexterity check to move through an opponent's space."], ["move through enemy"]),
  simple("ready", "Ready", "Turns & combat", 1, ["Choose a trigger and the reaction you will take in response, or ready a Rite and hold its release."], ["readied action", "trigger"]),
  simple("shove", "Shove or Shove Aside", "Turns & combat", 1, ["Contest Strength against Strength or Dexterity to push an opponent 5 feet back, to the side, or prone."], ["push", "prone"]),
  simple("use-object", "Use an Object", "Turns & combat", 1, ["You can interact with one object for free during your turn, such as drawing a weapon or opening a door. Use this action to interact with a second object."], ["item interaction"]),
  simple("escape", "Escape a Grapple", "Turns & combat", 1, ["Make Strength (Athletics) or Dexterity (Acrobatics) contested by the grappler's Strength (Athletics). Other restraints may require a check chosen by the DM."], ["break grapple", "restrained"]),
  simple("bonus-action", "Bonus Action", "Turns & combat", 1, ["You can take a bonus action only when a feature, Rite, or other rule explicitly says you can do something as a bonus action."], ["offhand"]),
  simple("offhand-attack", "Offhand Attack", "Turns & combat", 1, ["After attacking with a light melee weapon, make one attack with a different light melee weapon held in the other hand. Do not add your ability modifier to the damage unless it is negative. A thrown weapon may be thrown instead."], ["two weapon fighting", "bonus attack"]),
  simple("reaction", "Reaction", "Turns & combat", 1, ["A reaction is an instant response to a trigger and can occur on your turn or someone else's turn."], ["trigger"]),
  simple("opportunity-attack", "Opportunity Attack", "Turns & combat", 1, ["When an enemy leaves your reach, use your reaction to make one melee attack before it moves away. Teleportation and forced movement do not provoke this attack."], ["reaction attack", "leaves reach"]),
  simple("readied-reaction", "Readied Action", "Turns & combat", 1, ["When the trigger you specified occurs, use your reaction to execute the action prepared with Ready."], ["ready", "trigger"]),
];

const conditionEntries: GameCardEntry[] = [
  simple("blinded", "Blinded", "Conditions", 1, ["You cannot see and automatically fail checks that require sight. Attacks against you have advantage; your attacks have disadvantage."], ["blind"]),
  simple("charmed", "Charmed", "Conditions", 1, ["You cannot attack the charmer or target it with harmful abilities or effects. The charmer has advantage on checks to interact socially with you."], ["charm"]),
  simple("deafened", "Deafened", "Conditions", 1, ["You cannot hear and automatically fail checks that require hearing."], ["deaf"]),
  simple("exhaustion", "Exhaustion", "Conditions", 1, ["Exhaustion has six cumulative levels: disadvantage on ability checks; speed halved; disadvantage on attacks and saves; hit point maximum halved; speed 0; death. A long rest reduces exhaustion by one level."], ["fatigue", "tired"]),
  simple("frightened", "Frightened", "Conditions", 1, ["You have disadvantage on ability checks and attack rolls while the source of fear is in sight, and cannot willingly move closer to it."], ["fear", "afraid"]),
  simple("grappled", "Grappled", "Conditions", 1, ["Your speed becomes 0 and cannot benefit from bonuses. The condition ends if the grappler is incapacitated or you are moved outside its reach."], ["grabbed", "held"]),
  simple("incapacitated", "Incapacitated", "Conditions", 1, ["You cannot take actions or reactions."], ["helpless"]),
  simple("invisible", "Invisible", "Conditions", 1, ["You cannot be seen without magic or a special sense and are heavily obscured for hiding. Your location can still be revealed by sound or tracks. Attacks against you have disadvantage; your attacks have advantage."], ["unseen"]),
  simple("paralyzed", "Paralyzed", "Conditions", 1, ["You are incapacitated and cannot move or speak. You fail Strength and Dexterity saves; attacks against you have advantage, and a hit from within 5 feet is critical."], ["paralysis"]),
  simple("petrified", "Petrified", "Conditions", 1, ["You and nonmagical carried objects become solid inanimate substance. You are incapacitated, unaware, ten times heavier, and stop aging. You fail Strength and Dexterity saves, resist all damage, and are immune to poison and disease."], ["stone"]),
  simple("poisoned", "Poisoned", "Conditions", 1, ["You have disadvantage on attack rolls and ability checks."], ["poison"]),
  simple("prone", "Prone", "Conditions", 1, ["You can only crawl until you stand. Your attacks have disadvantage. Attacks from within 5 feet have advantage against you; attacks from farther away have disadvantage."], ["knocked down"]),
  simple("restrained", "Restrained", "Conditions", 1, ["Your speed becomes 0. Attacks against you have advantage, your attacks have disadvantage, and you have disadvantage on Dexterity saves."], ["bound"]),
  simple("stunned", "Stunned", "Conditions", 1, ["You are incapacitated, cannot move, and can speak only falteringly. You fail Strength and Dexterity saves, and attacks against you have advantage."], ["dazed"]),
  simple("unconscious", "Unconscious", "Conditions", 1, ["You are incapacitated, cannot move or speak, are unaware, drop held objects, and fall prone. You fail Strength and Dexterity saves; attacks have advantage, and a hit from within 5 feet is critical."], ["knocked out"]),
  // The source PDF contains the DM-only mechanics on page 5. Project rules
  // deliberately keep those mechanics out of player-facing app surfaces.
  simple("insane", "Insane", "Conditions", 5, ["You gain the Insane condition when current Madness equals or exceeds Max Sanity. It ends when Madness is reduced below Max Sanity. Your DM resolves the condition's hidden effects."], ["madness", "sanity"]),
];

const movementEntries: GameCardEntry[] = [
  simple("movement", "Movement", "Movement & exploration", 1, ["Each 5 feet moved costs 5 feet of speed. You may switch between movement speeds, subtracting distance already moved. Other creatures' spaces are difficult terrain, and you cannot willingly end movement in another creature's space."], ["move", "speed"]),
  simple("climb", "Climb", "Movement & exploration", 1, ["Each 5 feet climbed costs 10 feet of movement. A difficult climb may require Strength (Athletics)."], ["athletics"]),
  simple("swim", "Swim", "Movement & exploration", 1, ["Each 5 feet swum costs 10 feet of movement. Difficult water may require Strength (Athletics)."], ["water"]),
  simple("drop-prone", "Drop Prone", "Movement & exploration", 1, ["Dropping prone costs no movement. While prone you must crawl or use magic to move."], ["fall prone"]),
  simple("crawl", "Crawl", "Movement & exploration", 1, ["Each 5 feet crawled costs 10 feet of movement."], ["prone movement"]),
  simple("stand-up", "Stand Up", "Movement & exploration", 1, ["Standing costs half your speed. You cannot stand without enough movement remaining or when your speed is 0."], ["rise", "prone"]),
  simple("high-jump", "High Jump", "Movement & exploration", 1, ["With a 10-foot run-up, leap 3 + Strength modifier feet. A standing jump covers half that distance. The DM may allow Strength (Athletics) to jump higher."], ["jump height"]),
  simple("long-jump", "Long Jump", "Movement & exploration", 1, ["With a 10-foot run-up, leap up to your Strength score in feet. A standing jump covers half. Obstacles may require DC 10 Strength (Athletics), and landing in difficult terrain may require DC 10 Dexterity (Acrobatics)."], ["jump distance"]),
  simple("difficult-terrain", "Difficult Terrain", "Movement & exploration", 1, ["Moving through difficult terrain costs an additional 5 feet for every 5 feet moved."], ["rough ground"]),
  simple("grapple-move", "Move a Grappled Creature", "Movement & exploration", 1, ["You may drag or carry a grappled creature. Your speed is halved unless it is at least two sizes smaller than you."], ["drag", "carry"]),
  entry({
    id: "environmental-effects",
    term: "Environmental Effects & Light",
    category: "Movement & exploration",
    sourcePage: 2,
    aliases: ["obscured", "darkness", "vision"],
    paragraphs: ["Vision depends on obscurity and illumination. A heavily obscured area effectively blinds a creature trying to see through it."],
    tables: [{
      columns: ["Area", "Effect", "Examples"],
      rows: [
        ["Lightly obscured", "Disadvantage on Wisdom (Perception) checks relying on sight", "Dim light, patchy fog, moderate foliage"],
        ["Heavily obscured", "Effectively blinded", "Darkness, opaque fog, dense foliage"],
        ["Bright light", "Normal vision", "Daylight, strong lamps, nearby fire"],
        ["Dim light", "Lightly obscured", "Twilight, dawn, shadows"],
        ["Darkness", "Heavily obscured", "Night, unlit catacombs, magical darkness"],
      ],
    }],
  }),
  entry({
    id: "special-senses",
    term: "Special Senses",
    category: "Movement & exploration",
    sourcePage: 2,
    aliases: ["blindsight", "darkvision", "truesight"],
    paragraphs: ["Some creatures perceive their environment through extraordinary senses."],
    tables: [{
      columns: ["Sense", "What it does"],
      rows: [
        ["Blindsight", "Perceive surroundings within range without relying on sight"],
        ["Darkvision", "Within range, darkness appears as dim light and dim light as bright light; color is not discerned"],
        ["Truesight", "See through normal and magical darkness, perceive invisible creatures, detect visual illusions and transformations, and see into other planes within range"],
      ],
    }],
  }),
  simple("suffocating", "Suffocating", "Movement & exploration", 2, ["Hold breath for 10 × (1 + Constitution modifier) rounds, minimum 5. After breath runs out, survive for Constitution modifier rounds; at the start of the next turn, drop to 0 HP and begin dying."], ["drowning", "breath"]),
  entry({
    id: "size-categories",
    term: "Size Categories",
    category: "Movement & exploration",
    sourcePage: 2,
    paragraphs: [],
    tables: [{ columns: ["Size", "Space"], rows: [["Tiny", "2½ by 2½ ft"], ["Small", "5 by 5 ft"], ["Medium", "5 by 5 ft"], ["Large", "10 by 10 ft"], ["Huge", "15 by 15 ft"], ["Gargantuan", "20 by 20 ft or larger"]] }],
  }),
  entry({
    id: "cover",
    term: "Cover",
    category: "Movement & exploration",
    sourcePage: 2,
    paragraphs: ["A target with total cover cannot be targeted directly, but may still be affected by area effects."],
    tables: [{ columns: ["Cover", "AC and Dexterity save bonus"], rows: [["Half cover", "+2"], ["Three-quarters cover", "+5"], ["Total cover", "Cannot be targeted directly"]] }],
  }),
  entry({
    id: "doors-and-locks",
    term: "Doors, Secret Doors & Locks",
    category: "Movement & exploration",
    sourcePage: 8,
    aliases: ["force door", "unlock", "secret door"],
    paragraphs: ["For bigger doors, double or triple the Hit Points and increase the force-open DC by 5."],
    tables: [
      { caption: "Force open a door", columns: ["Door", "AC", "HP", "DC (Strength, Athletics)"], rows: [["Glass", "13", "4", "10"], ["Metal", "19", "72", "25"], ["Stone", "17", "40", "20"], ["Wooden", "15", "18", "15"]] },
      { caption: "Secret doors", columns: ["Door", "Detection DC (Wisdom, Perception)"], rows: [["Barely hidden", "10"], ["Standard", "15"], ["Well-hidden", "20"]] },
      { caption: "Lock complexity", columns: ["Complexity", "Time"], rows: [["Simple", "1 action"], ["Complex", "10 rounds"]] },
      { caption: "Lock quality", columns: ["Quality", "Unlock DC (Dexterity, Sleight of Hand)"], rows: [["Inferior", "10"], ["Good", "15"], ["Superior", "20"]] },
    ],
  }),
  entry({
    id: "chases",
    term: "Chases & Escapes",
    category: "Movement & exploration",
    sourcePage: 9,
    aliases: ["pursuit", "quarry", "escape"],
    paragraphs: [
      "During a chase, a participant can Dash 3 + Constitution modifier times. Each additional Dash requires a DC 10 Constitution check at the end of the turn or causes one Exhaustion level.",
      "At the end of each round, each quarry makes Dexterity (Stealth), compared with pursuers' passive Perception. If the quarry is never out of sight, the check fails. A higher result lets the quarry escape; otherwise the chase continues.",
    ],
    tables: [{
      caption: "Escape factors",
      columns: ["Factor", "Effect on Stealth"],
      rows: [
        ["Many things to hide behind", "Advantage"],
        ["Very crowded or noisy area", "Advantage"],
        ["Few things to hide behind", "Disadvantage"],
        ["Uncrowded or quiet area", "Disadvantage"],
        ["Lead pursuer is a ranger or proficient in Survival", "Disadvantage"],
      ],
    }],
  }),
  entry({
    id: "chase-complications",
    term: "Chase Complications",
    category: "Movement & exploration",
    sourcePage: 9,
    aliases: ["urban chase", "wilderness chase", "d20"],
    paragraphs: ["At the end of a participant's turn, roll d20 on the appropriate table. On 11–20 there is no complication. A participant may spend inspiration to negate a complication."],
    tables: [{
      columns: ["d20", "Urban", "Wilderness"],
      rows: [
        ["1", "Horse or cart blocks the way; DC 15 Dexterity (Acrobatics), otherwise 10 feet of difficult terrain", "Rough brush; DC 10 Strength (Athletics) or Dexterity (Acrobatics), otherwise 5 feet of difficult terrain"],
        ["2", "Crowd blocks the way; DC 10 Strength (Athletics) or Dexterity (Acrobatics), otherwise 10 feet of difficult terrain", "Uneven ground; DC 10 Dexterity (Acrobatics), otherwise 10 feet of difficult terrain"],
        ["3", "Stained-glass window or barrier; DC 10 Strength save or fall prone", "Swarm of insects makes an opportunity attack"],
        ["4", "Maze of barrels or crates; DC 10 Dexterity (Acrobatics) or Intelligence, otherwise 10 feet of difficult terrain", "Stream, ravine, or rocks; DC 10 Strength (Athletics) or Dexterity (Acrobatics), otherwise 10 feet of difficult terrain"],
        ["5", "Slippery ground; DC 10 Dexterity save or fall prone", "DC 10 Constitution save or be blinded and slowed until end of next turn"],
        ["6", "Pack of dogs; DC 10 Dexterity (Acrobatics) or take 1d4 piercing damage", "Sudden drop; DC 10 Dexterity save or fall 1d4 × 5 feet, taking damage and landing prone"],
        ["7", "Brawl; DC 15 Strength, Dexterity, or Charisma check or take 2d4 bludgeoning damage", "Hunter's snare; DC 15 Dexterity save or be caught and restrained"],
        ["8", "Beggar blocks the way; DC 10 Strength, Dexterity, or Charisma check or lose movement", "Stampede; DC 10 Dexterity save or take 1d4 bludgeoning damage and 1d4 piercing damage"],
        ["9", "Guard makes an opportunity attack if you move 20 feet or more", "Razorvine; DC 15 Dexterity save or take 1d10 slashing damage"],
        ["10", "Sharp turn; DC 10 Dexterity save or take 1d4 bludgeoning damage", "A local creature gives chase; the DM chooses it"],
        ["11–20", "No complication", "No complication"],
      ],
    }],
  }),
];

const advancementRows = [
  ["0", "1", "+2"], ["6", "2", "+2"], ["15", "3", "+2"], ["30", "4", "+2"],
  ["50", "5", "+3"], ["75", "6", "+3"], ["105", "7", "+3"], ["140", "8", "+3"],
  ["180", "9", "+4"], ["225", "10", "+4"], ["275", "11", "+4"], ["330", "12", "+4"],
  ["390", "13", "+5"], ["455", "14", "+5"], ["525", "15", "+5"], ["600", "16", "+5"],
  ["680", "17", "+6"], ["765", "18", "+6"], ["855", "19", "+6"], ["950", "20", "+6"],
];

const characterEntries: GameCardEntry[] = [
  entry({ id: "character-advancement", term: "Character Advancement", category: "Character & rites", sourcePage: 3, aliases: ["insight", "level", "proficiency bonus"], paragraphs: [], tables: [{ columns: ["Insight", "Level", "Proficiency bonus"], rows: advancementRows }] }),
  entry({ id: "ability-modifiers", term: "Ability Scores & Modifiers", category: "Character & rites", sourcePage: 3, aliases: ["strength modifier", "dexterity modifier"], paragraphs: [], tables: [{ columns: ["Score", "Modifier"], rows: [["1", "−5"], ["2–3", "−4"], ["4–5", "−3"], ["6–7", "−2"], ["8–9", "−1"], ["10–11", "+0"], ["12–13", "+1"], ["14–15", "+2"], ["16–17", "+3"], ["18–19", "+4"], ["20–21", "+5"], ["22–23", "+6"], ["24–25", "+7"], ["26–27", "+8"], ["28–29", "+9"], ["30", "+10"]] }] }),
  entry({ id: "skills", term: "Skills by Ability", category: "Character & rites", sourcePage: 3, aliases: ["athletics", "acrobatics", "grit", "eldritch knowledge", "perception", "presence"], paragraphs: [], tables: [{ columns: ["Ability", "Skills"], rows: [["Strength", "Athletics"], ["Dexterity", "Acrobatics; Sleight of Hand; Stealth"], ["Constitution", "Grit"], ["Intelligence", "Eldritch Knowledge; Old World History; Investigation; Blood Nature; Religion"], ["Wisdom", "Animal Handling; Insight; Medicine; Perception; Survival"], ["Charisma", "Deception; Intimidation; Presence; Persuasion"]] }] }),
  simple("passive-perception", "Passive Perception", "Character & rites", 3, ["Passive Perception = 10 + all Wisdom (Perception) modifiers."], ["notice"]),
  simple("blood-tinge", "Blood Tinge", "Character & rites", 3, ["Blood Tinge is gained when leveling. Spend it to add 1d6 to one of your own attack, save, or ability-check d20 rolls; turn a Death Save failure into a success; or reroll any roll."], ["reroll", "death save"]),
  simple("rite-attack-save", "Rite Attack Bonus & Save DC", "Character & rites", 3, ["Rite attack bonus = ability modifier + proficiency bonus. Performing within 5 feet of an enemy imposes disadvantage. Rite save DC = 8 + ability modifier + proficiency bonus + situational modifiers."], ["spell attack", "rite dc"]),
  simple("rite-types", "Types of Rites", "Character & rites", 3, ["Protection, Summoning, Detection, Mind Influence, Evocation, Illusion, and Teleportation."], ["magic schools"]),
  simple("concentration", "Concentration", "Character & rites", 3, ["Concentration ends when you perform another Rite requiring concentration; become incapacitated or die; or fail a check caused by damage, startling phenomena, or vigorous movement. Taking damage calls for Constitution DC 8 + damage taken, separately for each source. Startling phenomena and vigorous movement normally call for DC 10 Constitution."], ["maintain rite", "con save"]),
  entry({ id: "difficulty-classes", term: "Typical Difficulty Classes", category: "Character & rites", sourcePage: 3, aliases: ["dc", "nearly impossible"], paragraphs: [], tables: [{ columns: ["Task", "DC"], rows: [["Very Easy", "5"], ["Easy", "10"], ["Medium", "15"], ["Hard", "20"], ["Very Hard", "25"], ["Nearly Impossible", "30"]] }] }),
  entry({ id: "damage-severity", term: "Damage Severity by Level", category: "Character & rites", sourcePage: 3, aliases: ["setback", "dangerous", "deadly"], paragraphs: [], tables: [{ columns: ["Character level", "Setback", "Dangerous", "Deadly"], rows: [["1–4", "1d10", "2d10", "4d10"], ["5–10", "2d10", "4d10", "10d10"], ["11–16", "4d10", "10d10", "18d10"], ["17–20", "10d10", "18d10", "24d10"]] }] }),
  entry({ id: "damage-types", term: "Damage Types", category: "Character & rites", sourcePage: 3, aliases: ["acid", "bludgeoning", "cold", "fire", "eldritch power", "lightning", "piercing", "poison", "mind", "slashing", "thunder"], paragraphs: [], tables: [{ columns: ["Type", "Examples"], rows: [["Acid", "Corrosive slime and dissolving enzymes"], ["Bludgeoning", "Hammers, falling, constriction"], ["Cold", "Infernal chill and cold beings"], ["Fire", "Flames from torches or Rites"], ["Eldritch Power", "Pure force of an eldritch being"], ["Lightning", "Lightning bolts and Rite energy"], ["Piercing", "Puncturing attacks, spears, monster bites"], ["Poison", "Venomous stings and toxic gas"], ["Mind", "Mental strains and old words"], ["Slashing", "Swords, axes, monster claws"], ["Thunder", "Concussive bursts of sound"]] }] }),
  entry({ id: "improvising-damage", term: "Improvising Damage", category: "Character & rites", sourcePage: 3, aliases: ["lava", "falling rubble", "lightning"], paragraphs: [], tables: [{ columns: ["Example", "Dice"], rows: [["Burned by coals; falling bookcase; poison needle", "1d10"], ["Struck by lightning; stumbling into a fire pit", "2d10"], ["Falling rubble; collapsing tunnel; vat of acid", "4d10"], ["Compacting walls; whirling blades; lava stream", "10d10"], ["Submerged in lava; crashing flying fortress", "18d10"], ["Elemental Fire vortex; jaws of a god-like monster", "24d10"], ["Rocks fall, everyone dies; campaign ends", "∞d10"]] }] }),
  entry({ id: "object-ac-hp", term: "Medium Object AC & Hit Points", category: "Character & rites", sourcePage: 3, aliases: ["break object", "stone", "steel", "karthian alloy"], paragraphs: ["The GM may rule that certain weapons or damage types cannot harm an object at all."], tables: [{ columns: ["Substance", "AC", "Fragile HP", "Resilient HP"], rows: [["Cloth, paper, rope", "11", "1", "2"], ["Crystal, glass, ice", "13", "1d4", "2d4"], ["Wood, bone", "15", "1d6", "3d6"], ["Stone", "17", "5d12", "7d12"], ["Iron, steel", "19", "8d12", "10d12"], ["Old Karthian Alloy", "30", "—", "1000"]] }] }),
];

const weaponRows = [
  ["Club", "1d4 Bludgeoning", "Light", "Slow", "2 lb", "Significant"],
  ["Dagger", "1d4 Piercing", "Finesse, Light, Thrown (20/60)", "Nick", "1 lb", "Significant"],
  ["Greatclub", "1d8 Bludgeoning", "Two-Handed", "Push", "10 lb", "Oversized"],
  ["Handaxe", "1d6 Slashing", "Light, Thrown (20/60)", "Vex", "2 lb", "Significant"],
  ["Javelin", "1d6 Piercing", "Thrown (30/120)", "Slow", "2 lb", "Significant (back)"],
  ["Light Hammer", "1d4 Bludgeoning", "Light, Thrown (20/60)", "Nick", "2 lb", "Significant"],
  ["Mace", "1d6 Bludgeoning", "—", "Sap", "4 lb", "Significant"],
  ["Sickle", "1d4 Slashing", "Light", "Nick", "2 lb", "Significant"],
  ["Spear", "1d6 Piercing", "Thrown (20/60), Versatile (1d8)", "Sap", "3 lb", "Oversized"],
  ["Throwing Knife", "1d4 Piercing", "Finesse, Thrown (20/60)", "Vex", "¼ lb", "Insignificant"],
  ["Battleaxe", "1d8 Slashing", "Versatile (1d10)", "Topple", "4 lb", "Significant"],
  ["Flail", "1d8 Bludgeoning", "—", "Sap", "2 lb", "Significant"],
  ["Glaive", "1d10 Slashing", "Heavy, Reach, Two-Handed", "Graze", "12 lb", "Oversized"],
  ["Greataxe", "1d12 Slashing", "Heavy, Two-Handed", "Cleave", "14 lb", "Oversized"],
  ["Greatsword", "2d6 Slashing", "Heavy, Two-Handed", "Graze", "14 lb", "Oversized"],
  ["Halberd", "1d10 Slashing", "Heavy, Reach, Two-Handed", "Cleave", "12 lb", "Oversized"],
  ["Longsword", "1d8 Slashing", "Versatile (1d10)", "Sap", "3 lb", "Significant"],
  ["Maul", "2d6 Bludgeoning", "Heavy, Two-Handed", "Topple", "14 lb", "Oversized"],
  ["Morningstar", "1d8 Piercing", "—", "Sap", "4 lb", "Significant"],
  ["Pike", "1d10 Piercing", "Heavy, Reach, Two-Handed", "Push", "12 lb", "Oversized"],
  ["Rapier", "1d8 Piercing", "Finesse", "Vex", "2 lb", "Significant"],
  ["Scimitar", "1d6 Slashing", "Finesse, Light", "Nick", "3 lb", "Significant"],
  ["Shortsword", "1d6 Piercing", "Finesse, Light", "Vex", "2 lb", "Significant"],
  ["Trident", "1d8 Piercing", "Thrown (20/60), Versatile (1d10)", "Topple", "12 lb", "Oversized"],
  ["Warhammer", "1d8 Bludgeoning", "Versatile (1d10)", "Push", "5 lb", "Significant"],
  ["War Pick", "1d8 Piercing", "Versatile (1d10)", "Sap", "2 lb", "Significant"],
  ["Whip", "1d4 Slashing", "Finesse, Reach", "Slow", "3 lb", "Significant"],
  ["Hunter Rifle", "1d10 Piercing", "Ammunition (100/400; Bullet), Two-Handed", "Slow", "10 lb", "Significant (back)"],
  ["Pistol", "1d10 Piercing", "Ammunition (30/90; Bullet)", "Vex", "3 lb", "Significant"],
];

const gearRows = [
  ["Acid", "1 lb", "Insignificant"], ["Antitoxin", "—", "Insignificant"], ["Ball Bearings", "2 lb", "Insignificant"], ["Barrel", "70 lb", "Oversized"],
  ["Basket", "2 lb", "Oversized"], ["Bell", "—", "Insignificant"], ["Block and Tackle", "5 lb", "Significant"], ["Book", "5 lb", "Significant"],
  ["Bottle, Glass", "2 lb", "Insignificant"], ["Bucket", "2 lb", "Oversized"], ["Bullets", "—", "Insignificant"], ["Caltrops", "2 lb", "Insignificant"],
  ["Candle", "—", "Insignificant"], ["Chain", "10 lb", "Significant"], ["Chest", "25 lb", "Oversized"], ["Crowbar", "5 lb", "Significant"],
  ["Flask", "1 lb", "Insignificant"], ["Grappling Hook", "4 lb", "Significant"], ["Hunting Trap", "25 lb", "Significant"], ["Ink", "—", "Insignificant"],
  ["Ink Pen", "—", "Insignificant"], ["Jug", "4 lb", "Significant"], ["Ladder", "25 lb", "Oversized"], ["Lamp", "1 lb", "Significant"],
  ["Lantern, Bullseye", "2 lb", "Significant"], ["Lantern, Hooded", "2 lb", "Significant"], ["Lock", "1 lb", "Insignificant"], ["Manacles", "6 lb", "Insignificant"],
  ["Map", "—", "Insignificant"], ["Mirror", "1 lb", "Insignificant"], ["Net", "3 lb", "Significant"], ["Oil", "1 lb", "Insignificant"],
  ["Paper", "—", "Insignificant"], ["Parchment", "—", "Insignificant"], ["Poison, Basic", "—", "Insignificant"], ["Pole", "7 lb", "Oversized"],
  ["Pot, Iron", "10 lb", "Oversized"], ["Ram, Portable", "35 lb", "Oversized"], ["Rope", "5 lb", "Significant"], ["Shovel", "5 lb", "Significant (back)"],
  ["Signal Whistle", "—", "Insignificant"], ["Spikes, Iron", "5 lb", "Insignificant"], ["String", "—", "Insignificant"], ["Tinderbox", "1 lb", "Insignificant"],
  ["Torch", "1 lb", "Significant"], ["Vial", "—", "Insignificant"], ["Waterskin", "5 lb full", "Significant"],
];

const equipmentEntries: GameCardEntry[] = [
  entry({ id: "weapons", term: "Weapons", category: "Equipment", sourcePage: 4, aliases: weaponRows.map((r) => r[0]), paragraphs: ["Weapon damage, properties, mastery, weight, and carrying category from the Player's Game Card."], tables: [{ columns: ["Name", "Damage", "Properties", "Mastery", "Weight", "Carrying"], rows: weaponRows }] }),
  entry({ id: "hunter-gear", term: "Hunter Gear", category: "Equipment", sourcePage: 4, aliases: gearRows.map((r) => r[0]), paragraphs: [], tables: [{ columns: ["Item", "Weight", "Carrying category"], rows: gearRows }] }),
  entry({ id: "armor-types", term: "Types of Armor", category: "Equipment", sourcePage: 4, aliases: ["unarmored", "light armor", "medium armor", "heavy armor"], paragraphs: [], tables: [{ columns: ["Category", "AC total", "Dexterity rule"], rows: [["Unarmored", "10", "Add full Dexterity modifier"], ["Light Armor", "11–12", "Add full Dexterity modifier"], ["Medium Armor", "13–14", "Add Dexterity modifier, maximum +2"], ["Heavy Armor", "15+", "Do not add Dexterity modifier"], ["16 AC note", "16", "Requires Strength 13"], ["17+ AC note", "17+", "Requires Strength 15"]] }] }),
  simple("equipment-types", "Types of Equipment", "Equipment", 4, ["Coins, Weapons, Armor, Tools, Hunting Gear, Storage Items, and Unique Items."], ["inventory categories"]),
  entry({ id: "weight-conditions", term: "Weight Conditions", category: "Equipment", sourcePage: 4, aliases: ["featherweight", "encumbered", "over capacity"], paragraphs: [], tables: [{ columns: ["Total weight", "Condition", "Effect"], rows: [["No more than Strength × 2 lb", "Featherweight", "Speed increases by 5 ft"], ["More than Strength × 5 lb", "Encumbered", "Speed reduced by 10 ft"], ["More than Strength × 10 lb", "Heavily Encumbered", "Speed reduced by 20 ft; disadvantage on Strength and Dexterity checks, attacks, and saves"], ["More than Strength × 15 lb", "Over Capacity", "Cannot normally carry this weight"]] }] }),
  entry({ id: "light-sources", term: "Light Sources", category: "Equipment", sourcePage: 4, aliases: ["candle", "lamp", "lantern", "torch", "eldritch moonlight"], paragraphs: [], tables: [{ columns: ["Source", "Bright", "Additional dim", "Duration"], rows: [["Candle", "5-ft radius", "+5-ft radius", "10 rounds"], ["Lamp", "15-ft radius", "+30-ft radius", "Until next Long Rest"], ["Bullseye lantern", "60-ft cone", "+60-ft cone", "Until next Long Rest"], ["Hooded lantern", "30-ft radius", "+30-ft radius", "Until next Long Rest"], ["Torch", "20-ft radius", "+20-ft radius", "20 rounds"], ["Eldritch Moonlight Rite", "20-ft radius", "+20-ft radius", "Up to 10 rounds"]] }] }),
];

const transformationRows = [
  ["1", "Blood Lust", "Blood Lust", "Lost", "Lost", "Lost", "Lost", "Lost", "Lost", "Lost", "Lost"],
  ["2", "Mutated Arm", "Blood Lust", "Blood Lust", "Lost", "Lost", "Lost", "Lost", "Lost", "Lost", "Lost"],
  ["3", "Blood Fangs", "Mutated Arm", "Blood Lust", "Blood Lust", "Lost", "Lost", "Lost", "Lost", "Lost", "Lost"],
  ["4", "Dreadblood Eyes", "Blood Fangs", "Blood Lust", "Blood Lust", "Blood Lust", "Lost", "Lost", "Lost", "Lost", "Lost"],
  ["5", "Dreadblood Ears", "Dreadblood Eyes", "Mutated Arm", "Blood Lust", "Blood Lust", "Blood Lust", "Lost", "Lost", "Lost", "Lost"],
  ["6", "Nothing Happens", "Dreadblood Eyes", "Mutated Arm", "Blood Lust", "Blood Lust", "Blood Lust", "Blood Lust", "Lost", "Lost", "Lost"],
  ["7", "Nothing Happens", "Dreadblood Ears", "Blood Fangs", "Mutated Arm", "Blood Lust", "Blood Lust", "Blood Lust", "Blood Lust", "Lost", "Lost"],
  ["8", "Nothing Happens", "Dreadblood Ears", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Blood Lust", "Blood Lust", "Blood Lust", "Lost", "Lost"],
  ["9", "Nothing Happens", "Nothing Happens", "Dreadblood Eyes", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Blood Lust", "Blood Lust", "Blood Lust", "Lost"],
  ["10", "Nothing Happens", "Nothing Happens", "Dreadblood Eyes", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm"],
  ["11", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Eyes", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm"],
  ["12", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Eyes", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm"],
  ["13", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Blood Fangs", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm"],
  ["14", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Eyes", "Blood Fangs", "Mutated Arm", "Mutated Arm", "Mutated Arm", "Mutated Arm"],
  ["15", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Eyes", "Blood Fangs", "Blood Fangs", "Blood Fangs", "Blood Fangs", "Blood Fangs"],
  ["16", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Eyes", "Blood Fangs", "Blood Fangs", "Blood Fangs", "Blood Fangs"],
  ["17", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Eyes", "Blood Fangs", "Blood Fangs", "Blood Fangs", "Blood Fangs"],
  ["18", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Blood Fangs", "Blood Fangs", "Blood Fangs", "Blood Fangs"],
  ["19", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Eyes", "Dreadblood Eyes", "Dreadblood Eyes", "Dreadblood Eyes"],
  ["20", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Nothing Happens", "Dreadblood Ears", "Dreadblood Ears", "Dreadblood Ears", "Dreadblood Ears"],
];

const transformationEntries: GameCardEntry[] = [
  simple("transformation-level", "Transformation Level", "Transformation", 6, ["Transformation Level ranges from 0–10. When you gain a level, increase it by 1, then physically roll on the Transformation Table using the new level."], ["blood shifted"]),
  simple("transformation-result", "Transformation Results", "Transformation", 6, ["A table result is not always a Transformation. Nothing Happens is not one. Blood Lust is a compulsion. Lost is catastrophic and counts as a Transformation; tell the DM."], ["mutation"]),
  simple("reduce-transformation", "Reducing Transformation Level", "Transformation", 6, ["Short Rest: reduce the level by 1 and lose all active Transformations; a DC 13 Constitution (Grit) success reduces it by 1 more. Long Rest: reduce to 0 and lose all. The first Unconscious condition after gaining a Transformation reduces the level by 2 and removes all active Transformations, once until another rest or Transformation."], ["short rest", "long rest", "unconscious"]),
  simple("blood-lust", "Blood Lust", "Transformation", 6, ["Drink another Blood Vial or suffer 3 Madness. This compulsion is not a Transformation."], ["blood vial"]),
  simple("mutated-arm", "Mutated Arm", "Transformation", 6, ["Suffer 2 Madness. Add 1d12 to your damage roll and 5 feet to your range for melee damage; suffer 1 Madness when you do."], ["mutation"]),
  simple("blood-fangs", "Blood Fangs", "Transformation", 6, ["As a melee attack, bite a creature within 5 feet. On a hit deal 4d3 piercing damage and heal the same amount; suffer 1 Madness."], ["bite", "mutation"]),
  simple("dreadblood-eyes", "Dreadblood Eyes", "Transformation", 6, ["As an action, gain Blindsight for 10 rounds; suffer 1 Madness."], ["blindsight", "mutation"]),
  simple("dreadblood-ears", "Dreadblood Ears", "Transformation", 6, ["Your Wisdom (Perception) modifier increases by 5. You may suffer 1 Madness to make a Wisdom (Perception) check with advantage."], ["perception", "mutation"]),
  entry({
    id: "transformation-table",
    term: "Transformation Table",
    category: "Transformation",
    sourcePage: 6,
    aliases: ["1d20", "roll", "level"],
    paragraphs: ["Increase Transformation Level first, then roll 1d20 physically and read the column for the new level. The app does not roll for you."],
    tables: [{ columns: ["d20", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Level 9", "Level 10"], rows: transformationRows }],
  }),
];

export const GAME_CARD_ENTRIES: GameCardEntry[] = [
  ...turnEntries,
  ...conditionEntries,
  ...movementEntries,
  ...characterEntries,
  ...equipmentEntries,
  ...transformationEntries,
];
