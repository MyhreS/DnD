import type { RuleEntry } from "@/types";

/** Rank entries against a query. Every whitespace token must match somewhere
 * (term / alias / body) for an entry to appear (AND), with term matches ranked
 * far above body matches. An empty query returns the list unchanged. */
export function searchRules(entries: RuleEntry[], query: string): RuleEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  const tokens = q.split(/\s+/);
  return entries
    .map((e) => ({ e, score: scoreEntry(e, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.term.localeCompare(b.e.term))
    .map((x) => x.e);
}

function scoreEntry(entry: RuleEntry, tokens: string[]): number {
  const term = entry.term.toLowerCase();
  const aliases = (entry.aliases ?? []).map((a) => a.toLowerCase());
  const body = entry.body.join(" ").toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (term === t) score += 100;
    else if (term.startsWith(t)) score += 50;
    else if (term.includes(t)) score += 30;
    else if (aliases.some((a) => a.includes(t))) score += 20;
    else if (body.includes(t)) score += 5;
    else return 0; // a token matched nothing — drop the entry
  }
  return score;
}
