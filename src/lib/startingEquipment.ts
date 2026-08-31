import type { Background, HunterClass, InventoryEntry } from "@/types";
import { ITEMS } from "@/data/items";

const BY_NAME = new Map(ITEMS.map((item) => [item.name.toLowerCase(), item.id]));
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

function parse(line: string): { itemId?: string; qty?: number; gp?: number } | null {
  const cleaned = line.replace(/\(unique item\)/gi, "").trim();
  const gp = /^(\d+)\s*GP$/i.exec(cleaned);
  if (gp) return { gp: Number(gp[1]) };
  const quantity = /^(\d+)\s+(.+)$/.exec(cleaned);
  const itemId = catalogIdForName(cleaned);
  return itemId ? { itemId, qty: quantity ? Number(quantity[1]) : 1 } : null;
}

export function startingKit(klass?: HunterClass, background?: Background | null): { inventory: InventoryEntry[]; coins: number; unmatched: string[] } {
  const quantities = new Map<string, number>();
  const unmatched: string[] = [];
  let coins = 0;
  for (const line of [...(klass?.startingEquipment ?? []), ...(background?.equipment ?? [])]) {
    const parsed = parse(line);
    if (!parsed) { unmatched.push(line); continue; }
    if (parsed.gp) coins += parsed.gp;
    if (parsed.itemId) quantities.set(parsed.itemId, (quantities.get(parsed.itemId) ?? 0) + (parsed.qty ?? 1));
  }
  return { inventory: [...quantities].map(([itemId, qty]) => ({ itemId, qty })), coins, unmatched };
}
