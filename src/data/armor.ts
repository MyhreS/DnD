import type { ArmorPiece } from "@/types";

// Armory — Player's Handbook, Chapter 1 (Step 4 / Armor Parts 1 & 2).
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
      "*Only grants AC while worn underneath Main Armor. Can conceal Insignificant items, making them harder to steal or strip away.",
  },

  // --- Armor Upgrades (modify armor pieces; not Add-on pieces) ---
  {
    id: "studs",
    name: "Studs",
    category: "Armor Upgrade",
    ac: "+1 / +2 AC",
    acValue: 1,
    weightLb: 3,
    special:
      "Added to Add-on Armor pieces (+3 lb. each). One studded piece grants +1 AC; five studded pieces grant +2 AC. While wearing studded armor you have disadvantage on Dexterity (Stealth) checks to hide or move silently.",
  },

  // --- Extras (flavour / utility, AC 0) ---
  {
    id: "tricorn",
    name: "Tricorn",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "May hide face transformations. Reads as a hard-hitting brawler.",
  },
  {
    id: "cavalier-hat",
    name: "Cavalier Hat",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "May hide face transformations. Reads as someone dexterous.",
  },
  {
    id: "cowl",
    name: "Cowl",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "May hide face transformations. Reads as someone with old knowledge.",
  },
  {
    id: "wide-brim-hat",
    name: "Wide Brim Hat",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special: "May hide face transformations. Reads as a skilled marksman.",
  },
  {
    id: "small-scarf",
    name: "Small Scarf",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 1,
    special:
      "May hide face transformations, but gives little protection against smoke, ash, cold or stench.",
  },
  {
    id: "large-scarf",
    name: "Large Scarf",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special:
      "May give advantage when concealing all transformations. Protects against smoke, ash or stench.",
  },
  {
    id: "leather-gloves",
    name: "Leather Gloves",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special:
      "Advantage against hand injury, heat, glass, bites and thorns; disadvantage on delicate hand tasks and reloading small firearms.",
  },
  {
    id: "leather-boots",
    name: "Leather Boots",
    category: "Extra",
    ac: "0",
    acValue: 0,
    weightLb: 2,
    special: "Prevents barefoot penalties.",
  },
];

export const MAIN_ARMOR = ARMOR.filter((a) => a.category === "Main Armor");
export const ADDON_ARMOR = ARMOR.filter((a) => a.category === "Add-on Armor");
export const EXTRA_ARMOR = ARMOR.filter((a) => a.category === "Extra");

export const ARMOR_BY_ID: Record<string, ArmorPiece> = Object.fromEntries(
  ARMOR.map((a) => [a.id, a]),
);

/**
 * AC category from a base armour AC (handbook: Calculate Your Armor Class).
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
