import assert from "node:assert/strict";
import {
  MAX_SHOP_LINES,
  catalogPrice,
  emptyShop,
  lineItem,
  nextLineId,
  normalizeShopState,
  parsePriceInput,
  patchLine,
  removeLine,
  searchCatalog,
  shopSummary,
  stockCatalogItem,
  stockCustomItem,
} from "../src/features/play/lib/shop";
import { ITEM_BY_ID } from "../src/data/items";
import type { ShopLine } from "../src/types";

// The session shop lives on the game document (like game.combat). These are the
// pure rules behind the DM's stock list and the big-screen board.

// --- An empty shop is closed and stocks nothing ---
assert.deepEqual(emptyShop(), { open: false, lines: [] });
assert.equal(shopSummary(undefined), "0 items stocked");
assert.equal(shopSummary({ open: true, lines: [{ id: "line-1", name: "Rope", priceGp: 2 }] }), "1 item stocked");

// --- Stocking a catalog item prefills the catalogue's own price ---
const dagger = ITEM_BY_ID["dagger"];
let lines = stockCatalogItem([], dagger);
assert.equal(lines.length, 1);
assert.equal(lines[0].itemId, "dagger");
assert.equal(lines[0].name, "Dagger");
assert.equal(lines[0].priceGp, 5, "catalog price should prefill");
assert.equal(lines[0].id, "line-1");

// "Varies" items (Book, Map) start at 0 so the GM must type a price.
assert.equal(ITEM_BY_ID["book"].priceGp, "varies");
assert.equal(catalogPrice(ITEM_BY_ID["book"]), 0);

// --- Ids stay unique and stable as lines come and go ---
lines = stockCatalogItem(lines, ITEM_BY_ID["rope"] ?? ITEM_BY_ID["backpack"]);
assert.equal(lines[1].id, "line-2");
lines = removeLine(lines, "line-1");
assert.equal(nextLineId(lines), "line-3", "ids never reuse a removed line's id");

// --- The GM overrides prices; a custom line has no itemId ---
lines = stockCustomItem(lines, "  Whispering Locket  ", 420);
const custom = lines[lines.length - 1];
assert.equal(custom.name, "Whispering Locket", "custom names are trimmed");
assert.equal(custom.itemId, undefined);
assert.equal(lineItem(custom), undefined);
assert.equal(lineItem(lines[0])?.id, lines[0].itemId);

lines = patchLine(lines, custom.id, { priceGp: 99.5, note: " last one " });
const patched = lines.find((line) => line.id === custom.id)!;
assert.equal(patched.priceGp, 99.5);
assert.equal(patched.note, "last one");
// Clearing the note removes the key entirely — Firestore rejects undefined.
lines = patchLine(lines, custom.id, { note: "" });
assert.ok(!("note" in lines.find((line) => line.id === custom.id)!), "a blank note is dropped");

// Blank/junk custom entries are refused; blank prices read as 0.
assert.equal(stockCustomItem(lines, "   ", 5).length, lines.length);
assert.equal(parsePriceInput(""), 0);
assert.equal(parsePriceInput("12"), 12);
assert.equal(parsePriceInput("12,5"), 12.5, "a comma decimal is accepted");
assert.equal(parsePriceInput("-4"), 0, "negative prices clamp to 0");
assert.equal(parsePriceInput("7.129"), 7.13);

// --- The board stays readable: the stock list is capped ---
let many: ShopLine[] = [];
for (let i = 0; i < MAX_SHOP_LINES + 5; i += 1) many = stockCustomItem(many, `Item ${i}`, 1);
assert.equal(many.length, MAX_SHOP_LINES);
assert.equal(stockCatalogItem(many, dagger).length, MAX_SHOP_LINES);

// --- Catalog search: matches name or category, hides what is already stocked ---
const hits = searchCatalog("dagger", new Set());
assert.ok(hits.some((item) => item.id === "dagger"));
assert.ok(!searchCatalog("dagger", new Set(["dagger"])).some((item) => item.id === "dagger"));
assert.ok(searchCatalog("", new Set()).length > 0, "an empty query still lists the catalogue");
assert.ok(searchCatalog("armor", new Set()).every((item) => `${item.name} ${item.category}`.toLowerCase().includes("armor")));

// --- Untrusted / legacy documents are bounded ---
assert.equal(normalizeShopState(undefined), undefined);
assert.equal(normalizeShopState("nonsense"), undefined);
const normalized = normalizeShopState({
  open: "yes",
  name: "  The Grey Market  ",
  lines: [
    { id: "line-1", itemId: "dagger", name: "Dagger", priceGp: -3 },
    { id: "line-2", name: "", priceGp: 5 },        // nameless — dropped
    { name: "No id", priceGp: 5 },                  // id-less — dropped
    { id: "line-3", name: "Oddity", priceGp: "cheap", note: "   " },
    "junk",
  ],
})!;
assert.equal(normalized.open, false, "only a literal true opens a shop");
assert.equal(normalized.name, "The Grey Market");
assert.equal(normalized.lines.length, 2);
assert.equal(normalized.lines[0].priceGp, 0, "negative prices clamp");
assert.equal(normalized.lines[1].priceGp, 0, "non-numeric prices clamp");
assert.ok(!("note" in normalized.lines[1]), "a whitespace note is dropped");
assert.equal(normalizeShopState({ open: true, lines: [] })!.name, undefined);
assert.equal(normalizeShopState({ lines: Array.from({ length: 80 }, (_, i) => ({ id: `line-${i + 1}`, name: "x", priceGp: 1 })) })!.lines.length, MAX_SHOP_LINES);

console.log(`shop ok — ${MAX_SHOP_LINES}-line cap, catalog prefill, price overrides, custom wares`);
