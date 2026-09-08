import assert from "node:assert/strict";
import { ITEMS, ITEM_BY_ID, itemPriceLabel } from "../src/data/items";
import { ARMOR_BY_ID } from "../src/data/armor";

// Prices come from the game maker's Item Cost list (docs/rules/item-cost.txt),
// which the Core Rulebook defers to ("The app is the authoritative source for
// prices"). Weights are NOT taken from that list — the Core Rulebook wins there.

// --- Known prices, one per table of the list ---
const expected: Record<string, number | "varies"> = {
  acid: 25,              // Hunter Gear
  "lantern-bullseye": 16,
  book: "varies",
  map: "varies",
  "smiths-tools": 50,    // Tools
  "thieves-tools": 6,
  backpack: 20,          // Storage
  "tool-belt": 10,       // list row "TOOLBELT"
  dagger: 5,             // Weapons
  greatsword: 250,
  "hunter-rifle": 300,
  pistol: 200,
  whip: 75,
  bullets: 0.5,          // list row "Bulllets (10)" — 5 GP per ten, per bullet
  tricorn: 1,            // Armor
  "hunter-leather-coat": 100,
  "reinforced-hunter-leather-coat": 200,
  "full-leather-cuirass": 250,
  "leather-pauldron-left": 50,
  studs: 100,
};

for (const [id, price] of Object.entries(expected)) {
  assert.equal(ITEM_BY_ID[id]?.priceGp, price, `wrong priceGp for ${id}`);
}

// Armor prices live on the ArmorPiece too, and are folded into ITEMS unchanged.
assert.equal(ARMOR_BY_ID["studs"].priceGp, 100);
assert.equal(ARMOR_BY_ID["leather-boots"].priceGp, 1);
for (const [id, armor] of Object.entries(ARMOR_BY_ID)) {
  assert.equal(ITEM_BY_ID[id]?.priceGp, armor.priceGp, `armor price not folded into ITEMS: ${id}`);
}

// --- Every catalog entry the list covers has a price ---
// The only unpriced entries are the ones with no row in the Item Cost list:
// the unique items plus Key, which the list does not sell.
const UNPRICED = new Set([
  "silver-bullets",
  "book-of-eldritch-knowledge", // Book of the Deepcaller (unique)
  "blood-vial",
  "robe",                       // Robe of the Deepcallers (unique)
  "key",
]);
const missing = ITEMS.filter((i) => i.priceGp === undefined).map((i) => i.id);
assert.deepEqual(new Set(missing), UNPRICED, `unexpected unpriced items: ${missing.join(", ")}`);

// Weights the list disagrees with must not have been "corrected" from it.
assert.equal(ITEM_BY_ID["thieves-tools"].weightLb, 1); // list prints "1 b." [sic]

assert.equal(itemPriceLabel(5), "5 GP");
assert.equal(itemPriceLabel("varies"), "Varies");
assert.equal(itemPriceLabel(undefined), "");

console.log(`item prices ok — ${ITEMS.filter((i) => i.priceGp !== undefined).length} priced entries`);
