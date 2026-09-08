import type { Item, ShopLine, ShopState } from "@/types";
import { ITEMS, ITEM_BY_ID } from "@/data/items";

/** A shop the table can actually read on the big screen stays short. */
export const MAX_SHOP_LINES = 40;
const MAX_NAME = 60;
const MAX_NOTE = 80;
const MAX_PRICE = 100_000;

export function emptyShop(): ShopState {
  return { open: false, lines: [] };
}

/** Accept legacy/untrusted game documents while bounding Firestore values. */
export function normalizeShopState(value: unknown): ShopState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ShopState>;
  const lines = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    open: raw.open === true,
    ...(typeof raw.name === "string" && raw.name.trim()
      ? { name: raw.name.trim().slice(0, MAX_NAME) }
      : {}),
    lines: lines.flatMap((line) => {
      const normalized = normalizeLine(line);
      return normalized ? [normalized] : [];
    }).slice(0, MAX_SHOP_LINES),
  };
}

function normalizeLine(value: unknown): ShopLine | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<ShopLine>;
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, MAX_NAME) : "";
  if (!raw.id || typeof raw.id !== "string" || !name) return null;
  return {
    id: raw.id,
    ...(typeof raw.itemId === "string" && raw.itemId ? { itemId: raw.itemId } : {}),
    name,
    priceGp: clampPrice(raw.priceGp),
    ...(typeof raw.note === "string" && raw.note.trim()
      ? { note: raw.note.trim().slice(0, MAX_NOTE) }
      : {}),
  };
}

function clampPrice(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(MAX_PRICE, Math.round(value * 100) / 100);
}

/** Sequential, collision-free line ids — deterministic so the draft state and
 * the stored document never disagree about which line is which. */
export function nextLineId(lines: ShopLine[]): string {
  const highest = lines.reduce((max, line) => {
    const n = /^line-(\d+)$/.exec(line.id);
    return n ? Math.max(max, Number(n[1])) : max;
  }, 0);
  return `line-${highest + 1}`;
}

/** The GM's price for a catalog item defaults to the catalogue's own price;
 * items the price list prints as "Varies" (Book, Map) start at 0 so the GM
 * has to type a number before the shop opens. */
export function catalogPrice(item: Item): number {
  return typeof item.priceGp === "number" ? item.priceGp : 0;
}

export function stockCatalogItem(lines: ShopLine[], item: Item): ShopLine[] {
  if (lines.length >= MAX_SHOP_LINES) return lines;
  return [...lines, { id: nextLineId(lines), itemId: item.id, name: item.name, priceGp: catalogPrice(item) }];
}

export function stockCustomItem(lines: ShopLine[], name: string, priceGp: number): ShopLine[] {
  const clean = name.trim().slice(0, MAX_NAME);
  if (!clean || lines.length >= MAX_SHOP_LINES) return lines;
  return [...lines, { id: nextLineId(lines), name: clean, priceGp: clampPrice(priceGp) }];
}

export function removeLine(lines: ShopLine[], id: string): ShopLine[] {
  return lines.filter((line) => line.id !== id);
}

export function patchLine(
  lines: ShopLine[],
  id: string,
  patch: Partial<Pick<ShopLine, "priceGp" | "note" | "name">>,
): ShopLine[] {
  return lines.map((line) => {
    if (line.id !== id) return line;
    const name = patch.name !== undefined
      ? patch.name.trim().slice(0, MAX_NAME) || line.name
      : line.name;
    const note = (patch.note !== undefined ? patch.note : line.note ?? "").trim().slice(0, MAX_NOTE);
    const price = patch.priceGp !== undefined ? clampPrice(patch.priceGp) : line.priceGp;
    return {
      id: line.id,
      ...(line.itemId ? { itemId: line.itemId } : {}),
      name,
      priceGp: price,
      ...(note ? { note } : {}),
    };
  });
}

/** "12", "12.5" and "" all have to behave; a blank price reads as 0 GP. */
export function parsePriceInput(raw: string): number {
  const value = Number.parseFloat(raw.replace(",", "."));
  return clampPrice(Number.isFinite(value) ? value : 0);
}

/** Catalog search for the stock picker: name/category match, already-stocked
 * items filtered out, capped so the phone list stays scrollable. */
export function searchCatalog(query: string, stockedItemIds: Set<string>, limit = 40): Item[] {
  const needle = query.trim().toLocaleLowerCase();
  const pool = ITEMS.filter((item) => !stockedItemIds.has(item.id));
  if (!needle) return pool.slice(0, limit);
  return pool
    .filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase().includes(needle))
    .slice(0, limit);
}

/** Catalog facts a shop line can show on the board (weight/carry). */
export function lineItem(line: ShopLine): Item | undefined {
  return line.itemId ? ITEM_BY_ID[line.itemId] : undefined;
}

export function shopSummary(shop: ShopState | undefined): string {
  const count = shop?.lines.length ?? 0;
  return `${count} item${count === 1 ? "" : "s"} stocked`;
}
