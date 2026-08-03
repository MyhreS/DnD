/** The minimal shape the shared search can rank: a primary term, optional
 * aliases (synonyms / parent titles), and body paragraphs. */
export interface Searchable {
  term: string;
  aliases?: string[];
  body: string[];
}

/** Fold a string for matching: lowercase, strip diacritics, drop apostrophes
 * (so "bands" finds "Band's"), and collapse all other punctuation into single
 * spaces. Query and haystack are folded the same way. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’‘`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Folded haystacks, cached per entry object — the indexes are module
 * constants / memoized arrays, so typing re-ranks without re-folding hundreds
 * of KB of text on every keystroke. */
const folded = new WeakMap<Searchable, { term: string; aliases: string[]; body: string }>();

function fold(entry: Searchable) {
  let f = folded.get(entry);
  if (!f) {
    f = {
      term: normalizeText(entry.term),
      aliases: (entry.aliases ?? []).map(normalizeText),
      body: normalizeText(entry.body.join(" ")),
    };
    folded.set(entry, f);
  }
  return f;
}

/** Rank entries against a query. Every whitespace token must match somewhere
 * (term / alias / body) for an entry to appear (AND), with term matches ranked
 * far above body matches. Matching is punctuation- and accent-insensitive.
 * An empty query returns the list unchanged. */
export function searchEntries<T extends Searchable>(entries: T[], query: string): T[] {
  const q = normalizeText(query);
  if (!q) return entries;
  const tokens = q.split(" ");
  return entries
    .map((e) => ({ e, score: scoreEntry(e, tokens, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.term.localeCompare(b.e.term))
    .map((x) => x.e);
}

function scoreEntry(entry: Searchable, tokens: string[], phrase: string): number {
  const { term, aliases, body } = fold(entry);
  let score = 0;
  for (const t of tokens) {
    if (term === t) score += 100;
    else if (term.startsWith(t)) score += 50;
    else if (term.includes(t)) score += 30;
    else if (aliases.some((a) => a.includes(t))) score += 20;
    else if (body.includes(t)) score += 5;
    else return 0; // a token matched nothing — drop the entry
  }
  // Multi-word queries: the exact phrase beats scattered tokens.
  if (tokens.length > 1 && (term.includes(phrase) || body.includes(phrase))) score += 10;
  return score;
}

// --- Match context (snippets & highlighting) ---

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

/** When a query only matched inside an entry's body (its title/aliases don't
 * explain the hit), return the original text around the first body match so
 * result cards can show WHY the entry surfaced. Null when the title says it all. */
export function bodySnippet(entry: Searchable, query: string): Snippet | null {
  const q = normalizeText(query);
  if (!q) return null;
  const { term, aliases } = fold(entry);
  const tokens = q.split(" ");
  const bodyOnly = tokens.filter((t) => !term.includes(t) && !aliases.some((a) => a.includes(t)));
  if (bodyOnly.length === 0) return null;
  // Prefer showing the whole phrase in context; fall back to the first
  // body-only token.
  const needles = tokens.length > 1 ? [q, ...bodyOnly] : bodyOnly;
  for (const needle of needles) {
    for (const para of entry.body) {
      if (!normalizeText(para).includes(needle)) continue;
      const { text, map } = foldWithMap(para);
      const i = text.indexOf(needle);
      if (i < 0) continue;
      const start = map[i];
      const end = map[i + needle.length - 1] + 1;
      const from = Math.max(0, start - 44);
      const to = Math.min(para.length, end + 44);
      return {
        before: (from > 0 ? "…" : "") + para.slice(from, start),
        match: para.slice(start, end),
        after: para.slice(end, to) + (to < para.length ? "…" : ""),
      };
    }
  }
  return null;
}

/** Split `text` into segments, marking the parts a query token (or the whole
 * phrase) matches — punctuation-insensitively — so cards can bold them. */
export function highlightSegments(text: string, query: string): { text: string; hit: boolean }[] {
  const plain = [{ text, hit: false }];
  const q = normalizeText(query);
  if (!q) return plain;
  // Single letters highlight too aggressively while the user is still typing.
  const tokens = [...(q.includes(" ") ? [q] : []), ...q.split(" ").filter((t) => t.length >= 2)];
  if (tokens.length === 0 || !tokens.some((t) => normalizeText(text).includes(t))) return plain;
  const { text: norm, map } = foldWithMap(text);
  const ranges: [number, number][] = [];
  for (const t of tokens) {
    let from = 0;
    for (let i = norm.indexOf(t, from); i >= 0; i = norm.indexOf(t, from)) {
      ranges.push([map[i], map[i + t.length - 1] + 1]);
      from = i + t.length;
    }
  }
  if (ranges.length === 0) return plain;
  ranges.sort((a, b) => a[0] - b[0]);
  const segments: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const [start, end] of ranges) {
    if (end <= pos) continue;
    const s = Math.max(start, pos);
    if (s > pos) segments.push({ text: text.slice(pos, s), hit: false });
    segments.push({ text: text.slice(s, end), hit: true });
    pos = end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), hit: false });
  return segments;
}

/** Fold one paragraph like `normalizeText`, but keep a normalized-index →
 * original-index map so matches can be sliced out of the original text. */
function foldWithMap(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const base = s[i].toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    for (const ch of base) {
      if (/['’‘`´]/.test(ch)) continue;
      if (/[a-z0-9]/.test(ch)) {
        text += ch;
        map.push(i);
      } else if (text.length > 0 && text[text.length - 1] !== " ") {
        text += " ";
        map.push(i);
      }
    }
  }
  return { text, map };
}
