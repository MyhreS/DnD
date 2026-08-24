import generated from "./codex.generated.json";

export interface CodexTable {
  title?: string;
  columns: string[];
  rows: string[][];
}

export interface CodexSource {
  id: string;
  title: string;
  shortLabel: string;
  kind: string;
  authority: string;
  audience: "player";
  description: string;
  pageCount: number;
  publicPath?: string;
  downloads: Array<{ label: string; publicPath: string }>;
  sourceFiles: string[];
  fileLabels: string[];
}

export interface CurrentWhisper {
  id: string;
  name: string;
  level: number;
  type: string;
  performing: string;
  range: string;
  duration: string;
  special?: string;
  text: string;
  upgrade: string;
  sourcePages: number[];
}

export interface CurrentCharacterSheet {
  sourceId: string;
  printedPageCount: number;
  logicalSectionCount: number;
  abilities: string[];
  skills: Array<{ name: string; ability: string }>;
  sections: Array<{ id: string; title: string; sourcePages: number[]; fields: string[] }>;
}

export interface CodexEntry {
  id: string;
  topicKey: string;
  term: string;
  aliases: string[];
  body: string[];
  paragraphs: string[];
  tables: CodexTable[];
  group: string;
  sourceId: string;
  locator: string;
  sourcePages?: number[];
  warning?: string;
}

export interface CodexTopic {
  topicKey: string;
  term: string;
  aliases: string[];
  body: string[];
  groups: string[];
  versions: CodexEntry[];
}

export const CODEX_SOURCES = generated.sources as CodexSource[];
export const CODEX_ENTRIES = generated.entries as CodexEntry[];
export const CURRENT_CHARACTER_SHEET = generated.characterSheet as CurrentCharacterSheet;
export const CURRENT_WHISPERS = generated.whispers as CurrentWhisper[];
export const CURRENT_CONDITIONS = generated.conditionsNamedByCurrentSources as string[];
export const CODEX_SOURCE_BY_ID = new Map(CODEX_SOURCES.map((item) => [item.id, item]));
export const CODEX_GROUPS = [...new Set(CODEX_ENTRIES.map((item) => item.group))];

/** Exact topic names from different documents become one result with separate
 * source versions. We never concatenate source wording into a synthetic rule. */
export const CODEX_TOPICS: CodexTopic[] = [...groupEntries(CODEX_ENTRIES).values()].map((versions) => ({
  topicKey: versions[0].topicKey,
  term: versions[0].term,
  aliases: [...new Set(versions.flatMap((item) => item.aliases))],
  body: versions.flatMap((item) => item.body),
  groups: [...new Set(versions.map((item) => item.group))],
  versions,
}));

function groupEntries(entries: CodexEntry[]): Map<string, CodexEntry[]> {
  const grouped = new Map<string, CodexEntry[]>();
  for (const entry of entries) {
    const versions = grouped.get(entry.topicKey) ?? [];
    versions.push(entry);
    grouped.set(entry.topicKey, versions);
  }
  return grouped;
}
