// THE single source of slot truth. `computeSlots` derives every hunter's item
// slots — base body slots + slots granted by worn storage items — and
// applies each player's saved choice for every Significant/Oversized inventory
// UNIT. An item remains Unassigned until the player chooses a valid slot.

import type { CarrySignificance, CustomItem, HunterCard, SlotAssignment, SlotLocation } from "@/types";
import { BASE_SLOTS, STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";

export const SLOT_LOCATION_LABEL: Record<SlotLocation, string> = {
  hand: "Hand",
  back: "Back",
  chest: "Chest",
  hip: "Hip",
  ankle: "Ankle",
};

export interface SlotAssignmentOption {
  value: SlotAssignment;
  label: string;
}

/** Choices shown for an item. Worn storage gets its own numbered compartments
 * so a player can deliberately put an item in, for example, Tool belt slot 3
 * rather than the ordinary hip slot the belt itself occupies. */
export function slotAssignmentOptions(
  carry: CarrySignificance,
  equippedStorageIds: string[] | undefined,
  itemId: string,
  pinned?: SlotLocation,
  customItems?: CustomItem[],
): SlotAssignmentOption[] {
  const body: SlotLocation[] = pinned ? [pinned] : carry === "Oversized" ? ["hand"] : ["hand", "back", "chest", "hip", "ankle"];
  if (carry === "Oversized") return body.map((location) => ({ value: location, label: SLOT_LOCATION_LABEL[location] }));

  const storage = (equippedStorageIds ?? []).flatMap((storageId) => {
    const definition = STORAGE_BY_ITEM_ID[storageId];
    const restrictedId = customItems?.find((item) => item.id === itemId)?.catalogBaseId ?? itemId;
    if (!definition || (definition.gives.only && !definition.gives.only.includes(restrictedId))) return [];
    return Array.from({ length: definition.gives.count }, (_, index) => ({
      value: `storage:${storageId}:${index + 1}` as SlotAssignment,
      label: `${itemForStorage(storageId)} slot ${index + 1}`,
    }));
  });
  return [...body.map((location) => ({ value: location, label: SLOT_LOCATION_LABEL[location] })), ...storage];
}

/**
 * The choices that are still usable for one inventory unit. Its saved choice
 * remains visible, so an item can always be moved away from a now-conflicting
 * slot, but slots used by every other item disappear from the picker.
 */
export function availableSlotAssignmentOptions(
  card: Pick<HunterCard, "inventory" | "equippedStorageIds" | "customItems" | "slotAssignments">,
  itemId: string,
  index: number,
  carry: CarrySignificance,
  pinned?: SlotLocation,
): SlotAssignmentOption[] {
  const current = card.slotAssignments?.[itemId]?.[index] ?? null;
  const assignments = [...(card.slotAssignments?.[itemId] ?? [])];
  assignments[index] = null;
  const slotAssignments = { ...(card.slotAssignments ?? {}), [itemId]: assignments };
  const withoutCurrent = { ...card, slotAssignments };

  return slotAssignmentOptions(carry, card.equippedStorageIds, itemId, pinned, card.customItems).filter((option) => {
    if (option.value === current) return true;
    const withCandidate = [...assignments];
    withCandidate[index] = option.value;
    const result = computeSlots({
      ...withoutCurrent,
      slotAssignments: { ...slotAssignments, [itemId]: withCandidate },
    });
    const displaced = Object.entries(card.slotAssignments ?? {}).some(([otherItemId, otherAssignments]) =>
      otherAssignments.some((assignment, otherIndex) =>
        assignment === option.value
        && !(otherItemId === itemId && otherIndex === index)
        && result.placedAssignments[otherItemId]?.[otherIndex] !== assignment,
      ),
    );
    return result.placedAssignments[itemId]?.[index] === option.value && !displaced;
  });
}

function itemForStorage(itemId: string): string {
  return itemId.split("-").map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");
}

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
  /** The valid saved location for each inventory unit, if it was placed. */
  placedAssignments: Record<string, Array<SlotAssignment | null>>;
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
  storageItemId?: string;
  occupiedSlots?: Set<number>;
  items: Map<string, { name: string; count: number }>;
}

