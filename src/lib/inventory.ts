// Pure helpers for a hunter's inventory: resolving catalog items, grouping by
// carry significance, total weight, and the handbook carry-condition rule.

import type { HunterCard, Item, CarrySignificance, DroppedItem } from "@/types";
import { ITEM_BY_ID } from "@/data/items";
import { wornArmorWeight } from "@/lib/character";

export interface ResolvedEntry {
  item: Item;
  qty: number;
}

/** Resolve a card's inventory entries to catalog items, dropping unknown ids,
 *  sorted by category then name. */
export function resolveInventory(
  card: Pick<HunterCard, "inventory">,
): ResolvedEntry[] {
  const resolved: ResolvedEntry[] = [];
  for (const entry of card.inventory ?? []) {
    if (entry.qty <= 0) continue;
    const item = ITEM_BY_ID[entry.itemId];
    if (!item) continue;
    resolved.push({ item, qty: entry.qty });
  }
  return resolved.sort(
    (a, b) =>
      a.item.category.localeCompare(b.item.category) ||
      a.item.name.localeCompare(b.item.name),
  );
}

/** Carry groups in display order. */
export const CARRY_ORDER: CarrySignificance[] = [
  "Significant",
  "Oversized",
  "Insignificant",
];

/** Group resolved entries by carry significance (CARRY_ORDER, omit empty groups). */
export function groupByCarry(
  entries: ResolvedEntry[],
): { carry: CarrySignificance; entries: ResolvedEntry[] }[] {
  return CARRY_ORDER.map((carry) => ({
    carry,
    entries: entries.filter((e) => e.item.carry === carry),
  })).filter((group) => group.entries.length > 0);
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
  >,
): number {
  const storage = resolveStorage(card).reduce((sum, i) => sum + i.weightLb, 0);
  const sum = totalWeight(resolveInventory(card)) + wornArmorWeight(card) + storage;
  return Math.round(sum * 10) / 10;
}

// --- Recently dropped (#136): drop-confirmed lines stay recoverable for 15
// minutes of real time, tracked on the card itself (no server timer). ---

/** How long a dropped line stays recoverable. */
export const DROPPED_TTL_MS = 15 * 60 * 1000;

/** Dropped entries still inside the recovery window (unknown catalog ids and
 * empty quantities are dropped, like resolveInventory). A `droppedAt` in the
 * future (another device's clock ran ahead) counts as ACTIVE; an entry aged
 * exactly DROPPED_TTL_MS is expired. */
export function activeDropped(
  list: DroppedItem[] | undefined,
  nowMs: number,
): DroppedItem[] {
  return (list ?? []).filter(
    (d) => d.qty > 0 && !!ITEM_BY_ID[d.itemId] && nowMs - d.droppedAt < DROPPED_TTL_MS,
  );
}

/** ONE merge-patch that moves a whole inventory line into "Recently dropped":
 * the line leaves `inventory`; expired dropped entries are pruned (the
 * purge-on-write); re-dropping an item already in the window merges into one
 * entry — quantities add up, `droppedAt` refreshes to now. */
export function dropInventoryLine(
  card: Pick<HunterCard, "inventory" | "droppedItems">,
  itemId: string,
  nowMs: number,
): Pick<HunterCard, "inventory" | "droppedItems"> {
  const line = (card.inventory ?? []).find((e) => e.itemId === itemId);
  const qty = line?.qty ?? 0;
  const inventory = (card.inventory ?? []).filter((e) => e.itemId !== itemId);
  const kept = activeDropped(card.droppedItems, nowMs);
  if (qty <= 0) return { inventory, droppedItems: kept };
  const already = kept.find((d) => d.itemId === itemId)?.qty ?? 0;
  return {
    inventory,
    droppedItems: [
      ...kept.filter((d) => d.itemId !== itemId),
      { itemId, qty: qty + already, droppedAt: nowMs },
    ],
  };
}

/** ONE merge-patch that returns a recently dropped entry to the inventory
 * (also prunes expired entries). Expired or unknown ids restore nothing. */
export function pickUpDropped(
  card: Pick<HunterCard, "inventory" | "droppedItems">,
  itemId: string,
  nowMs: number,
): Pick<HunterCard, "inventory" | "droppedItems"> {
  const active = activeDropped(card.droppedItems, nowMs);
  const entry = active.find((d) => d.itemId === itemId);
  const droppedItems = active.filter((d) => d.itemId !== itemId);
  if (!entry) return { inventory: card.inventory ?? [], droppedItems };
  const rest = (card.inventory ?? []).filter((e) => e.itemId !== itemId);
  const held = (card.inventory ?? []).find((e) => e.itemId === itemId)?.qty ?? 0;
  return {
    inventory: [...rest, { itemId, qty: held + entry.qty }],
    droppedItems,
  };
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
