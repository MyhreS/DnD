// Pure patch builders for wearing / taking off armor and storage items.
// Each returns ONE Partial<HunterCard> (or an error string), written in a
// single merge patch so inventory + worn fields always move atomically.

import type { HunterCard, InventoryEntry } from "@/types";
import { ARMOR_BY_ID } from "@/data/armor";
import { ITEM_BY_ID } from "@/data/items";
import { BASE_SLOTS, STORAGE_BY_ITEM_ID } from "@/data/storage";
import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";

export type EquipResult = { patch: Partial<HunterCard> } | { error: string };

/** inventory with `delta` units of `itemId` added (or removed; drops ≤0 rows). */
function bump(inv: InventoryEntry[] | undefined, itemId: string, delta: number): InventoryEntry[] {
  const cur = (inv ?? []).find((e) => e.itemId === itemId)?.qty ?? 0;
  const rest = (inv ?? []).filter((e) => e.itemId !== itemId);
  const qty = cur + delta;
  return qty > 0 ? [...rest, { itemId, qty }] : rest;
}

function inInventory(card: HunterCard, itemId: string): boolean {
  return ((card.inventory ?? []).find((e) => e.itemId === itemId)?.qty ?? 0) > 0;
}

/** Wear an armor piece from the inventory (Main / Add-on / Extra by its
 * category). Swaps out the previous Main or same-subcategory Extra, returning
 * the removed piece to the inventory in the same patch. */
export function wearArmor(card: HunterCard, armorId: string): EquipResult {
  const piece = ARMOR_BY_ID[armorId];
  if (!piece) return { error: "Unknown armor piece." };
  if (!inInventory(card, armorId)) return { error: `No ${piece.name} in the inventory.` };
  let inv = bump(card.inventory, armorId, -1);

  if (piece.category === "Main Armor") {
    if (card.mainArmorId === armorId) return { error: "Already worn." };
    if (card.mainArmorId) inv = bump(inv, card.mainArmorId, 1);
    // A different Main can shrink the Add-on allowance (Balanced Fit → not):
    // excess Add-ons come off into the inventory, dropping their studs.
    const allowance = maxAddonPieces(armorId);
    const keptAddons = (card.addonArmorIds ?? []).slice(0, allowance);
    for (const id of (card.addonArmorIds ?? []).slice(allowance)) inv = bump(inv, id, 1);
    const studded = studdedAddonIdsOf(card).filter((id) => keptAddons.includes(id));
    return {
      patch: {
        mainArmorId: armorId,
        addonArmorIds: keptAddons,
        studdedAddonIds: studded,
        studdedAddons: studded.length,
        inventory: inv,
      },
    };
  }

  if (piece.category === "Add-on Armor") {
    const worn = card.addonArmorIds ?? [];
    if (worn.includes(armorId)) return { error: "Already wearing one." };
    const max = maxAddonPieces(card.mainArmorId);
    if (worn.length >= max) return { error: `Add-on limit reached (${max} pieces).` };
    return { patch: { addonArmorIds: [...worn, armorId], inventory: inv } };
  }

  if (piece.category === "Extra") {
    const worn = card.extraArmorIds ?? [];
    if (worn.includes(armorId)) return { error: "Already worn." };
    // One Extra per subcategory — the previous hat/scarf/… comes off.
    const replaced = worn.filter(
      (id) => piece.subcategory && ARMOR_BY_ID[id]?.subcategory === piece.subcategory,
    );
    for (const id of replaced) inv = bump(inv, id, 1);
    const kept = worn.filter((id) => !replaced.includes(id));
    return { patch: { extraArmorIds: [...kept, armorId], inventory: inv } };
  }

  return { error: `${piece.name} is an upgrade, not a wearable piece.` };
}

/** Equip a storage item: it leaves the inventory and claims its base slot.
 * The base slot must be free of OTHER worn storage (backpack XOR carrying
 * harness on the back; one bandolier, tool belt, sack, holster each). */
export function equipStorage(card: HunterCard, itemId: string): EquipResult {
  const def = STORAGE_BY_ITEM_ID[itemId];
  if (!def) return { error: "Not a storage item." };
  if (!inInventory(card, itemId)) return { error: "Not in the inventory." };
  const equipped = card.equippedStorageIds ?? [];
  if (equipped.includes(itemId)) return { error: "Already wearing one." };
  if (def.requires) {
    const loc = def.requires.location;
    const base =
      def.requires.kind === "oversized"
        ? BASE_SLOTS.handOversized
        : loc === "back" || loc === "chest" || loc === "hip"
          ? BASE_SLOTS[loc]
          : 0;
    const taken = equipped
      .map((id) => STORAGE_BY_ITEM_ID[id])
      .filter(
        (d) =>
          d?.requires &&
          d.requires.location === def.requires!.location &&
          d.requires.kind === def.requires!.kind,
      ).length;
    if (taken >= base) {
      const blocker = equipped
        .map((id) => STORAGE_BY_ITEM_ID[id])
        .find((d) => d?.requires?.location === def.requires!.location);
      const blockerName = blocker ? ITEM_BY_ID[blocker.itemId]?.name : null;
      return {
        error: `The ${def.requires.location} slot is taken${blockerName ? ` by the ${blockerName}` : ""} — take it off first.`,
      };
    }
  }
  return {
    patch: {
      equippedStorageIds: [...equipped, itemId],
      inventory: bump(card.inventory, itemId, -1),
    },
  };
}

