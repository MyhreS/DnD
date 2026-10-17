import { resolveInventory } from "@/lib/inventory";
import { computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import { armorFor, itemFor } from "@/lib/customItems";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import type { HunterCard, Item } from "@/types";

/** Inventory units that are not currently placed in a valid equipment slot. */
export function resolveUnassignedInventory(card: HunterCard) {
  const placed = computeSlots(card).placedAssignments;
  return resolveInventory(card).flatMap((entry) => {
    const equippedQty = (placed[entry.item.id] ?? []).filter(Boolean).length;
    const unassignedQty = Math.max(0, entry.qty - equippedQty);
    return unassignedQty > 0 ? [{ ...entry, qty: unassignedQty }] : [];
  });
}

/** What the Hunter is wearing right now — armor pieces and worn storage —
 * which lives outside the inventory lines, with where it is worn. */
export function wornEquipment(card: HunterCard): Array<{ item: Item; label: string }> {
  const worn: Array<{ item: Item; label: string }> = [];
  const add = (id: string | null | undefined, label: string) => {
    const item = id ? itemFor(card, id) : undefined;
    if (item) worn.push({ item, label });
  };
  add(card.mainArmorId, "Worn · Main armor");
  for (const id of card.addonArmorIds ?? []) add(id, "Worn · Add-on armor");
  for (const id of card.extraArmorIds ?? []) add(id, `Worn · ${armorFor(card, id)?.subcategory ?? "Extra"}`);
  for (const id of card.equippedStorageIds ?? []) {
    const gives = STORAGE_BY_ITEM_ID[id]?.gives;
    add(id, gives ? `Worn · holds ${gives.count} ${SLOT_LOCATION_LABEL[gives.location].toLowerCase()} ${gives.count === 1 ? "item" : "items"}` : "Worn");
  }
  return worn;
}
