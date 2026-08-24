import { ARMOR_BY_ID } from "@/data/armor";
import { ITEM_BY_ID } from "@/data/items";
import type { ArmorPiece, CustomItem, HunterCard, Item } from "@/types";

type WithCustomItems = Pick<HunterCard, "customItems">;

export function customItemFor(card: WithCustomItems, id: string): CustomItem | undefined {
  return card.customItems?.find((item) => item.id === id);
}

export function itemFor(card: WithCustomItems, id: string): Item | undefined {
  return ITEM_BY_ID[id] ?? customItemFor(card, id);
}

export function armorFor(card: WithCustomItems, id: string): ArmorPiece | undefined {
  const catalog = ARMOR_BY_ID[id];
  if (catalog) return catalog;
  const custom = customItemFor(card, id);
  if (custom?.category !== "Armor" || !custom.armorCategory || custom.acValue == null) return undefined;
  return {
    id: custom.id,
    name: custom.name,
    category: custom.armorCategory,
    ac: custom.armorCategory === "Main Armor" ? `AC ${custom.acValue}` : custom.armorCategory === "Extra" ? "0" : `+${custom.acValue} AC`,
    acValue: custom.acValue,
    weightLb: custom.weightLb,
    special: custom.note ?? "Unique armor found during play.",
    subcategory: custom.armorSubcategory,
    unique: true,
  };
}
