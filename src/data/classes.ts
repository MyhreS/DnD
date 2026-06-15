import type { HunterClass } from "@/types";

// The six hunter classes of Catacombs & Starspawns.
// Source: Player's Handbook, Chapter 1 — Class Overview (Parts 1 & 2).
// Flavour blurbs are written for the app; rules data is from the handbook.

export const CLASSES: HunterClass[] = [
  {
    id: "brute",
    name: "Brute",
    title: "Hunter Brute",
    tagline: "A wall of muscle and cold iron.",
    blurb:
      "Brutes meet the horrors of the night head-on. Where other hunters rely on cunning or old knowledge, the Brute relies on a greatsword and the will to keep swinging long after lesser hunters would fall. They wear the heaviest plate the workshop can forge and wade into the thickest of the beasts.",
    primaryAbility: "STR or DEX",
    savingThrows: ["str", "con"],
    hitDie: 10,
    speedFt: 30,
    armorTraining: ["Light armor", "Medium armor", "Heavy armor"],
    weaponProficiencies: "Simple and Martial weapons",
    toolProficiencies: "—",
    skillChoices: {
      count: 2,
      options: [
        "Acrobatics",
        "Athletics",
        "Grit",
        "Perception",
        "Survival",
        "Intimidation",
      ],
    },
    startingEquipment: [
      "Tool Belt",
      "2 Blood vials",
      "Greatsword",
      "Shortsword",
      "Rope",
    ],
    baseClass: "Fighter",
    signature:
      "Refuse the Bleeding — when you take damage, use your reaction to reduce it by 1d10 + your Hunter Brute level.",
    features: [
      { level: 1, name: "Fighting Style", text: "Gain a Fighting Style feat of your choice." },
      {
        level: 1,
        name: "Weapon Mastery",
        text: "Use the mastery properties of three kinds of Simple or Martial weapons; you can swap your choices on a Long Rest.",
      },
      {
        level: 2,
        name: "Action Surge",
        text: "On your turn, take one additional action. Once per Short or Long Rest (twice from level 17).",
      },
      {
        level: 2,
        name: "Refuse the Bleeding",
        text: "Reaction: reduce incoming damage by 1d10 + your Hunter Brute level. Regain one use on a Short Rest, all on a Long Rest.",
      },
      {
        level: 3,
        name: "Hunter Brute Subclass",
        text: "Choose a subclass — Battle Master or Champion.",
      },
      {
        level: 4,
        name: "Ability Score Improvement",
        text: "Take the ASI feat or another feat. Again at levels 6, 8, 12, 14 and 16.",
      },
      { level: 5, name: "Extra Attack", text: "Attack twice when you take the Attack action." },
      {
        level: 9,
        name: "Tactical Mind",
        text: "When using a weapon's mastery property, you may swap it for Push, Sap or Slow for that attack.",
      },
      { level: 11, name: "Two Extra Attacks", text: "Attack three times when you take the Attack action." },
      {
        level: 13,
        name: "Studied Attacks",
        text: "After missing a creature, you have Advantage on your next attack roll against it.",
      },
    ],
  },
  {
    id: "scout",
    name: "Scout",
    title: "Hunter Scout",
    tagline: "Eyes of the hunt, finger on the trigger.",
    blurb:
      "Scouts range ahead of the pack, reading tracks, marking quarry and softening the enemy with rifle fire before the blades are even drawn. Quick on their feet and quicker to spot a trap, a good Scout keeps the whole party alive.",
    primaryAbility: "DEX and WIS",
    savingThrows: ["str", "dex"],
    hitDie: 10,
    speedFt: 35,
    armorTraining: ["Light armor", "Medium armor"],
    weaponProficiencies: "Simple and Martial weapons",
    toolProficiencies: "—",
    skillChoices: {
      count: 3,
      options: [
        "Animal Handling",
        "Athletics",
        "Stealth",
        "Survival",
        "Investigation",
        "Perception",
      ],
    },
    startingEquipment: [
      "Tool Belt",
      "1 Blood vial",
      "18 bullets",
      "Hunter Rifle",
      "Hunter Cleaver",
      "Pistol",
      "Bandolier",
    ],
    baseClass: "Ranger",
    signature:
      "Hunter's Mark — Bonus Action, mark a creature within 90 ft: deal +1d6 on your hits against it and gain Advantage on Wisdom (Perception/Survival) checks to find it.",
    features: [
      {
        level: 1,
        name: "Hunter's Mark",
        text: "Mark a creature (Bonus Action, 90 ft) for +1d6 damage on hits and tracking advantage. Two marks; regain all on a Long Rest.",
      },
      {
        level: 1,
        name: "Weapon Mastery",
        text: "Use the mastery properties of two kinds of weapons; you can swap your choices on a Long Rest.",
      },
      {
        level: 2,
        name: "Expertise",
        text: "Choose one skill proficiency you lack Expertise in; you gain Expertise in it.",
      },
      { level: 2, name: "Fighting Style", text: "Gain a Fighting Style feat of your choice." },
      {
        level: 3,
        name: "Hunter Scout Subclass",
        text: "Choose a subclass — Beast Caller or Marksman.",
      },
      {
        level: 4,
        name: "Ability Score Improvement",
        text: "Take the ASI feat or another feat. Again at levels 8, 12 and 16.",
      },
      { level: 5, name: "Extra Attack", text: "Attack twice when you take the Attack action." },
    ],
  },
  {
    id: "stalker",
    name: "Stalker",
    title: "Hunter Stalker",
    tagline: "A whisper, a glint, a slit throat.",
    blurb:
      "Stalkers turn the night against its own monsters. They move unseen, strike from shadow, and vanish before the alarm is raised. Light on their feet and lighter on their armor, they trade protection for the lethal advantage of surprise.",
    primaryAbility: "DEX",
    savingThrows: ["dex", "int"],
    hitDie: 8,
    speedFt: 30,
    armorTraining: ["Light armor"],
    weaponProficiencies:
      "Simple weapons and Martial weapons with the Finesse or Light property",
    toolProficiencies: "Thieves' Tools",
    skillChoices: {
      count: 2,
      options: [
        "Acrobatics",
        "Athletics",
        "Deception",
        "Insight",
        "Intimidation",
        "Investigation",
        "Perception",
        "Sleight of Hand",
        "Stealth",
      ],
    },
    startingEquipment: [
      "Tool Belt",
      "1 Blood vial",
      "4 bullets",
      "Scimitar",
      "4 Daggers",
      "Pistol",
      "Thieves' Tools",
    ],
  },
  {
    id: "deepcaller",
    name: "Deepcaller",
    title: "Hunter Deepcaller",
    tagline: "Knowledge man was not meant to hold.",
    blurb:
      "Deepcallers have peered into the spaces between the stars and come back changed. They wield eldritch insight as a weapon, calling on truths scrawled in forbidden books. Frail of body but vast of mind, a Deepcaller sees what others cannot — and pays for it.",
    primaryAbility: "INT",
    savingThrows: ["int", "wis"],
    hitDie: 6,
    speedFt: 30,
    armorTraining: ["Light armor"],
    weaponProficiencies: "Simple weapons",
    toolProficiencies: "—",
    skillChoices: {
      count: 2,
      options: [
        "Eldritch Knowledge",
        "Old World History",
        "Investigation",
        "Insight",
        "Blood Nature",
        "Religion",
        "Deception",
      ],
    },
    startingEquipment: [
      "Tool Belt",
      "1 Blood vial",
      "Sickle",
      "2 Daggers",
      "Book of eldritch knowledge",
      "Robe",
    ],
  },
  {
    id: "bloodbound",
    name: "Bloodbound",
    title: "Hunter Bloodbound",
    tagline: "The hunt sings in their veins.",
    blurb:
      "Bloodbound have given themselves over to the old blood. It makes them monstrously tough and savage in the fray, fuelled by ministrations few would survive. The greataxe in their grip is almost an afterthought — the real weapon is what runs through them.",
    primaryAbility: "CON",
    savingThrows: ["str", "con"],
    hitDie: 12,
    speedFt: 30,
    armorTraining: ["Light armor", "Medium armor"],
    weaponProficiencies: "Simple and Martial weapons",
    toolProficiencies: "Blood-drainer's Tools (unique item)",
    skillChoices: {
      count: 2,
      options: [
        "Grit",
        "Blood Nature",
        "Athletics",
        "Intimidation",
        "Medicine",
        "Perception",
        "Survival",
      ],
    },
    startingEquipment: [
      "Tool Belt",
      "3 Blood vials",
      "Greataxe",
      "2 Handaxes",
      "Blood-drainer's Tools (unique item)",
    ],
  },
  {
    id: "warden",
    name: "Warden",
    title: "Hunter Warden",
    tagline: "The lantern that others follow.",
    blurb:
      "Wardens carry the bell and the lantern. Part shepherd, part marksman, they hold a hunting party together — calling allies through the fog, setting traps, and laying down covering fire. Where the Warden's bell tolls, lost hunters find their way home.",
    primaryAbility: "WIS and CHA",
    savingThrows: ["wis", "cha"],
    hitDie: 10,
    speedFt: 30,
    armorTraining: ["Light armor", "Medium armor", "Heavy armor"],
    weaponProficiencies: "Simple and Martial weapons",
    toolProficiencies: "Navigator's Tools",
    skillChoices: {
      count: 2,
      options: [
        "Perception",
        "Investigation",
        "Animal Handling",
        "Survival",
        "Presence",
        "Persuasion",
      ],
    },
    startingEquipment: [
      "Tool Belt",
      "1 Blood vial",
      "Hunter Rifle",
      "10 bullets",
      "Longsword",
      "Navigator's Tools",
      "Bell",
      "Bandolier",
      "2 Hunting Traps",
    ],
  },
];

export const CLASS_BY_ID: Record<string, HunterClass> = Object.fromEntries(
  CLASSES.map((c) => [c.id, c]),
);

export function getClass(id: string | null | undefined): HunterClass | undefined {
  if (!id) return undefined;
  return CLASS_BY_ID[id];
}
