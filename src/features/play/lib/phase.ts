import type { GamePhase, GameLocation } from "@/types";

export const PHASES: { id: GamePhase; label: string; hint: string }[] = [
  { id: "exploration", label: "Exploration", hint: "Roaming, investigating, roleplay." },
  { id: "combat", label: "Combat", hint: "Initiative is rolled — blades out." },
  {
    id: "short_rest",
    label: "Short Rest",
    hint: "1 hour: remove 1 Transformation Level, reduce Sleepless Counters by 6, and regain Short Rest features. In a Safe Zone you may also spend up to your Proficiency Bonus in Hit Point Dice (roll + CON, minimum 1).",
  },
  {
    id: "long_rest",
    label: "Long Rest",
    hint: "8 hours: Transformation to 0, Sleepless to 0, Exhaustion −1, reduce Madness by your Sanity Die + WIS; unspent Blood Tinge is lost.",
  },
];

export const PHASE_LABEL = Object.fromEntries(PHASES.map((p) => [p.id, p.label])) as Record<
  GamePhase,
  string
>;

/** Where the party is — orthogonal to phase and used by the established rest workflow. */
export const LOCATIONS: { id: GameLocation; label: string; hint: string }[] = [
  {
    id: "wild",
    label: "The Wild",
    hint: "Outside a Safe Zone — no Hit Point Dice, and a Long Rest restores only half your HP maximum.",
  },
  {
    id: "safe",
    label: "Safe Zone",
    hint: "Safe Zone — spend Hit Point Dice on a Short Rest; a Long Rest restores all HP and all Hit Point Dice.",
  },
  {
    id: "lodge",
    label: "Hunters Lodge",
    hint: "Hunters Lodge — always a Safe Zone; same rest benefits.",
  },
];

export const LOCATION_LABEL = Object.fromEntries(LOCATIONS.map((l) => [l.id, l.label])) as Record<
  GameLocation,
  string
>;
