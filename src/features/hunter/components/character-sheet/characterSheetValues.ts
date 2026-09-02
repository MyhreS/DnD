import type { HunterCard } from "@/types";

export function characterSheetNumber(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Staging a new Madness total. core-rulebook.txt [page 23]: the Insane
 * condition ends the moment Madness drops below Max Sanity, and the Insane
 * Quirk goes with it — so the rolled quirk is cleared alongside, never left
 * attached to a Hunter who is no longer Insane. */
export function madnessPatch(card: HunterCard, madness: number, sanityMax: number): Partial<HunterCard> {
  const value = Math.max(0, Math.floor(madness));
  const insane = sanityMax > 0 && value >= sanityMax;
  const clearQuirk = !insane && !!card.insaneQuirkId;
  return clearQuirk ? { madness: value, insaneQuirkId: "" } : { madness: value };
}
