import type { Item, ItemCategory } from "@/types";
import { ARMOR } from "@/data/armor";

// Tradeable-item catalog for Catacombs & Starspawns.
// Drawn from the game's own resources: every distinct item across the six
// classes' `startingEquipment` (see src/data/classes.ts), plus common gear
// from the Player's Handbook carrying-category table ("CHECK YOUR ITEM SLOTS")
// in resources/extracted/text/. Carrying significance follows that table:
//   Insignificant — keys, letters, maps, coins, rings, parchment, blood vials,
//     supplies, kits, tool *sets*, ammunition, robes.
//   Significant   — daggers, handaxes, rope, pistols, rifles, chains, swords,
//     scimitars, sickles, cleavers, lanterns, shovels, crowbars, tool belts,
//     bandoliers, backpacks, hunting traps, books.
//   Oversized     — great weapons, heavy crates, barrels, ladders, corpses.
// Standard 5e weights are used as a guide. Hunter Rifle, Hunter Cleaver and
// Blood-drainer's Tools are flagged unique (the resources call them "unique
// item"). Armor is folded in from src/data/armor.ts at the bottom.

const armorItems: Item[] = ARMOR.map((a) => ({
  id: a.id,
  name: a.name,
  category: "Armor" as const,
  carry: "Significant" as const,
  weightLb: a.weightLb,
  note: a.special,
}));

export const ITEMS: Item[] = [
  // --- Weapons: blades ---
  {
    id: "greatsword",
    name: "Greatsword",
    category: "Weapon",
    carry: "Oversized",
    weightLb: 6,
    note: "A great weapon — too large to tuck away.",
  },
  {
    id: "greataxe",
    name: "Greataxe",
    category: "Weapon",
    carry: "Oversized",
    weightLb: 7,
    note: "A great weapon — too large to tuck away.",
  },
  {
    id: "longsword",
    name: "Longsword",
    category: "Weapon",
    carry: "Significant",
    weightLb: 3,
  },
  {
    id: "shortsword",
    name: "Shortsword",
    category: "Weapon",
    carry: "Significant",
    weightLb: 2,
  },
  {
    id: "scimitar",
    name: "Scimitar",
    category: "Weapon",
    carry: "Significant",
    weightLb: 3,
  },
  {
    id: "hunter-cleaver",
    name: "Hunter Cleaver",
    category: "Weapon",
    carry: "Significant",
    weightLb: 4,
    note: "A hunter's signature transforming blade.",
    unique: true,
  },
  {
    id: "sickle",
    name: "Sickle",
    category: "Weapon",
    carry: "Significant",
    weightLb: 2,
  },
  {
    id: "handaxe",
    name: "Handaxe",
    category: "Weapon",
    carry: "Significant",
    weightLb: 2,
  },
  {
    id: "dagger",
    name: "Dagger",
    category: "Weapon",
    carry: "Significant",
    weightLb: 1,
  },

  // --- Weapons: firearms ---
  {
    id: "hunter-rifle",
    name: "Hunter Rifle",
    category: "Weapon",
    carry: "Significant",
    weightLb: 10,
    note: "The hunter's sacred thunder.",
    unique: true,
  },
  {
    id: "pistol",
    name: "Pistol",
    category: "Weapon",
    carry: "Significant",
    weightLb: 3,
  },

  // --- Ammunition ---
  {
    id: "bullets",
    name: "Bullets",
    category: "Ammunition",
    carry: "Insignificant",
    weightLb: 1,
    note: "A pouch of bullets for firearms.",
  },

  // --- Tools (tool sets + tool belt) ---
  {
    id: "tool-belt",
    name: "Tool Belt",
    category: "Tool",
    carry: "Significant",
    weightLb: 2,
  },
  {
    id: "thieves-tools",
    name: "Thieves' Tools",
    category: "Tool",
    carry: "Insignificant",
    weightLb: 2,
  },
  {
    id: "navigators-tools",
    name: "Navigator's Tools",
    category: "Tool",
    carry: "Insignificant",
    weightLb: 2,
  },
  {
    id: "blood-drainers-tools",
    name: "Blood-drainer's Tools",
    category: "Tool",
    carry: "Insignificant",
    weightLb: 2,
    note: "The Bloodbound's signature kit.",
    unique: true,
  },

  // --- Gear ---
  {
    id: "rope",
    name: "Rope",
    category: "Gear",
    carry: "Significant",
    weightLb: 10,
    note: "50 feet of hempen rope.",
  },
  {
    id: "bandolier",
    name: "Bandolier",
    category: "Gear",
    carry: "Significant",
    weightLb: 1,
  },
  {
    id: "backpack",
    name: "Backpack",
    category: "Gear",
    carry: "Significant",
    weightLb: 5,
  },
  {
    id: "lantern",
    name: "Lantern",
    category: "Gear",
    carry: "Significant",
    weightLb: 2,
  },
  {
    id: "crowbar",
    name: "Crowbar",
    category: "Gear",
    carry: "Significant",
    weightLb: 5,
  },
  {
    id: "shovel",
    name: "Shovel",
    category: "Gear",
    carry: "Significant",
    weightLb: 5,
  },
  {
    id: "chain",
    name: "Chain",
    category: "Gear",
    carry: "Significant",
    weightLb: 10,
    note: "10 feet of heavy chain.",
  },
  {
    id: "hunting-trap",
    name: "Hunting Trap",
    category: "Gear",
    carry: "Significant",
    weightLb: 25,
  },
  {
    id: "book-of-eldritch-knowledge",
    name: "Book of eldritch knowledge",
    category: "Gear",
    carry: "Significant",
    weightLb: 5,
    note: "Forbidden passages — the Deepcaller's tome.",
  },
  {
    id: "bell",
    name: "Bell",
    category: "Gear",
    carry: "Significant",
    weightLb: 1,
  },
  {
    id: "robe",
    name: "Robe",
    category: "Gear",
    carry: "Insignificant",
    weightLb: 4,
  },
  {
    id: "torch",
    name: "Torch",
    category: "Gear",
    carry: "Significant",
    weightLb: 1,
  },
  {
    id: "bedroll",
    name: "Bedroll",
    category: "Gear",
    carry: "Significant",
    weightLb: 7,
  },
  {
    id: "waterskin",
    name: "Waterskin",
    category: "Gear",
    carry: "Significant",
    weightLb: 5,
    note: "Holds 4 pints; weight when full.",
  },
  {
    id: "key",
    name: "Key",
    category: "Gear",
    carry: "Insignificant",
    weightLb: 0,
  },
  {
    id: "letter",
    name: "Letter",
    category: "Gear",
    carry: "Insignificant",
    weightLb: 0,
  },
  {
    id: "map",
    name: "Map",
    category: "Gear",
    carry: "Insignificant",
    weightLb: 0,
  },

  // --- Consumables ---
  {
    id: "blood-vial",
    name: "Blood vial",
    category: "Consumable",
    carry: "Insignificant",
    weightLb: 0,
    note: "Restorative blood — the hunter's lifeline.",
  },
  {
    id: "rations",
    name: "Rations",
    category: "Consumable",
    carry: "Significant",
    weightLb: 2,
    note: "One day's trail rations.",
  },

  // --- Armor (folded in from src/data/armor.ts) ---
  ...armorItems,
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

export const ITEM_CATEGORIES: ItemCategory[] = [
  "Weapon",
  "Armor",
  "Ammunition",
  "Tool",
  "Gear",
  "Consumable",
  "Valuable",
];
