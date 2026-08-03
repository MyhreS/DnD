import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GAME_CARD_CATEGORIES, GAME_CARD_ENTRIES } from "../src/data/gameCard";
import { searchEntries } from "../src/lib/search";

assert(GAME_CARD_ENTRIES.length >= 80, "expected a complete quick-reference index");
assert.equal(new Set(GAME_CARD_ENTRIES.map((entry) => entry.id)).size, GAME_CARD_ENTRIES.length, "entry ids must be unique");

for (const category of GAME_CARD_CATEGORIES) {
  assert(GAME_CARD_ENTRIES.some((entry) => entry.category === category), `missing category: ${category}`);
}
for (const entry of GAME_CARD_ENTRIES) {
  assert(entry.sourcePage >= 1 && entry.sourcePage <= 9, `${entry.id} has an invalid PDF page`);
  for (const table of entry.tables ?? []) {
    assert(table.columns.length > 0, `${entry.id} has a table without columns`);
    assert(table.rows.every((row) => row.length === table.columns.length), `${entry.id} has a malformed table row`);
  }
}

assert.equal(searchEntries(GAME_CARD_ENTRIES, "hunter rifle")[0]?.id, "weapons");
assert.equal(searchEntries(GAME_CARD_ENTRIES, "horse cart")[0]?.id, "chase-complications");
assert(searchEntries(GAME_CARD_ENTRIES, "dreadblood eyes").some((entry) => entry.id === "dreadblood-eyes"));
assert(searchEntries(GAME_CARD_ENTRIES, "well hidden secret door").some((entry) => entry.id === "doors-and-locks"));

// The project's established player-facing boundary keeps the hidden Insane
// resolution out of the app even though it appears in the printable source.
const searchableText = GAME_CARD_ENTRIES.flatMap((entry) => entry.body).join(" ");
assert(!searchableText.includes("Bound Shadow"));
assert(!searchableText.includes("Madness Die"));

// The table transcription must match the canonical structured source exactly.
const master = JSON.parse(readFileSync("resources/master.json", "utf8"));
const canonicalRows = master.transformation.table.rows as { d20: number; byLevel: string[] }[];
const resultNames = Object.fromEntries(
  Object.entries(master.transformation.results).map(([key, value]) => [key, (value as { name: string }).name]),
);
const expected = canonicalRows.map((row) => [String(row.d20), ...row.byLevel.map((key) => resultNames[key])]);
const actual = GAME_CARD_ENTRIES.find((entry) => entry.id === "transformation-table")?.tables?.[0].rows;
assert.deepEqual(actual, expected, "Transformation table must match the canonical source");

console.log(`Player's Game Card data tests passed (${GAME_CARD_ENTRIES.length} searchable entries)`);
