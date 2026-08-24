import type { SlotLocation } from "@/types";

// Storage Items — established Hunter inventory catalog:
// each takes one equipment slot but gains you more slots in return. The
// master's Bandolier location "Front" renders as the sheet's "chest".

export interface StorageDef {
  /** Catalog item id (src/data/items.ts). */
  itemId: string;
  /** The base slot the item consumes when worn, or null (Ankle Holster). */
  requires: { kind: "significant" | "oversized"; location: SlotLocation } | null;
  /** The Significant slots it grants while worn. */
  gives: { count: number; location: SlotLocation; only?: string[] };
}

export const STORAGE_DEFS: StorageDef[] = [
  {
    itemId: "sack",
    requires: { kind: "oversized", location: "hand" },
    gives: { count: 15, location: "hand" },
  },
  {
    itemId: "backpack",
    requires: { kind: "significant", location: "back" },
    gives: { count: 7, location: "back" },
  },
  {
    itemId: "bandolier",
    requires: { kind: "significant", location: "chest" },
    gives: { count: 4, location: "chest" },
  },
  {
    itemId: "tool-belt",
    requires: { kind: "significant", location: "hip" },
    gives: { count: 4, location: "hip" },
  },
  {
    itemId: "carrying-harness",
    requires: { kind: "significant", location: "back" },
    gives: { count: 2, location: "back" },
  },
  {
    itemId: "ankle-holster",
    requires: null,
    gives: { count: 1, location: "ankle", only: ["dagger", "pistol"] },
  },
];

export const STORAGE_BY_ITEM_ID: Record<string, StorageDef> = Object.fromEntries(
  STORAGE_DEFS.map((d) => [d.itemId, d]),
);

/** Base body slots ("Check Your Item Slots"): unlimited Insignificant, one
 * Significant each at back/chest/hip, and hands that carry EITHER two
 * Significant items OR one Oversized item. The ankle starts with none. */
export const BASE_SLOTS = {
  back: 1,
  chest: 1,
  hip: 1,
  ankle: 0,
  handSignificant: 2,
  handOversized: 1,
} as const;
