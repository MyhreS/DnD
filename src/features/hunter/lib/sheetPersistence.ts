import type { HunterCard, SheetData } from "@/types";

/** Build the single Firestore update map used for a rules decision and every
 * visible sheet field derived from it. Keeping this pure makes the cross-device
 * atomicity contract directly testable without Firebase credentials. */
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
