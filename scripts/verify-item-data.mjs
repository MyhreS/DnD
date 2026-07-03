// Verifies src/data/items.ts (+ armor.ts weights) against resources/master.json,
// the DM's source of truth: for every master item with a matching catalog entry
// it asserts weight (lb), carrying category and slot pin ("(back)") agree.
// Master items the app doesn't carry are fine (content decision); app-only
// items (Bedroll, Rations, …) are fine too — only overlaps must match.
//
//   node scripts/verify-item-data.mjs        → exits 1 on any mismatch

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const master = JSON.parse(readFileSync(join(root, "resources", "master.json"), "utf8"));
const equipment = master.handbook.chapters[4]; // "Equipment"
const armorStep = master.handbook.chapters[0].sections[6]; // "Step 4 — Armor" tables

// ---------- parse the app catalogs (simple object-literal data files) ----------

function parseEntries(raw) {
  const source = raw.replace(/\r\n/g, "\n");
  const entries = new Map();
  for (const m of source.matchAll(/\{\n((?: {4,}.*\n)+?) {2}\},/g)) {
    const block = m[1];
    const field = (name) => block.match(new RegExp(`${name}: "([^"]*)"`))?.[1];
    const id = field("id");
    const weight = block.match(/weightLb: ([\d.]+)/)?.[1];
    if (!id || weight === undefined) continue;
    entries.set(id, {
      id,
      carry: field("carry"),
      weightLb: Number(weight),
      slotLocation: field("slotLocation"),
    });
  }
  return entries;
}

const items = parseEntries(readFileSync(join(root, "src", "data", "items.ts"), "utf8"));
const armor = parseEntries(readFileSync(join(root, "src", "data", "armor.ts"), "utf8"));

// ---------- master → app id mapping ----------

const ALIASES = {
  toolbelt: "tool-belt",
  "lantern-bullseye": "lantern", // app carries one generic Lantern (same stats)
  "lantern-hooded": "lantern",
};
const toId = (name) => {
  const slug = name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return ALIASES[slug] ?? slug;
};

// "14 lb." → 14, "1/4 lb." → 0.25, "5 lb. full" → 5, "--" → 0, "Varies" → null
function parseWeight(s) {
  const t = s.trim();
  if (t === "--" || t === "—") return 0;
  if (/varies/i.test(t)) return null;
  const frac = t.match(/^(\d+)\/(\d+)/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = t.match(/[\d.]+/);
  return n ? Number(n[0]) : null;
}

// "Significant Item (back)" → { carry: "Significant", slot: "back" }
function parseCarry(s) {
  const carry = s.match(/^(Insignificant|Significant|Oversized)/)?.[1];
  const slot = s.match(/\(([a-z]+)\)/i)?.[1]?.toLowerCase();
  return { carry, slot };
}

// ---------- collect master rows: [name, weightLb|null, carry|null, slot|null] ----------

const rows = [];

// Weapons table (section "Mastery Properties" carries the table).
for (const r of equipment.sections[4].tables[0].rows) {
  const { carry, slot } = parseCarry(r[6]);
  rows.push({ name: r[0], weightLb: parseWeight(r[5]), carry, slot, from: "Weapons" });
}
// Hunter Gear table.
for (const r of equipment.sections[7].tables[0].rows) {
  const { carry, slot } = parseCarry(r[2]);
  rows.push({ name: r[0], weightLb: parseWeight(r[1]), carry, slot, from: "Hunter Gear" });
}
// Tools section (prose): "THIEVES' TOOLS — …; Weight: 1 lb.; …"
for (const m of equipment.sections[6].text.matchAll(/^([A-Z][A-Z' \-]+) — .*?Weight: ([\d/]+ lb\.)/gm)) {
  rows.push({ name: m[1], weightLb: parseWeight(m[2]), carry: null, slot: null, from: "Tools" });
}
// Storage Items section (prose): "BACKPACK — … Weight: 5 lb. Carrying Category: Significant Item."
for (const m of equipment.sections[8].text.matchAll(
  /^([A-Z][A-Z ]+) — .*?Weight: ([\d/]+ lb\.).*?Carrying Category: (\w+) Item/gm,
)) {
  rows.push({ name: m[1], weightLb: parseWeight(m[2]), carry: m[3], slot: null, from: "Storage" });
}

// Armor tables (chapter 1, Parts 1 & 2) — checked against src/data/armor.ts.
const armorRows = [];
for (const t of [armorStep.tables[2], armorStep.tables[3]]) {
  for (const r of t.rows) armorRows.push({ name: r[0], weightLb: parseWeight(r[3]), from: "Armor" });
}

// ---------- compare ----------

const errors = [];
let checked = 0;
const misses = [];

for (const row of rows) {
  const app = items.get(toId(row.name));
  if (!app) {
    misses.push(`${row.name} (${row.from})`);
    continue;
  }
  checked++;
  if (row.weightLb !== null && app.weightLb !== row.weightLb) {
    errors.push(`${row.name}: weight ${app.weightLb} lb ≠ master ${row.weightLb} lb (${row.from})`);
  }
  if (row.carry && app.carry !== row.carry) {
    errors.push(`${row.name}: carry "${app.carry}" ≠ master "${row.carry}" (${row.from})`);
  }
  if ((app.slotLocation ?? null) !== (row.slot ?? null)) {
    errors.push(`${row.name}: slot pin "${app.slotLocation ?? "—"}" ≠ master "${row.slot ?? "—"}" (${row.from})`);
  }
}

for (const row of armorRows) {
  const app = armor.get(toId(row.name));
  if (!app) {
    misses.push(`${row.name} (${row.from})`);
    continue;
  }
  checked++;
  if (row.weightLb !== null && app.weightLb !== row.weightLb) {
    errors.push(`${row.name}: weight ${app.weightLb} lb ≠ master ${row.weightLb} lb (Armor)`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} mismatch(es) against resources/master.json:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ ${checked} catalog entries match resources/master.json.`);
console.log(`  (${misses.length} master items have no app entry — a content decision, not drift.)`);
