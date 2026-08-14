import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { ITEMS } from "@/data/items";
import { resolveInventory } from "@/lib/inventory";
import { availableSlotAssignmentOptions, computeSlots } from "@/lib/slots";
import type { HunterCard, Item, SlotAssignment } from "@/types";

export interface CarryUnit {
  item: Item;
  index: number;
  assignment: SlotAssignment | null;
}

export function carryingUnits(card: HunterCard): CarryUnit[] {
  const placed = computeSlots(card).placedAssignments;
  return resolveInventory(card).flatMap(({ item, qty }) => {
    if (item.category === "Armor" || item.carry === "Insignificant" || STORAGE_BY_ITEM_ID[item.id]) return [];
    return Array.from({ length: Math.min(qty, 99) }, (_, index) => ({
      item,
      index,
      assignment: placed[item.id]?.[index] ?? null,
    }));
  });
}

export function availableUnitsFor(
  card: HunterCard,
  units: CarryUnit[],
  target: SlotAssignment,
): CarryUnit[] {
  return units.filter((unit) => {
    if (unit.assignment) return false;
    const raw = card.slotAssignments?.[unit.item.id]?.[unit.index] ?? null;
    if (raw === target) return false;
    return availableSlotAssignmentOptions(
      card,
      unit.item.id,
      unit.index,
      unit.item.carry,
      unit.item.slotLocation,
    ).some((option) => option.value === target);
  });
}

export function catalogueItemsForTarget(card: HunterCard, target: SlotAssignment): Item[] {
  return ITEMS.filter((item) => {
    if (item.category === "Armor" || item.carry === "Insignificant" || item.unique || STORAGE_BY_ITEM_ID[item.id]) return false;
    const qty = card.inventory?.find((entry) => entry.itemId === item.id)?.qty ?? 0;
    const inventory = [...(card.inventory ?? []).filter((entry) => entry.itemId !== item.id), { itemId: item.id, qty: qty + 1 }];
    return availableSlotAssignmentOptions(
      { ...card, inventory },
      item.id,
      qty,
      item.carry,
      item.slotLocation,
    ).some((option) => option.value === target);
  });
}

export function unitLabel(unit: CarryUnit, units: CarryUnit[]): string {
  const copies = units.filter((entry) => entry.item.id === unit.item.id).length;
  return copies > 1 ? `${unit.item.name} ${unit.index + 1}` : unit.item.name;
}
