// Turn the free-text starting-equipment lists (class + background) into real
// inventory entries + starting gold, so a fresh hunter's pack isn't empty.
//
// The source strings live in src/data/classes.ts (`startingEquipment`) and
// src/data/backgrounds.ts (`equipment`) and look like "2 Blood vials",
// "18 bullets", "Blood-drainer's Tools (unique item)" or "30 GP".

import type { Background, HunterClass, InventoryEntry } from "@/types";
import { ITEMS } from "@/data/items";

// Catalog lookup by lowercased display name.
const BY_NAME: Record<string, string> = Object.fromEntries(
  ITEMS.map((i) => [i.name.toLowerCase(), i.id]),
);

// Names that don't singularise/match mechanically.
const ALIASES: Record<string, string> = {
  "blood vial": "blood-vial",
  "blood vials": "blood-vial",
  bullet: "bullets",
  bullets: "bullets",
  "book of eldritch knowledge": "book-of-eldritch-knowledge",
  "blood-drainer's tools": "blood-drainers-tools",
  "thieves' tools": "thieves-tools",
  "navigator's tools": "navigators-tools",
  "hunting trap": "hunting-trap",
  "hunting traps": "hunting-trap",
};

function lookupId(rawName: string): string | null {
  const name = rawName.toLowerCase();
  const direct = ALIASES[name] ?? BY_NAME[name];
  if (direct) return direct;
  // Crude plural → singular ("Daggers" → "Dagger", "Handaxes" → "Handaxe").
  if (name.endsWith("s")) {
    const singular = name.slice(0, -1);
    return ALIASES[singular] ?? BY_NAME[singular] ?? null;
  }
  return null;
}

export interface StartingKit {
  inventory: InventoryEntry[];
  coins: number;
  /** Source strings that couldn't be matched to a catalog item (kept visible
   * on the sheet's Starting Equipment chips regardless). */
  unmatched: string[];
}

/** Parse one equipment string ("2 Blood vials", "30 GP", "Tool Belt"). */
function parseLine(line: string): { kind: "coins"; gp: number } | { kind: "item"; id: string; qty: number } | null {
  const cleaned = line.replace(/\(unique item\)/i, "").trim();
  const gp = /^(\d+)\s*GP$/i.exec(cleaned);
  if (gp) return { kind: "coins", gp: parseInt(gp[1], 10) };
  const m = /^(\d+)\s+(..*)$/.exec(cleaned);
  const qty = m ? parseInt(m[1], 10) : 1;
  const name = (m ? m[2] : cleaned).trim();
  const id = lookupId(name);
  return id ? { kind: "item", id, qty } : null;
}

/** The full starting kit for a class + background: items + starting gold. */
export function startingKit(
  klass: HunterClass | undefined,
  bg: Background | null | undefined,
): StartingKit {
  const lines = [...(klass?.startingEquipment ?? []), ...(bg?.equipment ?? [])];
  const qtyById = new Map<string, number>();
  let coins = 0;
  const unmatched: string[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) {
      unmatched.push(line);
      continue;
    }
    if (parsed.kind === "coins") coins += parsed.gp;
    else qtyById.set(parsed.id, (qtyById.get(parsed.id) ?? 0) + parsed.qty);
  }

  const inventory = [...qtyById.entries()].map(([itemId, qty]) => ({ itemId, qty }));
  return { inventory, coins, unmatched };
}

/** Just the starting gold a background grants (for the Step 2 perk display). */
export function backgroundGold(bg: Background): number {
  let gp = 0;
  for (const line of bg.equipment) {
    const m = /^(\d+)\s*GP$/i.exec(line.trim());
    if (m) gp += parseInt(m[1], 10);
  }
  return gp;
}
