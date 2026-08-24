import type { HunterCard, SheetData } from "@/types";

/** Card fields mirrored from the free-form sheet so lists, party views and
 * campaign membership keep working for sheet-made hunters: the sheet is the
 * source of truth; these are denormalized copies. */
export function sheetMirror(sheet: SheetData): Pick<HunterCard, "name" | "level" | "background"> {
  const name = typeof sheet.name === "string" ? sheet.name.trim() : "";
  const parsed = typeof sheet.level === "string" ? parseInt(sheet.level, 10) : NaN;
  const level = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
  const background = typeof sheet.background === "string" ? sheet.background.trim() : "";
  return { name, level, background };
}

/** The sheet's free-text class line, used verbatim in list rows. */
export function sheetClassName(sheet: SheetData | undefined): string {
  const v = sheet?.["class"];
  return typeof v === "string" ? v.trim() : "";
}

function displayId(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** A card's display class: the current sheet's free-text line, falling back to
 * an older stored `classId` without interpreting it. */
export function cardClassName(card: Pick<HunterCard, "sheet" | "classId">): string {
  return sheetClassName(card.sheet) || displayId(card.classId);
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
