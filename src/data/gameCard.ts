import generated from "./gameCard.generated.json";

export const GAME_CARD_CATEGORIES = [
  "Turns & combat",
  "Conditions",
  "Movement & exploration",
  "Character & rites",
  "Equipment",
  "Transformation",
] as const;

export type GameCardCategory = (typeof GAME_CARD_CATEGORIES)[number];

export interface GameCardTable {
  caption?: string;
  columns: string[];
  rows: string[][];
}

export interface GameCardEntry {
  id: string;
  term: string;
  category: GameCardCategory;
  aliases?: string[];
  /** Searchable text, including flattened table rows. */
  body: string[];
  /** Paragraphs shown above any tables. */
  paragraphs: string[];
  tables?: GameCardTable[];
  sourcePage: number;
  sourcePages: number[];
}

/** Generated from resources/master.json by scripts/generate-codex-data.mjs.
 * master.json is the only hand-maintained copy of the Game Card transcription. */
export const GAME_CARD_ENTRIES: GameCardEntry[] = generated.entries.map((item) => ({
  ...item,
  category: item.category as GameCardCategory,
  body: [
    ...item.paragraphs,
    ...((item.tables ?? []) as GameCardTable[]).flatMap((table) => [
      table.caption ?? "",
      table.columns.join(" "),
      ...table.rows.map((row) => row.join(" ")),
    ]),
  ].filter(Boolean),
}));
