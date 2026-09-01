import type { Background, HunterClass, InventoryEntry } from "@/types";
import { ARMOR } from "@/data/armor";
import { ITEMS } from "@/data/items";

const BY_NAME = new Map(ITEMS.map((item) => [item.name.toLowerCase(), item.id]));
/** Class kits also grant armor "Extra" pieces (head gear), which live in
 * `src/data/armor.ts` rather than `ITEMS`. Resolve them centrally so no class
 * list has to special-case its hat. */
const EXTRA_ARMOR_BY_NAME = new Map(
  ARMOR.filter((piece) => piece.category === "Extra").map((piece) => [piece.name.toLowerCase(), piece.id]),
);
const ALIASES: Record<string, string> = {
  "blood vial": "blood-vial", "blood vials": "blood-vial", bullet: "bullets", bullets: "bullets",
  "book of eldritch knowledge": "book-of-eldritch-knowledge",
  "lantern": "lantern", "hooded lantern": "lantern", "bullseye lantern": "lantern-bullseye",
  "deepcallers robe": "robe", robe: "robe", "blood-drainer's tools": "blood-drainers-tools",
  "thieves' tools": "thieves-tools", "navigator's tools": "navigators-tools", "navigators tools": "navigators-tools",
  "hunting trap": "hunting-trap", "hunting traps": "hunting-trap", "tool belt": "tool-belt",
};

export function catalogIdForName(raw: string): string | null {
  const normalized = raw.replace(/\(unique item\)/gi, "").trim().toLowerCase();
  const withoutQty = normalized.replace(/^\d+\s+/, "");
  return ALIASES[withoutQty] ?? BY_NAME.get(withoutQty) ?? (withoutQty.endsWith("s") ? BY_NAME.get(withoutQty.slice(0, -1)) : undefined) ?? null;
}

function extraArmorIdForName(raw: string): string | null {
  const normalized = raw.replace(/\(unique item\)/gi, "").trim().toLowerCase().replace(/^\d+\s+/, "");
  return EXTRA_ARMOR_BY_NAME.get(normalized) ?? null;
}

function parse(line: string): { itemId?: string; qty?: number; gp?: number } | null {
  const cleaned = line.replace(/\(unique item\)/gi, "").trim();
  const gp = /^(\d+)\s*GP$/i.exec(cleaned);
  if (gp) return { gp: Number(gp[1]) };
  const quantity = /^(\d+)\s+(.+)$/.exec(cleaned);
  const itemId = catalogIdForName(cleaned);
  return itemId ? { itemId, qty: quantity ? Number(quantity[1]) : 1 } : null;
}

export function startingKit(klass?: HunterClass, background?: Background | null): { inventory: InventoryEntry[]; coins: number; extraArmorIds: string[]; unmatched: string[] } {
  const quantities = new Map<string, number>();
  const extraArmorIds: string[] = [];
  const unmatched: string[] = [];
  let coins = 0;
  for (const line of [...(klass?.startingEquipment ?? []), ...(background?.equipment ?? [])]) {
    const armorId = extraArmorIdForName(line);
    if (armorId) { if (!extraArmorIds.includes(armorId)) extraArmorIds.push(armorId); continue; }
    const parsed = parse(line);
    if (!parsed) { unmatched.push(line); continue; }
    if (parsed.gp) coins += parsed.gp;
    if (parsed.itemId) quantities.set(parsed.itemId, (quantities.get(parsed.itemId) ?? 0) + (parsed.qty ?? 1));
  }
  return { inventory: [...quantities].map(([itemId, qty]) => ({ itemId, qty })), coins, extraArmorIds, unmatched };
}
