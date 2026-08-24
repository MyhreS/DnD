import { resolveInventory } from "@/lib/inventory";
import { computeSlots } from "@/lib/slots";
import type { HunterCard } from "@/types";

/** Inventory units that are not currently placed in a valid equipment slot. */
export function resolveUnassignedInventory(card: HunterCard) {
  const placed = computeSlots(card).placedAssignments;
  return resolveInventory(card).flatMap(({ item, qty }) => {
    const equippedQty = (placed[item.id] ?? []).filter(Boolean).length;
    const unassignedQty = Math.max(0, qty - equippedQty);
    return unassignedQty > 0 ? [{ item, qty: unassignedQty }] : [];
  });
}
