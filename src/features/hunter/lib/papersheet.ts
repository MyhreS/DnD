import { getClass } from "@/data/classes";
import type { HunterCard, SheetData } from "@/types";
import { calculatedSheetFields } from "./characterAutomation";

/** Identity fields mirrored from the character sheet so lists, party views,
 * and campaign membership can read them without opening the editor. */
export function sheetMirror(sheet: SheetData): Pick<HunterCard, "name" | "level" | "background"> {
  const name = typeof sheet.name === "string" ? sheet.name.trim() : "";
  const parsed = typeof sheet.level === "string" ? parseInt(sheet.level, 10) : NaN;
  const level = Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
  const background = typeof sheet.background === "string" ? sheet.background.trim() : "";
  return { name, level, background };
}

/** The saved class line used by legacy sheet-only Hunters. */
export function sheetClassName(sheet: SheetData | undefined): string {
  const v = sheet?.["class"];
  return typeof v === "string" ? v.trim() : "";
}

/** Prefer the current structured class; use the saved class line only as a
 * fallback for legacy sheet-only Hunters. */
export function cardClassName(card: Pick<HunterCard, "sheet" | "classId">): string {
  return getClass(card.classId)?.name || sheetClassName(card.sheet) || "";
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

/** Parse play-relevant numbers from a saved sheet snapshot. null means the
 * value is missing or unparseable and should never be rendered as zero. */
export function sheetVitals(sheet: SheetData | undefined): SheetVitals {
  return {
    hpCur: sheetInt(sheet, "hpCur"),
    hpMax: sheetInt(sheet, "hpMax"),
    ac: sheetInt(sheet, "ac"),
    sanityCur: sheetInt(sheet, "sanityCur"),
    sanityMax: sheetInt(sheet, "sanityMax"),
  };
}

/** Resolve the effective character-sheet data used outside the editor. Current
 * structured Hunters are recalculated from their saved decisions every time;
 * legacy sheet-only Hunters retain their written values. */
export function resolvedCharacterSheet(card: HunterCard): SheetData {
  if (!getClass(card.classId)) return card.sheet ?? {};
  return { ...(card.sheet ?? {}), ...calculatedSheetFields(card) };
}

/** One current source of Hunter vitals for lists, game controls, battle view,
 * and the shared status board. */
export function characterVitals(card: HunterCard): SheetVitals {
  return sheetVitals(resolvedCharacterSheet(card));
}

/** Parse one effective numeric sheet field, including signed values such as
 * initiative. */
export function characterSheetInt(card: HunterCard, key: string): number | null {
  return sheetInt(resolvedCharacterSheet(card), key);
}
