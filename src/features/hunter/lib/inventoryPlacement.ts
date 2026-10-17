import { resolveInventory } from "@/lib/inventory";
import { computeSlots } from "@/lib/slots";
import type { HunterCard } from "@/types";

/** Inventory units that are not currently placed in a valid equipment slot. */
export function resolveUnassignedInventory(card: HunterCard) {
  const placed = computeSlots(card).placedAssignments;
  return resolveInventory(card).flatMap((entry) => {
    const equippedQty = (placed[entry.item.id] ?? []).filter(Boolean).length;
    const unassignedQty = Math.max(0, entry.qty - equippedQty);
    return unassignedQty > 0 ? [{ ...entry, qty: unassignedQty }] : [];
  });
}
