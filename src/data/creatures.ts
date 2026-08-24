// Each hunter class shows a themed creature sigil on its card. The sprite art
// itself lives in CreatureSprite.tsx (keyed by these ids); this just maps a
// class to the creature that fits its flavour.

export const CLASS_CREATURE: Record<string, string> = {
  brute: "berserker",
  scout: "dark-angel",
  stalker: "wraith",
  deepcaller: "sorcerer",
  bloodbound: "vampire",
  warden: "knight",
};

/** The creature sigil id for a class (falls back to a generic reaper). */
export function classCreatureId(classId: string | undefined): string {
  return (classId && CLASS_CREATURE[classId]) || "reaper";
}
