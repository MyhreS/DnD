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
