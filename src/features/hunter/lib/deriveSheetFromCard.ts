import { calculatedSheetFields } from "./characterAutomation";
import type { HunterCard, SheetData } from "@/types";

/**
 * Derive an initial paper-sheet view from a card's STRUCTURED fields — for
 * hunters that predate the sheet (legacy builder cards, test-run bot cards),
 * which have no `card.sheet` at all. Without this they render a completely
 * blank sheet.
 *
 * This delegates to `calculatedSheetFields()` — the SAME projection the app
 * sheet uses — so a legacy hunter's printed sheet can never show different
 * numbers from the same hunter's app sheet. It previously recomputed a subset
 * by hand and disagreed on passive Perception (Expertise + custom modifier),
 * `hpMax` (Tough / Boon of Fortitude), `speed`, `ac`, `hdCur` and more.
 * Empty-string/false values are still omitted so the derived map only carries
 * real content.
 */
export function deriveSheetFromCard(card: HunterCard): SheetData {
  const derived: SheetData = {};
  for (const [key, value] of Object.entries(calculatedSheetFields(card))) {
    if (value === undefined || value === "" || value === false) continue;
    derived[key] = value;
  }
  return derived;
}
