import { STORAGE_BY_ITEM_ID } from "@/data/storage";
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

export function unitValue(unit: CarryUnit): string {
  return `unit:${unit.item.id}:${unit.index}`;
}

export function parseUnitValue(value: string): { itemId: string; index: number } | null {
  const match = value.match(/^unit:(.+):(\d+)$/);
  return match ? { itemId: match[1], index: Number(match[2]) } : null;
}

export function unitLabel(unit: CarryUnit, units: CarryUnit[]): string {
  const copies = units.filter((entry) => entry.item.id === unit.item.id).length;
  return copies > 1 ? `${unit.item.name} ${unit.index + 1}` : unit.item.name;
}
