import type { RuleEntry, RuleCategory } from "@/types";

// A curated, searchable D&D 5e (2024) rules glossary for the in-app
// "Rules Reference" page. License-clean SRD 5.2 / CC-BY material, paraphrased
// concisely in our own words — NOT proprietary book text.

export const RULE_CATEGORIES: RuleCategory[] = [
  "Condition",
  "Action",
  "Combat",
  "Damage & Healing",
  "General",
];

export const RULES_REFERENCE: RuleEntry[] = [
  // --- Conditions (all 15) ---
  {
    id: "blinded",
    term: "Blinded",
    category: "Condition",
    aliases: ["blind", "can't see"],
    body: [
      "You can't see and automatically fail any ability check that requires sight.",
      "Attack rolls against you have advantage, and your attack rolls have disadvantage.",
    ],
  },
  {
    id: "charmed",
    term: "Charmed",
    category: "Condition",
    aliases: ["charm", "enthralled"],
    body: [
      "You can't attack the charmer or target it with harmful abilities or magical effects.",
      "The charmer has advantage on ability checks to interact with you socially.",
    ],
  },
  {
    id: "deafened",
    term: "Deafened",
    category: "Condition",
    aliases: ["deaf", "can't hear"],
    body: [
      "You can't hear and automatically fail any ability check that requires hearing.",
    ],
  },
  {
    id: "exhaustion",
    term: "Exhaustion",
    category: "Condition",
    aliases: ["exhausted", "tired", "fatigue"],
    body: [
      "Exhaustion stacks in levels (1–6). In the 2024 rules each level imposes a cumulative −2 × level penalty to all d20 Tests (ability checks, attack rolls, and saving throws).",
      "Your Speed is also reduced by 5 × level feet. Level 6 means death.",
      "Finishing a long rest removes one level of exhaustion.",
    ],
  },
  {
    id: "frightened",
    term: "Frightened",
    category: "Condition",
    aliases: ["fear", "afraid", "scared"],
    body: [
      "While the source of your fear is in line of sight, you have disadvantage on ability checks and attack rolls.",
      "You can't willingly move closer to the source.",
    ],
  },
  {
    id: "grappled",
    term: "Grappled",
    category: "Condition",
    aliases: ["grab", "grabbed", "held"],
    body: [
      "Your Speed is 0 and you can't benefit from any bonus to it.",
      "You have disadvantage on attack rolls against any target other than the grappler.",
      "The condition ends if the grappler is Incapacitated or if you're moved out of its reach.",
    ],
  },
  {
    id: "incapacitated",
    term: "Incapacitated",
    category: "Condition",
    aliases: ["incapacitate", "helpless"],
    body: [
      "You can't take any action, Bonus Action, or Reaction, and you can't concentrate.",
      "You can't speak, and any spell concentration you had ends.",
    ],
  },
  {
    id: "invisible",
    term: "Invisible",
    category: "Condition",
    aliases: ["invisibility", "unseen"],
    body: [
      "You can't be seen without the aid of magic or a special sense, and you're considered heavily obscured.",
      "Attack rolls against you have disadvantage, and your attack rolls have advantage.",
    ],
  },
  {
    id: "paralyzed",
    term: "Paralyzed",
    category: "Condition",
    aliases: ["paralysis", "paralyze"],
    body: [
      "You're Incapacitated and can't move or speak.",
      "You automatically fail Strength and Dexterity saving throws, and attacks against you have advantage.",
      "Any attack that hits you from within 5 feet is a critical hit.",
    ],
  },
  {
    id: "petrified",
    term: "Petrified",
    category: "Condition",
    aliases: ["stone", "petrify", "turned to stone"],
    body: [
      "You're transformed to solid inanimate substance (usually stone): Incapacitated, unaware of surroundings, weight ×10, and you stop aging.",
      "Attacks against you have advantage, and you auto-fail Strength and Dexterity saves.",
      "You have resistance to all damage and immunity to poison and disease.",
    ],
  },
  {
    id: "poisoned",
    term: "Poisoned",
    category: "Condition",
    aliases: ["poison", "envenomed"],
    body: ["You have disadvantage on attack rolls and ability checks."],
  },
  {
    id: "prone",
    term: "Prone",
    category: "Condition",
    aliases: ["knocked down", "knocked prone", "fallen"],
    body: [
      "Your only movement option is to crawl, or to stand up (which costs half your Speed).",
      "You have disadvantage on attack rolls.",
      "Attacks against you have advantage if the attacker is within 5 feet, otherwise disadvantage.",
    ],
  },
  {
    id: "restrained",
    term: "Restrained",
    category: "Condition",
    aliases: ["restrain", "bound", "ensnared"],
    body: [
      "Your Speed is 0 and you can't benefit from any bonus to it.",
      "Attacks against you have advantage and your attack rolls have disadvantage.",
      "You have disadvantage on Dexterity saving throws.",
    ],
  },
  {
    id: "stunned",
    term: "Stunned",
    category: "Condition",
    aliases: ["stun", "dazed"],
    body: [
      "You're Incapacitated, can't move, and can speak only falteringly.",
      "You automatically fail Strength and Dexterity saving throws, and attacks against you have advantage.",
    ],
  },
  {
    id: "unconscious",
    term: "Unconscious",
    category: "Condition",
    aliases: ["ko", "knocked out", "passed out", "sleeping"],
    body: [
      "You're Incapacitated, unaware of your surroundings, drop whatever you're holding, and fall Prone.",
      "You auto-fail Strength and Dexterity saves, and attacks against you have advantage.",
      "Any attack that hits you from within 5 feet is a critical hit.",
    ],
  },

  // --- Actions ---
  {
    id: "attack",
    term: "Attack",
    category: "Action",
    aliases: ["strike", "swing"],
    body: [
      "Make one melee or ranged attack against a target.",
      "Features such as Extra Attack let you make more than one attack with this action.",
    ],
  },
  {
    id: "dash",
    term: "Dash",
    category: "Action",
    aliases: ["run", "sprint"],
    body: [
      "Gain extra movement equal to your Speed for the current turn (after applying any modifiers).",
    ],
  },
  {
    id: "disengage",
    term: "Disengage",
    category: "Action",
    aliases: ["retreat", "withdraw"],
    body: [
      "Your movement doesn't provoke Opportunity Attacks for the rest of the turn.",
    ],
  },
  {
    id: "dodge",
    term: "Dodge",
    category: "Action",
    aliases: ["defend", "evade"],
    body: [
      "Until the start of your next turn, attack rolls against you have disadvantage (if you can see the attacker) and you make Dexterity saves with advantage.",
      "You lose this benefit if you're Incapacitated or your Speed drops to 0.",
    ],
  },
  {
    id: "help",
    term: "Help",
    category: "Action",
    aliases: ["assist", "aid"],
    body: [
      "Give an ally advantage on an ability check for a task you can meaningfully assist with,",
      "or give them advantage on their next attack roll against a creature within 5 feet of you.",
    ],
  },
  {
    id: "hide",
    term: "Hide",
    category: "Action",
    aliases: ["stealth", "sneak", "conceal"],
    body: [
      "While out of any enemy's line of sight, make a DC 15 Dexterity (Stealth) check; on a success you gain the Invisible condition.",
      "You're discovered if you make noise, attack, or an enemy finds you.",
    ],
  },
  {
    id: "influence",
    term: "Influence",
    category: "Action",
    aliases: ["persuade", "deceive", "intimidate", "social"],
    body: [
      "Make a Charisma (or other social skill) check to alter a creature's attitude or get it to do something.",
      "The DC reflects how much your request runs against the creature's own priorities.",
    ],
  },
  {
    id: "magic",
    term: "Magic",
    category: "Action",
    aliases: ["cast", "cast a spell", "spellcasting"],
    body: [
      "Cast a spell with a casting time of one action, use a feature that requires the Magic action, or activate a magic item.",
    ],
  },
  {
    id: "ready",
    term: "Ready",
    category: "Action",
    aliases: ["prepare", "hold action", "readied"],
    body: [
      "Choose a perceivable trigger and an action; take that action as a Reaction when the trigger occurs.",
      "Readying a spell requires concentration and expends the spell slot when prepared.",
    ],
  },
  {
    id: "search",
    term: "Search",
    category: "Action",
    aliases: ["look", "perceive", "find"],
    body: [
      "Make a Wisdom check — Perception, Insight, Medicine, or Survival — to discern something in your surroundings.",
    ],
  },
  {
    id: "study",
    term: "Study",
    category: "Action",
    aliases: ["recall", "investigate", "lore", "knowledge"],
    body: [
      "Make an Intelligence check — Arcana, History, Investigation, Nature, or Religion — to recall lore or deduce information.",
    ],
  },
  {
    id: "utilize",
    term: "Utilize",
    category: "Action",
    aliases: ["use object", "interact"],
    body: [
      "Use a nonmagical object that needs an action to operate, such as pulling a lever or drinking a potion.",
    ],
  },
  {
    id: "opportunity-attack",
    term: "Opportunity Attack",
    category: "Action",
    aliases: ["aoo", "attack of opportunity", "reaction attack"],
    body: [
      "Reaction: when a creature you can see leaves your reach, make one melee attack against it.",
      "It's avoided if the creature Disengages or teleports away.",
    ],
  },
  {
    id: "grapple-action",
    term: "Grapple",
    category: "Action",
    aliases: ["grab", "wrestle", "seize"],
    body: [
      "A special attack made with the Attack action: a creature within reach must succeed on a Strength or Dexterity saving throw (DC 8 + your Strength modifier + Proficiency Bonus) or gain the Grappled condition.",
    ],
  },
  {
    id: "shove-action",
    term: "Shove",
    category: "Action",
    aliases: ["push", "knock down"],
    body: [
      "A special attack made with the Attack action: a creature within reach must succeed on a Strength or Dexterity save (DC 8 + your Strength modifier + Proficiency Bonus) or be pushed 5 feet away or knocked Prone (your choice).",
    ],
  },

  {
    id: "bonus-action",
    term: "Bonus Action",
    category: "Action",
    aliases: ["ba", "bonus"],
    body: [
      "A special action you can take only when a feature, spell, or item says you can.",
      "You get at most one Bonus Action per turn, taken whenever you like during your turn.",
    ],
  },
  {
    id: "reaction",
    term: "Reaction",
    category: "Action",
    aliases: ["react", "reactions"],
    body: [
      "An instant response triggered by a specific event; you get one Reaction per round.",
      "Opportunity Attacks and readied effects use it. It refreshes at the start of your turn.",
    ],
  },
  {
    id: "object-interaction",
    term: "Object Interaction",
    category: "Action",
    aliases: ["free interaction", "interact with object", "draw weapon"],
    body: [
      "Once on your turn you may interact with one object for free as part of your move or action — draw or stow a weapon, open an unlocked door, pick up a dropped item.",
      "Further interactions need the Utilize action.",
    ],
  },
  {
    id: "improvised-weapon",
    term: "Improvised Weapon",
    category: "Action",
    aliases: ["improvised", "makeshift weapon", "thrown object"],
    body: [
      "An object wielded as a weapon deals 1d4 of a fitting damage type; if it resembles a real weapon, the DM may use that weapon's stats.",
      "Without proficiency you don't add your Proficiency Bonus to the attack.",
    ],
  },

  // --- Combat ---
  {
    id: "initiative",
    term: "Initiative",
    category: "Combat",
    aliases: ["initiative order", "turn order", "dex check"],
    body: [
      "At the start of combat everyone rolls a Dexterity check; the DM orders turns from highest to lowest.",
      "Ties are decided by the participants (players choose among themselves; the DM decides for its own creatures, or roll off for a tie between the two sides).",
    ],
  },
  {
    id: "advantage-disadvantage",
    term: "Advantage & Disadvantage",
    category: "Combat",
    aliases: ["adv", "disadv", "advantage", "disadvantage"],
    body: [
      "Roll two d20s and take the higher (advantage) or lower (disadvantage) result.",
      "They don't stack — if you have both, they cancel and you roll a single d20 normally.",
    ],
  },
  {
    id: "cover",
    term: "Cover",
    category: "Combat",
    aliases: ["half cover", "three-quarters cover", "total cover"],
    body: [
      "Half cover grants +2 to AC and Dexterity saves; three-quarters cover grants +5.",
      "Total cover can't be targeted directly by an attack or spell. Use only the most protective degree.",
    ],
  },
  {
    id: "bloodied",
    term: "Bloodied",
    category: "Combat",
    aliases: ["bloody", "half hp"],
    body: [
      "A creature is Bloodied while it has at or below half its hit point maximum.",
      "Some monster and class features trigger when a target is Bloodied.",
    ],
  },
  {
    id: "death-saving-throws",
    term: "Death Saving Throws",
    category: "Combat",
    aliases: ["death saves", "dying", "death save"],
    body: [
      "While at 0 HP and not dead, roll a d20 at the start of each turn: 10+ is a success, under 10 is a failure.",
      "Three successes stabilize you; three failures mean death. A natural 1 counts as two failures; a natural 20 restores you to 1 HP.",
      "Taking damage at 0 HP causes one failure (two on a critical hit).",
    ],
  },
  {
    id: "surprise",
    term: "Surprise",
    category: "Combat",
    aliases: ["surprised", "ambush"],
    body: [
      "If a creature didn't notice a threat (e.g., its Perception lost to the attackers' Stealth), it has disadvantage on its initiative roll.",
      "Note: 2024 surprise no longer skips a turn — it only penalizes initiative.",
    ],
  },
  {
    id: "reach",
    term: "Reach",
    category: "Combat",
    aliases: ["melee range"],
    body: [
      "The distance at which you can make a melee attack, normally 5 feet.",
      "Certain weapons and larger creatures have greater reach.",
    ],
  },
  {
    id: "flanking",
    term: "Flanking (Optional)",
    category: "Combat",
    aliases: ["flank", "flanked"],
    body: [
      "Optional rule: when you and an ally are on directly opposite sides of an enemy, each of you has advantage on melee attack rolls against it.",
    ],
  },
  {
    id: "concentration",
    term: "Concentration",
    category: "Combat",
    aliases: ["concentrate", "maintain spell"],
    body: [
      "Some spells require concentration to keep going. When you take damage, make a Constitution save (DC 10 or half the damage taken, whichever is higher) to maintain it.",
      "Concentration also ends if you cast another concentration spell or become Incapacitated.",
    ],
  },

  {
    id: "armor-class",
    term: "Armor Class (AC)",
    category: "Combat",
    aliases: ["ac", "defense", "armor class"],
    body: [
      "How hard you are to hit: an attack roll that equals or beats your AC hits.",
      "AC comes from armor, Dexterity, and other bonuses; you benefit from only one base AC formula at a time.",
    ],
  },
  {
    id: "attack-roll",
    term: "Attack Roll",
    category: "Combat",
    aliases: ["to hit", "attack roll"],
    body: [
      "Roll a d20 + ability modifier (Strength for melee, Dexterity for ranged or Finesse) + Proficiency Bonus if proficient.",
      "Equal or beat the target's AC to hit. A natural 20 always hits and crits; a natural 1 always misses.",
    ],
  },
  {
    id: "unarmed-strike",
    term: "Unarmed Strike",
    category: "Combat",
    aliases: ["punch", "unarmed"],
    body: [
      "In place of a weapon attack you can make an Unarmed Strike to Damage (1 + Strength modifier bludgeoning), Grapple, or Shove.",
      "You're always proficient with your Unarmed Strike.",
    ],
  },
  {
    id: "two-weapon-fighting",
    term: "Two-Weapon Fighting",
    category: "Combat",
    aliases: ["dual wield", "off-hand", "two weapon"],
    body: [
      "When you Attack with a Light melee weapon, you can use a Bonus Action to attack with a different Light melee weapon in your other hand.",
      "You don't add your ability modifier to the bonus attack's damage unless it's negative.",
    ],
  },
  {
    id: "ranged-in-melee",
    term: "Ranged Attacks in Close Combat",
    category: "Combat",
    aliases: ["ranged in melee", "shooting in melee"],
    body: [
      "You have disadvantage on a ranged attack roll while a hostile creature that can see you is within 5 feet of you.",
    ],
  },

  // --- Damage & Healing ---
  {
    id: "damage-types",
    term: "Damage Types",
    category: "Damage & Healing",
    aliases: ["damage type", "elements"],
    body: [
      "The thirteen types are: Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, and Thunder.",
      "A creature's resistances, vulnerabilities, and immunities are keyed to these types.",
    ],
  },
  {
    id: "resistance",
    term: "Resistance",
    category: "Damage & Healing",
    aliases: ["resist", "resistant"],
    body: [
      "You take half damage (rounded down) from that damage type.",
      "Multiple sources of resistance to the same type don't stack.",
    ],
  },
  {
    id: "vulnerability",
    term: "Vulnerability",
    category: "Damage & Healing",
    aliases: ["vulnerable", "weakness"],
    body: ["You take double damage from that damage type."],
  },
  {
    id: "immunity",
    term: "Immunity",
    category: "Damage & Healing",
    aliases: ["immune", "damage immunity"],
    body: [
      "You take no damage from that damage type, or you can't be affected by that condition.",
    ],
  },
  {
    id: "temporary-hit-points",
    term: "Temporary Hit Points",
    category: "Damage & Healing",
    aliases: ["temp hp", "thp", "temporary hp"],
    body: [
      "A buffer that absorbs damage before your real hit points; it isn't actual healing.",
      "Temporary hit points don't stack — take the higher amount — and they're lost on a long rest.",
    ],
  },
  {
    id: "instant-death",
    term: "Instant Death",
    category: "Damage & Healing",
    aliases: ["massive damage", "instakill", "instadeath"],
    body: [
      "If a single hit's leftover damage past 0 HP equals or exceeds your hit point maximum, you die outright with no death saves.",
    ],
  },
  {
    id: "critical-hit",
    term: "Critical Hit",
    category: "Damage & Healing",
    aliases: ["crit", "nat 20", "natural 20"],
    body: [
      "A natural 20 on an attack roll always hits and lets you roll the attack's damage dice twice, adding your modifiers once.",
    ],
  },

  {
    id: "hit-points",
    term: "Hit Points",
    category: "Damage & Healing",
    aliases: ["hp", "health", "hit point"],
    body: [
      "Your buffer against dropping. Damage subtracts from current HP; you can't exceed your maximum or go below 0.",
      "At 0 HP you fall and begin making Death Saving Throws.",
    ],
  },
  {
    id: "hit-dice",
    term: "Hit Dice",
    category: "Damage & Healing",
    aliases: ["hd", "hit die", "spend hit dice"],
    body: [
      "A pool tied to your level (one die of your class's type per level). On a Short Rest you can spend Hit Dice, rolling each + your Constitution modifier to regain HP.",
      "You recover some spent Hit Dice on a Long Rest.",
    ],
  },
  {
    id: "healing",
    term: "Healing",
    category: "Damage & Healing",
    aliases: ["heal", "regain hp", "recover"],
    body: [
      "Restores hit points, never above your maximum. Healing a creature at 0 HP brings it back to consciousness.",
      "Healing never removes the dead condition.",
    ],
  },
  {
    id: "damage-roll",
    term: "Damage Roll",
    category: "Damage & Healing",
    aliases: ["roll damage"],
    body: [
      "Roll the weapon's or effect's damage dice and add the relevant ability modifier (usually the one used for the attack).",
      "A critical hit doubles the dice, not the modifier.",
    ],
  },
  {
    id: "dropping-to-0",
    term: "Dropping to 0 Hit Points",
    category: "Damage & Healing",
    aliases: ["0 hp", "downed"],
    body: [
      "You fall Unconscious and start making Death Saving Throws, unless excess damage kills you outright (see Instant Death).",
      "Any healing above 0 HP wakes you.",
    ],
  },
  {
    id: "knocking-out",
    term: "Knocking a Creature Out",
    category: "Damage & Healing",
    aliases: ["nonlethal", "knock out", "subdue"],
    body: [
      "When a melee hit would drop a creature to 0 HP, the attacker can choose to knock it out instead — it falls Unconscious and stable rather than dying.",
    ],
  },

  // --- General ---
  {
    id: "proficiency-bonus",
    term: "Proficiency Bonus",
    category: "General",
    aliases: ["prof bonus", "pb", "proficiency"],
    body: [
      "A bonus added to rolls you're proficient with (attacks, certain saves, skills, tools).",
      "It scales with character level: +2 at levels 1–4, rising to +6 at levels 17–20.",
    ],
  },
  {
    id: "saving-throw",
    term: "Saving Throw",
    category: "General",
    aliases: ["save", "saving throw", "resist effect"],
    body: [
      "A d20 roll to resist or avoid an effect, adding the relevant ability modifier (plus Proficiency Bonus if proficient) against a set DC.",
    ],
  },
  {
    id: "ability-check",
    term: "Ability Check",
    category: "General",
    aliases: ["check", "skill check"],
    body: [
      "A d20 roll plus an ability modifier (and Proficiency Bonus if you have a relevant skill or tool) against a DC set by the DM.",
    ],
  },
  {
    id: "passive-check",
    term: "Passive Check",
    category: "General",
    aliases: ["passive perception", "passive"],
    body: [
      "A check resolved without rolling: 10 + all relevant modifiers, used for things like Passive Perception.",
      "Advantage on the check adds +5; disadvantage subtracts 5.",
    ],
  },
  {
    id: "inspiration",
    term: "Inspiration",
    category: "General",
    aliases: ["heroic inspiration", "inspire"],
    body: [
      "A reward you can spend to give yourself advantage on one d20 Test.",
      "You can hold only one Inspiration at a time.",
    ],
  },
  {
    id: "long-rest",
    term: "Long Rest",
    category: "General",
    aliases: ["rest", "full rest", "sleep"],
    body: [
      "An extended rest (about 8 hours) that restores all hit points, returns roughly half your spent Hit Dice, and removes one level of Exhaustion.",
      "In this campaign, where you can safely take a long rest is location-dependent — confirm with the DM.",
    ],
  },
  {
    id: "short-rest",
    term: "Short Rest",
    category: "General",
    aliases: ["breather", "quick rest"],
    body: [
      "A break of at least 1 hour of light activity. You can spend Hit Dice (roll + Constitution modifier) to heal, and you regain certain abilities.",
    ],
  },
  {
    id: "difficult-terrain",
    term: "Difficult Terrain",
    category: "General",
    aliases: ["rough terrain", "hard terrain"],
    body: [
      "Every foot of movement through it costs an extra foot — rubble, deep snow, dense undergrowth, and the like.",
      "Difficult terrain doesn't stack with itself; moving through it is just one extra foot per foot.",
    ],
  },
  {
    id: "difficulty-class",
    term: "Difficulty Class (DC)",
    category: "General",
    aliases: ["dc", "target number"],
    body: [
      "The number a d20 Test must equal or beat to succeed. The DM sets it: 10 (easy), 15 (medium), 20 (hard), and beyond.",
    ],
  },
  {
    id: "contest",
    term: "Contest",
    category: "General",
    aliases: ["opposed check", "opposed roll"],
    body: [
      "When two creatures' efforts directly oppose, both make an ability check and compare totals; the higher wins, and a tie means no change.",
    ],
  },
  {
    id: "ability-scores",
    term: "Ability Scores & Modifiers",
    category: "General",
    aliases: ["modifier", "ability modifier", "stats"],
    body: [
      "The six abilities (STR, DEX, CON, INT, WIS, CHA) drive almost every roll.",
      "A modifier is (score − 10) ÷ 2, rounded down: 10–11 → +0, 14–15 → +2, 8–9 → −1.",
    ],
  },
  {
    id: "movement-speed",
    term: "Movement & Speed",
    category: "General",
    aliases: ["speed", "move", "movement"],
    body: [
      "On your turn you can move up to your Speed, splitting it around your action however you like.",
      "Standing from Prone costs half your Speed; you can't move through hostile creatures' spaces.",
    ],
  },
  {
    id: "climb-swim-jump",
    term: "Climbing, Swimming & Jumping",
    category: "General",
    aliases: ["climb", "swim", "jump", "long jump", "high jump"],
    body: [
      "Climbing or swimming costs 1 extra foot per foot (2 in difficult conditions) unless you have a relevant Speed.",
      "A running long jump clears feet equal to your Strength score; a running high jump clears 3 + your Strength modifier feet.",
    ],
  },
  {
    id: "falling",
    term: "Falling",
    category: "General",
    aliases: ["fall damage", "fall"],
    body: [
      "You take 1d6 bludgeoning per 10 feet fallen, to a maximum of 20d6, and land Prone unless you avoid the damage.",
    ],
  },
  {
    id: "vision-light",
    term: "Vision & Light",
    category: "General",
    aliases: ["bright light", "dim light", "darkness", "lighting"],
    body: [
      "Bright light lets most creatures see normally. Dim light (a lightly obscured area) gives disadvantage on sight-based Perception checks.",
      "Darkness is heavily obscured — effectively the Blinded condition when seeing into it.",
    ],
  },
  {
    id: "obscured",
    term: "Obscured Areas",
    category: "General",
    aliases: ["lightly obscured", "heavily obscured", "obscurement", "fog"],
    body: [
      "Lightly obscured (dim light, patchy fog, light foliage): disadvantage on sight-based Perception checks.",
      "Heavily obscured (darkness, thick fog): vision is blocked — you're effectively Blinded looking in.",
    ],
  },
  {
    id: "special-senses",
    term: "Special Senses",
    category: "General",
    aliases: ["darkvision", "blindsight", "truesight", "tremorsense"],
    body: [
      "Darkvision: see in dim light as bright and darkness as dim (shades of gray) out to a range.",
      "Blindsight senses without sight; Tremorsense detects via vibrations; Truesight pierces Darkness, invisibility, and illusions.",
    ],
  },
  {
    id: "carrying-capacity",
    term: "Carrying Capacity",
    category: "General",
    aliases: ["encumbrance", "carry", "weight"],
    body: [
      "You can carry up to 15 × your Strength score in pounds; lifting, dragging, or pushing handles up to twice that.",
      "This campaign tracks carried weight on your hunter sheet — see Carrying & Encumbrance in the handbook.",
    ],
  },
  {
    id: "rounds-turns",
    term: "Rounds & Turns",
    category: "General",
    aliases: ["round", "turn", "action economy"],
    body: [
      "Combat runs in ~6-second rounds. On your turn you can move and take one action, plus a Bonus Action and Reaction when available.",
      "Everyone acts once per round in initiative order; a new round begins when the order cycles back to the top.",
    ],
  },
  {
    id: "suffocating",
    term: "Suffocating",
    category: "General",
    aliases: ["holding breath", "drowning", "no air"],
    body: [
      "You can hold your breath for 1 + your Constitution modifier minutes (at least 30 seconds).",
      "Out of breath, you last a number of rounds equal to your Constitution modifier (minimum 1), then drop to 0 HP.",
    ],
  },
];
