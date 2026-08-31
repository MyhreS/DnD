import type { ArmorPiece } from "@/types";

// Established app armory catalog, outside the current four-document source set.
// `acValue` is the numeric contribution used by the AC calculator:
//   Main Armor  -> base AC (replaces the unarmoured 10)
//   Add-on      -> bonus added on top
//   Extra       -> 0 (flavour / utility)

export const ARMOR: ArmorPiece[] = [
  // --- Main Armor (choose one) ---
  {
    id: "hunter-leather-vest",
    name: "Hunter Leather Vest",
    category: "Main Armor",
    ac: "AC 11",
    acValue: 11,
    weightLb: 6,
    special:
      "Open Movement. Advantage on Strength (Athletics) checks to climb, vault or jump while worn.",
  },
  {
    id: "hunter-leather-jacket",
    name: "Hunter Leather Jacket",
    category: "Main Armor",
    ac: "AC 11",
    acValue: 11,
    weightLb: 6,
    special:
      "Balanced Fit. You may wear one Add-on Armour piece without it counting toward your maximum.",
  },
  {
    id: "hunter-leather-coat",
    name: "Hunter Leather Coat",
    category: "Main Armor",
    ac: "AC 11",
    acValue: 11,
    weightLb: 7,
    special:
      "Blood-Slick Coat. The first time you're hit by a melee attack after rolling initiative, reduce the damage by your Proficiency Bonus.",
  },
  {
    id: "reinforced-hunter-leather-vest",
    name: "Reinforced Hunter Leather Vest",
    category: "Main Armor",
    ac: "AC 12",
    acValue: 12,
    weightLb: 10,
    special:
      "Open Movement. Advantage on Strength (Athletics) checks to climb, vault or jump while worn.",
  },
  {
    id: "reinforced-hunter-leather-jacket",
    name: "Reinforced Hunter Leather Jacket",
    category: "Main Armor",
    ac: "AC 12",
    acValue: 12,
    weightLb: 10,
    special:
      "Balanced Fit. You may wear one Add-on Armour piece without it counting toward your maximum.",
  },
  {
    id: "reinforced-hunter-leather-coat",
    name: "Reinforced Hunter Leather Coat",
    category: "Main Armor",
    ac: "AC 12",
    acValue: 12,
    weightLb: 11,
    special:
      "Blood-Slick Coat. The first time you're hit by a melee attack after rolling initiative, reduce the damage by your Proficiency Bonus.",
  },

  // --- Add-on Armor (max five) ---
  {
    id: "full-leather-cuirass",
    name: "Full Leather Cuirass",
    category: "Add-on Armor",
    ac: "+2 AC",
    acValue: 2,
    weightLb: 10,
    special: "Disadvantage on Dexterity (Stealth) checks to hide or move silently.",
  },
  {
    id: "leather-pauldron-right",
    name: "Leather Pauldron, Right",
    category: "Add-on Armor",
    ac: "+1 AC",
    acValue: 1,
    weightLb: 2,
    special: "May give Shield Arm.",
  },
  {
    id: "leather-pauldron-left",
    name: "Leather Pauldron, Left",
    category: "Add-on Armor",
    ac: "+1 AC",
    acValue: 1,
    weightLb: 2,
    special: "May give Shield Arm.",
  },
  {
    id: "leather-vambrace-right",
    name: "Leather Vambrace, Right",
    category: "Add-on Armor",
    ac: "+0 AC",
    acValue: 0,
    weightLb: 2,
    special: "May give Shield Arm.",
  },
  {
    id: "leather-vambrace-left",
    name: "Leather Vambrace, Left",
    category: "Add-on Armor",
    ac: "+0 AC",
    acValue: 0,
    weightLb: 2,
    special: "May give Shield Arm.",
  },
  {
    id: "under-layer-leather-jerkin",
    name: "Under Layer Leather Jerkin",
    category: "Add-on Armor",
    ac: "+1 AC*",
    acValue: 1,
    weightLb: 2,
    special:
      "*Only grants AC while worn underneath Main Armor. Can conceal Insignificant items, making them harder to steal, find, or strip away.",
  },

  // --- Armor Upgrades (modify armor pieces; not Add-on pieces) ---
  {
    id: "studs",
    name: "Studs",
    category: "Armor Upgrade",
    ac: "+1 / +2 AC",
    acValue: 1,
    weightLb: 5,
    special:
      "Added to Add-on Armor pieces (+5 lb. each). If at least three Add-on Armor pieces are studded, you gain +1 AC. If five are studded, this bonus increases to +2 AC. While wearing studded armor, you have Disadvantage on Dexterity (Stealth) checks made to hide or move silently.",
  },

  // --- Extras (flavour / utility, AC 0; only ONE worn per subcategory) ---
  {
    id: "tricorn",
    name: "Tricorn",
    category: "Extra",
    subcategory: "Head Gear",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "Is given by class.",
    impression: "Reads as a hard-hitting brawler.",
  },
  {
    id: "cavalier-hat",
    name: "Cavalier Hat",
    category: "Extra",
    subcategory: "Head Gear",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "Is given by class.",
    impression: "Reads as someone dexterous.",
  },
  {
    id: "cowl",
    name: "Cowl",
    category: "Extra",
    subcategory: "Head Gear",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "Is given by class.",
    impression: "Reads as someone with old knowledge.",
  },
  {
    id: "wide-brim-hat",
    name: "Wide Brim Hat",
    category: "Extra",
    subcategory: "Head Gear",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "Is given by class.",
    impression: "Reads as a skilled marksman.",
  },
  {
    id: "small-scarf",
    name: "Small Scarf",
    category: "Extra",
    subcategory: "Scarf",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special:
      "Can conceal a minor visible mouth or neck transformation from casual observation.",
  },
  {
    id: "large-scarf",
    name: "Large Scarf",
    category: "Extra",
    subcategory: "Scarf",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special:
      "You have Advantage on checks to conceal visible mouth and neck transformations.",
  },
  {
    id: "leather-gloves",
    name: "Leather Gloves",
    category: "Extra",
    subcategory: "Gloves",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special:
      "May give relevant advantages / disadvantages during play. The player has to themselves explain how using the gloves in a particular situation will bring some advantage to a check.",
  },
  {
    id: "leather-boots",
    name: "Leather Boots",
    category: "Extra",
    subcategory: "Boots",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special: "Prevents barefoot penalties.",
  },
  // The Robe of the Deepcallers is a UNIQUE item that "is also under the
  // Equipment Category: Armor. You can equip this as any other Armor" (Unique
  // Items). It reuses the legacy catalog item id `robe` so existing Deepcaller
  // inventories keep resolving; being `unique`, it's never offered at creation.
  {
    id: "robe",
    name: "Robe of the Deepcallers",
    category: "Extra",
    subcategory: "Robe",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special:
      "If worn continuously since your previous Long Rest, add +2 to your Sanity Die roll when rolling it during a Long Rest.",
    unique: true,
  },
];

export const ARMOR_BY_ID: Record<string, ArmorPiece> = Object.fromEntries(
  ARMOR.map((a) => [a.id, a]),
);

/**
 * AC category from a base armour AC in the established armor model.
 * Determines how much Dexterity modifier applies.
 */
export function acCategory(baseAc: number): {
  label: string;
  dexRule: string;
  applyDex: (dexMod: number) => number;
} {
  if (baseAc <= 10) {
    return {
      label: "Unarmored",
      dexRule: "Add your full Dexterity modifier.",
      applyDex: (d) => d,
    };
  }
  if (baseAc <= 12) {
    return {
      label: "Light Armor",
      dexRule: "Add your full Dexterity modifier.",
      applyDex: (d) => d,
    };
  }
  if (baseAc <= 14) {
    return {
      label: "Medium Armor",
      dexRule: "Add your Dexterity modifier, up to a maximum of +2.",
      applyDex: (d) => Math.min(d, 2),
    };
  }
  return {
    label: "Heavy Armor",
    dexRule: "Do not add your Dexterity modifier.",
    applyDex: () => 0,
  };
}