function stow(pool: Pool, itemId: string, name: string, storageSlot?: number): void {
  pool.used += 1;
  if (storageSlot) pool.occupiedSlots?.add(storageSlot);
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
      storageItemId: def.itemId,
      occupiedSlots: new Set(),
      items: new Map(),
    });
  }

  // Hands exclusivity: 2 Significant OR 1 Oversized (the sack IS the
  // oversized use, so with a sack only its 15 Significant slots exist).
  const handFreeFor = (kind: "significant" | "oversized") =>
    kind === "significant" ? handOver.used === 0 : handSig.used === 0;

  const fits = (pool: Pool, itemId: string, kind: "significant" | "oversized", storageSlot?: number) => {
    const restrictedId = card.customItems?.find((item) => item.id === itemId)?.catalogBaseId ?? itemId;
    return (
      pool.kind === kind &&
      pool.used < pool.capacity &&
      (!pool.only || pool.only.includes(restrictedId)) &&
      (!storageSlot || (storageSlot <= pool.capacity && !pool.occupiedSlots?.has(storageSlot))) &&
      (pool.location !== "hand" || hasSack || handFreeFor(kind))
    );
  };

  // Inventory units, qty-expanded (clamped per entry); insignificant items
  // take no slot. Existing hunters have no saved choices, so they are shown as
  // Unassigned rather than being silently placed somewhere.
  const entries = resolveInventory(card).filter((e) => e.item.carry !== "Insignificant" && e.item.category !== "Armor");
  type Unit = { itemId: string; name: string; kind: "significant" | "oversized"; index: number; assigned?: SlotAssignment };
  const units: Unit[] = [];
  const clampedIds = new Set<string>();
  for (const { item, qty } of entries) {
    const kind = item.carry === "Oversized" ? "oversized" : "significant";
    const capped = Math.min(qty, MAX_UNITS_PER_ENTRY);
    if (capped < qty) clampedIds.add(item.id);
    const assignments = card.slotAssignments?.[item.id] ?? [];
    for (let i = 0; i < capped; i++) units.push({ itemId: item.id, name: item.name, kind, index: i, assigned: assignments[i] ?? undefined });
  }
  const ordered = units.sort((a, b) => a.name.localeCompare(b.name));

  const placed = new Map<string, Map<string, number>>(); // itemId → poolLabel/unstowed → count
  const record = (itemId: string, label: string) => {
    const m = placed.get(itemId) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + 1);
    placed.set(itemId, m);
  };
  const unstowedMap = new Map<string, { itemId: string; name: string; count: number; clamped?: boolean }>();
  const placedAssignments: Record<string, Array<SlotAssignment | null>> = {};

  for (const u of ordered) {
    const storageMatch = u.assigned?.match(/^storage:([^:]+):(\d+)$/);
    const storageId = storageMatch?.[1];
    const storageSlot = storageMatch ? Number(storageMatch[2]) : undefined;
    const candidates = storageId
      ? pools.filter((p) => p.storageItemId === storageId)
      : u.assigned ? pools.filter((p) => p.location === u.assigned && !p.storageItemId) : [];
    const pool = candidates.find((p) => fits(p, u.itemId, u.kind, storageSlot));
    if (pool) {
      stow(pool, u.itemId, u.name, storageSlot);
      record(u.itemId, storageId ? `${itemForStorage(storageId)} slot ${storageSlot}` : SLOT_LOCATION_LABEL[pool.location]);
      (placedAssignments[u.itemId] ??= [])[u.index] = u.assigned ?? null;
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

  return { rows, byItem, unstowed: [...unstowedMap.values()], placedAssignments };
}
