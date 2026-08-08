// THE single source of slot truth. `computeSlots` derives every hunter's item
// slots — base body slots + slots granted by worn storage items — and
// applies each player's saved choice for every Significant/Oversized inventory
// UNIT. An item remains Unassigned until the player chooses a valid slot.

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
  /** itemId → table label, e.g. "Back", "Chest ×2 · Hand", or "Unassigned". */
  byItem: Record<string, string>;
  /** Item units that found no free slot (no mechanical penalty — a marker).
   * `clamped` marks a qty capped at MAX_UNITS_PER_ENTRY (render "×99+"). */
  unstowed: { itemId: string; name: string; count: number; clamped?: boolean }[];
}

/** Per-entry expansion cap: a corrupt qty (e.g. 10^7) must never freeze every
 * client that renders the card (the party gallery computes slots for everyone).
 * Every pool in the game totals well under 99 slots, so the surplus above the
 * cap could only ever have been Unstowed — the clamp is display-lossless. */
const MAX_UNITS_PER_ENTRY = 99;

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

/** Build the slot pools and apply every explicit carrying choice. */
export function computeSlots(
  card: Pick<HunterCard, "inventory" | "equippedStorageIds" | "customItems" | "slotAssignments">,
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

  // Inventory units, qty-expanded (clamped per entry); insignificant items
  // take no slot. Existing hunters have no saved choices, so they are shown as
  // Unassigned rather than being silently placed somewhere.
  const entries = resolveInventory(card).filter((e) => e.item.carry !== "Insignificant");
  type Unit = { itemId: string; name: string; kind: "significant" | "oversized"; assigned?: SlotLocation };
  const units: Unit[] = [];
  const clampedIds = new Set<string>();
  for (const { item, qty } of entries) {
    const kind = item.carry === "Oversized" ? "oversized" : "significant";
    const capped = Math.min(qty, MAX_UNITS_PER_ENTRY);
    if (capped < qty) clampedIds.add(item.id);
    const assignments = card.slotAssignments?.[item.id] ?? [];
    for (let i = 0; i < capped; i++) units.push({ itemId: item.id, name: item.name, kind, assigned: assignments[i] ?? undefined });
  }
  const ordered = units.sort((a, b) => a.name.localeCompare(b.name));

  const placed = new Map<string, Map<string, number>>(); // itemId → poolLabel/unstowed → count
  const record = (itemId: string, label: string) => {
    const m = placed.get(itemId) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + 1);
    placed.set(itemId, m);
  };
  const unstowedMap = new Map<string, { itemId: string; name: string; count: number; clamped?: boolean }>();

  for (const u of ordered) {
    const candidates = u.assigned ? pools.filter((p) => p.location === u.assigned) : [];
    const pool = candidates.find((p) => fits(p, u.itemId, u.kind));
    if (pool) {
      stow(pool, u.itemId, u.name);
      record(u.itemId, SLOT_LOCATION_LABEL[pool.location]);
    } else {
      record(u.itemId, "Unassigned");
      const cur = unstowedMap.get(u.itemId);
      if (cur) cur.count += 1;
      else unstowedMap.set(u.itemId, { itemId: u.itemId, name: u.name, count: 1 });
    }
  }

  // A clamped qty means units beyond the cap exist but weren't expanded —
  // they could only have been Unassigned (see MAX_UNITS_PER_ENTRY), so flag the
  // Unstowed bucket and render its count open-ended ("×94+").
  for (const id of clampedIds) {
    const u = unstowedMap.get(id);
    if (u) u.clamped = true;
  }

  // Collapse per-item placements into one table label.
  const byItem: Record<string, string> = {};
  for (const [itemId, m] of placed) {
    byItem[itemId] = [...m.entries()]
      .map(([label, count]) => {
        const plus = clampedIds.has(itemId) && label === "Unassigned";
        return count > 1 || plus ? `${label} ×${count}${plus ? "+" : ""}` : label;
      })
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
    let capacity = parts.reduce((s, p) => s + p.capacity, 0);
    const used = parts.reduce((s, p) => s + p.used, 0);
    if (capacity === 0 && used === 0) continue;
    // Hand exclusivity (2 Significant XOR 1 Oversized) is enforced at
    // placement; mirror it in the DISPLAY: once one hand pool is in use the
    // other's capacity reads 0 — a greatsword in hand must not render
    // "significant (hand) 0/2" as if two free slots remained.
    if (location === "hand" && used === 0) {
      const other = kind === "significant" ? handOver : handSig;
      if (other.used > 0) capacity = 0;
    }
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
