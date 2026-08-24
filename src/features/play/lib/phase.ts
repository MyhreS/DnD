import type { GamePhase, GameLocation } from "@/types";

export const PHASES: { id: GamePhase; label: string; hint: string }[] = [
  { id: "exploration", label: "Exploration", hint: "Roaming, investigating, roleplay." },
  { id: "combat", label: "Combat", hint: "Initiative is rolled — blades out." },
  { id: "short_rest", label: "Short Rest", hint: "A breather: spend Hit Dice, regain some uses." },
  { id: "long_rest", label: "Long Rest", hint: "Full rest: restore HP and reset resources." },
];

export const PHASE_LABEL = Object.fromEntries(PHASES.map((p) => [p.id, p.label])) as Record<
  GamePhase,
  string
>;

/** Where the party is — orthogonal to phase, and what makes rests rulebook-accurate. */
export const LOCATIONS: { id: GameLocation; label: string; hint: string }[] = [
  { id: "wild", label: "The Wild", hint: "Out on the hunt — no Hit Dice on a Short Rest; a Long Rest restores only half HP." },
  { id: "safe", label: "Safe Zone", hint: "Safe enough to catch a breath — spend Hit Dice on a Short Rest." },
  { id: "lodge", label: "Hunters Lodge", hint: "A true haven — a Long Rest restores all HP and Hit Dice." },
];

export const LOCATION_LABEL = Object.fromEntries(LOCATIONS.map((l) => [l.id, l.label])) as Record<
  GameLocation,
  string
>;
