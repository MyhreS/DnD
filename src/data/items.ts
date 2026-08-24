import type { Item } from "@/types";
import { ARMOR } from "@/data/armor";

// Tradeable-item catalog for Catacombs & Starspawns.
// Drawn from the game's own resources: every distinct item across the six
// classes' `startingEquipment` (see src/data/classes.ts), plus common gear
// from the Player's Handbook carrying-category table ("CHECK YOUR ITEM SLOTS")
// in resources/extracted/text/. Carrying significance follows that table:
//   Insignificant — keys, letters, maps, coins, rings, parchment, blood vials,
//     supplies, kits, tool *sets*, ammunition.
//   Significant   — daggers, handaxes, rope, pistols, rifles, chains, swords,
//     scimitars, sickles, cleavers, lanterns, shovels, crowbars, tool belts,
//     bandoliers, backpacks, hunting traps, books.
//   Oversized     — great weapons, heavy crates, barrels, ladders, corpses.
// Weights and carrying categories follow resources/master.json (Weapons table,
// Hunter Gear table, Tools + Storage Items sections) — the DM's source of
// truth; `scripts/verify-item-data.mjs` asserts the match. Weapons may always
// be carried in Hand, even where the catalog lists a preferred slot.
// Items with no master entry (Bedroll, Rations, …) use 5e weights as a guide.
// Hunter Rifle, Hunter Cleaver and
// Blood-drainer's Tools are flagged unique (the resources call them "unique
// item"). Armor is folded in from src/data/armor.ts at the bottom.

const armorItems: Item[] = ARMOR.map((a) => ({
  id: a.id,
  name: a.name,
  category: "Armor" as const,
  carry: "Significant" as const,
  weightLb: a.weightLb,
  note: a.special,
  ...(a.unique ? { unique: true } : {}),
}));

export const ITEMS: Item[] = [
  // --- Weapons: blades ---
  {
    id: "greatsword",
    name: "Greatsword",
    category: "Weapon",
    carry: "Oversized",
    weightLb: 14,
    note: "A great weapon — too large to tuck away.",
  },
  {
    id: "greataxe",
    name: "Greataxe",
    category: "Weapon",
    carry: "Oversized",
    weightLb: 14,
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
    weightLb: 0,
    note: "A pouch of bullets for firearms. Bullets have no carried weight.",
  },

  // --- Tools (tool sets + tool belt) ---
  {
    id: "tool-belt",
    name: "Tool Belt",
    category: "Tool",
    carry: "Significant",
    weightLb: 3,
    note: "Storage: uses the hip slot, gives 4 Significant slots (hip).",
  },
  {
    id: "thieves-tools",
    name: "Thieves' Tools",
    category: "Tool",
    carry: "Insignificant",
    weightLb: 1,
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
    weightLb: 5,
    note: "50 feet of hempen rope.",
  },
  {
    id: "bandolier",
    name: "Bandolier",
    category: "Gear",
    carry: "Significant",
    weightLb: 4,
    note: "Storage: uses the front slot, gives 4 Significant slots (front).",
  },
  {
    id: "backpack",
    name: "Backpack",
    category: "Gear",
    carry: "Significant",
    weightLb: 5,
    note: "Storage: uses the back slot, gives 7 Significant slots (back).",
  },
  {
    id: "sack",
    name: "Sack",
    category: "Gear",
    carry: "Significant",
    weightLb: 1,
    note: "Storage: carried in hand (Oversized), gives 15 Significant slots (hand).",
  },
  {
    id: "carrying-harness",
    name: "Carrying Harness",
    category: "Gear",
    carry: "Significant",
    weightLb: 3,
    note: "Storage: uses the back slot, gives 2 Significant slots (back).",
  },
  {
    id: "ankle-holster",
    name: "Ankle Holster",
    category: "Gear",
    carry: "Insignificant",
    weightLb: 1,
    note: "Storage: gives 1 Significant slot (ankle) — Dagger or Pistol only.",
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
    note: "Carried on the back.",
    slotLocation: "back",
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
    carry: "Insignificant",
    weightLb: 0,
    note: "Rung as a Utilize action; heard up to 60 feet away.",
  },
  // `robe` (the Robe of the Deepcallers) now lives in src/data/armor.ts and is
  // folded in below — same item id, so legacy inventories keep resolving.
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
  {
    id: "manacles",
    name: "Manacles",
    category: "Gear",
    carry: "Insignificant",
    weightLb: 6,
    note: "Iron restraints for a Small or Medium creature.",
  },
  {
    id: "lamp",
    name: "Lamp",
    category: "Gear",
    carry: "Significant",
    weightLb: 1,
    note: "Burns oil to cast light in a 15 ft radius.",
  },
  {
    id: "brewers-supplies",
    name: "Brewer's Supplies",
    category: "Tool",
    carry: "Insignificant",
    weightLb: 9,
    note: "A missionary's cover trade — kettles, hops and bottles.",
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
  {
    id: "antitoxin",
    name: "Antitoxin",
    category: "Consumable",
    carry: "Insignificant",
    weightLb: 0,
    note: "Advantage on saves against poison for 1 hour.",
  },
  {
    id: "oil",
    name: "Oil",
    category: "Consumable",
    carry: "Insignificant",
    weightLb: 1,
    note: "A flask of oil — fuel for a lamp, or stranger uses.",
  },

  // --- Armor (folded in from src/data/armor.ts) ---
  ...armorItems,
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);
