// THE single source of slot truth. `computeSlots` derives every hunter's item
// slots — base body slots + slots granted by worn storage items — and
// deterministically assigns each Significant/Oversized inventory UNIT to one.
// Assignments are NEVER persisted: the storage panel and the inventory table
// both call this one function, so they can never disagree.

import type { HunterCard, SlotLocation } from "@/types";
import { BASE_SLOTS, STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";

export const SLOT_LOCATION_LABEL: Record<SlotLocation, string> = {
  hand: "Hand",
  back: "Back",
  chest: "Chest",
  hip: "Hip",
  ankle: "Ankle",
};

/** One slot pool the panel renders, e.g. "Significant (back) 1/7 — Rope". */
export interface SlotRow {
  key: string;
  location: SlotLocation;
  kind: "significant" | "oversized";
  capacity: number;
  used: number;
  /** Stowed item labels, qty-collapsed ("Dagger ×2"). */
  items: string[];
  /** e.g. "via Backpack" or "Dagger or Pistol only". */
  note?: string;
}

export interface SlotComputation {
  rows: SlotRow[];
  /** itemId → table label, e.g. "Back", "Chest ×2 · Hand", or "Unstowed". */
  byItem: Record<string, string>;
  /** Item units that found no free slot (no mechanical penalty — a marker). */
  unstowed: { itemId: string; name: string; count: number }[];
}

interface Pool {
  key: string;
  location: SlotLocation;
  kind: "significant" | "oversized";
  capacity: number;
  used: number;
  only?: string[];
  note?: string;
  items: Map<string, { name: string; count: number }>;
}

function stow(pool: Pool, itemId: string, name: string): void {
  pool.used += 1;
  const cur = pool.items.get(itemId);
  if (cur) cur.count += 1;
  else pool.items.set(itemId, { name, count: 1 });
}

/** Build the slot pools + assign every carried Significant/Oversized unit.
 * Order (deterministic): pinned-location items first, then Oversized (hands
 * are their only home), then Significant — restricted pools (ankle holster)
 * before general capacity in back → chest → hip → hand order. */
export function computeSlots(
  card: Pick<HunterCard, "inventory" | "equippedStorageIds">,
): SlotComputation {
  const equipped = (card.equippedStorageIds ?? []).filter((id) => STORAGE_BY_ITEM_ID[id]);
  const defs = equipped.map((id) => STORAGE_BY_ITEM_ID[id]);
  const hasSack = equipped.includes("sack");

  // Base body pools, minus the base slots consumed by worn storage items.
  const consumed = (loc: SlotLocation) =>
    defs.filter((d) => d.requires?.kind === "significant" && d.requires.location === loc).length;
  const base = (loc: "back" | "chest" | "hip") =>
    Math.max(0, BASE_SLOTS[loc] - consumed(loc));

  const handOver: Pool = {
    key: "hand-oversized", location: "hand", kind: "oversized",
    capacity: hasSack ? 0 : BASE_SLOTS.handOversized, used: 0, items: new Map(),
  };
  const handSig: Pool = {
    key: "hand-significant", location: "hand", kind: "significant",
    capacity: hasSack ? 0 : BASE_SLOTS.handSignificant, used: 0, items: new Map(),
    note: hasSack ? undefined : "hands carry 2 Significant or 1 Oversized",
  };
  const pools: Pool[] = [handOver, handSig];
  for (const loc of ["back", "chest", "hip"] as const) {
    pools.push({ key: `${loc}-base`, location: loc, kind: "significant", capacity: base(loc), used: 0, items: new Map() });
  }
  // Pools granted by worn storage items, in equip order.
  for (const def of defs) {
    pools.push({
      key: `${def.itemId}-gives`,
      location: def.gives.location,
      kind: "significant",
      capacity: def.gives.count,
      used: 0,
      only: def.gives.only,
      note: def.gives.only ? "Dagger or Pistol only" : undefined,
      items: new Map(),
    });
  }

  // Hands exclusivity: 2 Significant OR 1 Oversized (the sack IS the
  // oversized use, so with a sack only its 15 Significant slots exist).
  const handFreeFor = (kind: "significant" | "oversized") =>
    kind === "significant" ? handOver.used === 0 : handSig.used === 0;

  const fits = (pool: Pool, itemId: string, kind: "significant" | "oversized") =>
    pool.kind === kind &&
    pool.used < pool.capacity &&
    (!pool.only || pool.only.includes(itemId)) &&
    (pool.location !== "hand" || hasSack || handFreeFor(kind));

  // Inventory units, qty-expanded; insignificant items take no slot.
  const entries = resolveInventory(card).filter((e) => e.item.carry !== "Insignificant");
  type Unit = { itemId: string; name: string; kind: "significant" | "oversized"; pinned?: SlotLocation };
  const units: Unit[] = [];
  for (const { item, qty } of entries) {
    const kind = item.carry === "Oversized" ? "oversized" : "significant";
    for (let i = 0; i < qty; i++) units.push({ itemId: item.id, name: item.name, kind, pinned: item.slotLocation });
  }
  units.sort((a, b) => a.name.localeCompare(b.name));
  const ordered = [
    ...units.filter((u) => u.pinned),
    ...units.filter((u) => !u.pinned && u.kind === "oversized"),
    ...units.filter((u) => !u.pinned && u.kind === "significant"),
  ];

  const placed = new Map<string, Map<string, number>>(); // itemId → poolLabel/unstowed → count
  const record = (itemId: string, label: string) => {
    const m = placed.get(itemId) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + 1);
    placed.set(itemId, m);
  };
  const unstowedMap = new Map<string, { itemId: string; name: string; count: number }>();

  for (const u of ordered) {
    const candidates = u.pinned
      ? pools.filter((p) => p.location === u.pinned)
      : [
          ...pools.filter((p) => p.only?.includes(u.itemId)),
          ...pools.filter((p) => !p.only && p.location !== "hand"),
          ...pools.filter((p) => !p.only && p.location === "hand"),
        ];
    const pool = candidates.find((p) => fits(p, u.itemId, u.kind));
    if (pool) {
      stow(pool, u.itemId, u.name);
      record(u.itemId, SLOT_LOCATION_LABEL[pool.location]);
    } else {
      record(u.itemId, "Unstowed");
      const cur = unstowedMap.get(u.itemId);
      if (cur) cur.count += 1;
      else unstowedMap.set(u.itemId, { itemId: u.itemId, name: u.name, count: 1 });
    }
  }

  // Collapse per-item placements into one table label.
  const byItem: Record<string, string> = {};
  for (const [itemId, m] of placed) {
    byItem[itemId] = [...m.entries()]
      .map(([label, count]) => (count > 1 ? `${label} ×${count}` : label))
      .join(" · ");
  }

  // Merge pools into display rows per location+kind (base + granted slots at
  // the same location read as one pool — capacity already nets out the
  // consumed base slot).
  const rowOrder: { location: SlotLocation; kind: "significant" | "oversized" }[] = [
    { location: "hand", kind: "oversized" },
    { location: "hand", kind: "significant" },
    { location: "back", kind: "significant" },
    { location: "chest", kind: "significant" },
    { location: "hip", kind: "significant" },
    { location: "ankle", kind: "significant" },
  ];
  const rows: SlotRow[] = [];
  for (const { location, kind } of rowOrder) {
    const parts = pools.filter((p) => p.location === location && p.kind === kind);
    const capacity = parts.reduce((s, p) => s + p.capacity, 0);
    const used = parts.reduce((s, p) => s + p.used, 0);
    if (capacity === 0 && used === 0) continue;
    const items = new Map<string, { name: string; count: number }>();
    for (const p of parts)
      for (const [id, v] of p.items) {
        const cur = items.get(id);
        if (cur) cur.count += v.count;
        else items.set(id, { ...v });
      }
    rows.push({
      key: `${location}-${kind}`,
      location,
      kind,
      capacity,
      used,
      items: [...items.values()].map((v) => (v.count > 1 ? `${v.name} ×${v.count}` : v.name)),
      note: parts.map((p) => p.note).find(Boolean),
    });
  }

  return { rows, byItem, unstowed: [...unstowedMap.values()] };
}
