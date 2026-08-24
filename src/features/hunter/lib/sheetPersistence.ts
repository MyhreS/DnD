import type { HunterCard, SheetData } from "@/types";

/** Build one Firestore update map for a group of manual sheet edits plus the
 * small card mirrors used by lists and rosters. */
export function characterSheetUpdate(
  sheet: SheetData,
  keys: string[],
  mirror: Partial<HunterCard>,
  cardPatch: Partial<HunterCard>,
  deletedValue: unknown,
  updatedAt: number,
): Record<string, unknown> {
  const update: Record<string, unknown> = { updatedAt };
  for (const [key, value] of Object.entries({ ...cardPatch, ...mirror })) {
    if (value !== undefined) update[key] = value;
  }
  for (const key of keys) update[`sheet.${key}`] = key in sheet ? sheet[key] : deletedValue;
  return update;
}
