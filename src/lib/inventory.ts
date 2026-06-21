// Pure helpers for a hunter's inventory: resolving catalog items, grouping by
// carry significance, total weight, and the handbook carry-condition rule.

import type { HunterCard, Item, CarrySignificance } from "@/types";
import { ITEM_BY_ID } from "@/data/items";

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
