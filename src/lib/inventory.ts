// Pure helpers for a hunter's inventory: resolving catalog items, grouping by
// carry significance, total weight, and the handbook carry-condition rule.

import type { HunterCard, Item } from "@/types";
import { ITEM_BY_ID } from "@/data/items";
import { wornArmorWeight } from "@/lib/character";
import { itemFor } from "@/lib/customItems";

export interface ResolvedEntry {
  item: Item;
  qty: number;
}

/** Resolve a card's inventory entries to catalog items, dropping unknown ids,
 *  sorted by category then name. */
export function resolveInventory(
  card: Pick<HunterCard, "inventory" | "customItems">,
): ResolvedEntry[] {
  const resolved: ResolvedEntry[] = [];
  for (const entry of card.inventory ?? []) {
    if (entry.qty <= 0) continue;
    const item = itemFor(card, entry.itemId);
    if (!item) continue;
    resolved.push({ item, qty: entry.qty });
  }
  return resolved.sort(
    (a, b) =>
      a.item.category.localeCompare(b.item.category) ||
      a.item.name.localeCompare(b.item.name),
  );
}

/** Total carried weight in lb (sum of weightLb * qty), rounded to 1 decimal. */
export function totalWeight(entries: ResolvedEntry[]): number {
  const sum = entries.reduce((acc, e) => acc + e.item.weightLb * e.qty, 0);
  return Math.round(sum * 10) / 10;
}

/** A card's WORN storage items (equippedStorageIds), resolved to catalog
 * items, dropping unknown ids. */
export function resolveStorage(
  card: Pick<HunterCard, "equippedStorageIds">,
): Item[] {
  return (card.equippedStorageIds ?? [])
    .map((id) => ITEM_BY_ID[id])
    .filter((i): i is Item => !!i);
}

/** EVERYTHING carried, per the handbook: inventory + worn armor (incl. studs)
 * + worn storage items. Coins stay weightless (current behavior). */
export function totalCarriedWeight(
  card: Pick<
    HunterCard,
    | "inventory"
    | "equippedStorageIds"
    | "mainArmorId"
    | "addonArmorIds"
    | "studdedAddons"
    | "studdedAddonIds"
    | "extraArmorIds"
    | "customItems"
  >,
): number {
  const storage = resolveStorage(card).reduce((sum, i) => sum + i.weightLb, 0);
  const wornArmorIds = new Set([
    card.mainArmorId,
    ...(card.addonArmorIds ?? []),
    ...(card.extraArmorIds ?? []),
  ]);
  // Starting unique garments (such as the Deepcaller's robe) are retained in
  // inventory as proof of ownership. Once worn, their weight comes from the
  // armor slice, so exclude that same inventory entry to avoid counting it twice.
  const inventory = totalWeight(resolveInventory(card).filter(({ item }) => !wornArmorIds.has(item.id)));
  const sum = inventory + wornArmorWeight(card) + storage;
  return Math.round(sum * 10) / 10;
}

/** Carry condition from Strength score + carried weight, per the handbook
 *  thresholds (Featherweight ≤ STR×2: +5ft; Normal ≤ STR×5: 0; Encumbered ≤
 *  STR×10: −10ft; Heavily Encumbered ≤ STR×15: −20ft; else Over Capacity). */
export function carryCondition(
  strScore: number,
  weightLb: number,
): { label: string; speedDelta: number; note: string } {
  if (weightLb <= strScore * 2) {
    return {
      label: "Featherweight",
      speedDelta: 5,
      note: "Light load — moves quickly (+5 ft).",
    };
  }
  if (weightLb <= strScore * 5) {
    return {
      label: "Normal",
      speedDelta: 0,
      note: "Carrying comfortably.",
    };
  }
  if (weightLb <= strScore * 10) {
    return {
      label: "Encumbered",
      speedDelta: -10,
      note: "Encumbered — speed −10 ft.",
    };
  }
  if (weightLb <= strScore * 15) {
    return {
      label: "Heavily Encumbered",
      speedDelta: -20,
      note: "Heavily encumbered — speed −20 ft and disadvantage on STR/DEX checks, attacks and saves.",
    };
  }
  return {
    label: "Over Capacity",
    speedDelta: 0,
    note: "Over capacity — can't carry this normally.",
  };
}
