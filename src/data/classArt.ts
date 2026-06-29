// Book class artwork — the real splash/class art shown on a hunter's sheet,
// richer than the abstract CreatureSprite sigil. Keyed by class id; the hunter
// card falls back to the sigil when a class has no art here.

export const CLASS_ART: Record<string, string> = {
  brute: "/art/classes/hunter-brute-splash.png",
  scout: "/art/classes/hunter-scout-class-art.png",
  stalker: "/art/classes/hunter-stalker-class-art.png",
  deepcaller: "/art/classes/hunter-deepcaller-splash.png",
  bloodbound: "/art/classes/hunter-bloodbound-class-art.png",
  warden: "/art/classes/hunter-warden-class-art.png",
};

/** The class art image path for a class, or undefined if none exists. */
export function classArt(classId: string | undefined): string | undefined {
  return classId ? CLASS_ART[classId] : undefined;
}
