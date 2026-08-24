// Book class artwork — the real splash/class art shown on a hunter's sheet,
// richer than the abstract CreatureSprite sigil. Keyed by class id; the hunter
// card falls back to the sigil when a class has no art here.
//
// The webp files are exported from resources/images/classes/ by
// scripts/build-class-art.mjs (bun run art:classes) — keep the two in sync.

export interface ClassArtEntry {
  src: string;
  /** CSS `object-position` aiming the cover-crop at the figure's head. Each
   * poster is a tall (900×1272) centered full-body figure; the face sits in
   * the top ~12–21%, so a low Y keeps it in frame even in wide, short crops. */
  focus: string;
}

export const CLASS_ART: Record<string, ClassArtEntry> = {
  brute: { src: "/art/classes/hunter-brute-splash.webp", focus: "50% 9%" },
  scout: { src: "/art/classes/hunter-scout-class-art.webp", focus: "50% 8%" },
  stalker: { src: "/art/classes/hunter-stalker-class-art.webp", focus: "50% 10%" },
  deepcaller: { src: "/art/classes/hunter-deepcaller-splash.webp", focus: "50% 6%" },
  bloodbound: { src: "/art/classes/hunter-bloodbound-class-art.webp", focus: "50% 7%" },
  warden: { src: "/art/classes/hunter-warden-class-art.webp", focus: "50% 16%" },
};

/** The class art entry for a class, or undefined if none exists. */
export function classArt(classId: string | undefined): ClassArtEntry | undefined {
  return classId ? CLASS_ART[classId] : undefined;
}
