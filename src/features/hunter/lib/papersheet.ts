import { getClass } from "@/data/classes";
import type { HunterCard, SheetData } from "@/types";

/** Card fields mirrored from the free-form sheet so lists, party views and
 * campaign membership keep working for sheet-made hunters: the sheet is the
 * source of truth; these are denormalized copies. */
export function sheetMirror(sheet: SheetData): Pick<HunterCard, "name" | "level" | "background"> {
  const name = typeof sheet.name === "string" ? sheet.name.trim() : "";
  const parsed = typeof sheet.level === "string" ? parseInt(sheet.level, 10) : NaN;
  const level = Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
  const background = typeof sheet.background === "string" ? sheet.background.trim() : "";
  return { name, level, background };
}

/** The sheet's free-text class line, for list rows ("Stalker", "Deepcaller"…). */
export function sheetClassName(sheet: SheetData | undefined): string {
  const v = sheet?.["class"];
  return typeof v === "string" ? v.trim() : "";
}

/** A card's display class: the sheet's free-text class line, falling back to
 * the structured `classId` for hunters that predate the sheet (legacy builder
 * cards, test-run bots) — so list rows never show a classless hunter. */
export function cardClassName(card: Pick<HunterCard, "sheet" | "classId">): string {
  return sheetClassName(card.sheet) || getClass(card.classId)?.name || "";
}

/** Parse an integer out of a sheet's free-text box ("22", "+2", "30 ft") —
 * null when the box is empty, missing or unparseable. */
function sheetInt(sheet: SheetData | undefined, key: string): number | null {
  const v = sheet?.[key];
  if (typeof v !== "string") return null;
  const n = parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export interface SheetVitals {
  hpCur: number | null;
  hpMax: number | null;
  ac: number | null;
  sanityCur: number | null;
  sanityMax: number | null;
}

/** The sheet's play-relevant numbers, parsed from its free-text boxes — the ONE
 * way play surfaces (combat tracker, DM board, status screen) read a sheet
 * hunter's vitals. null = missing/unparseable (render as "?", never 0). */
export function sheetVitals(sheet: SheetData | undefined): SheetVitals {
  return {
    hpCur: sheetInt(sheet, "hpCur"),
    hpMax: sheetInt(sheet, "hpMax"),
    ac: sheetInt(sheet, "ac"),
    sanityCur: sheetInt(sheet, "sanityCur"),
    sanityMax: sheetInt(sheet, "sanityMax"),
  };
}
