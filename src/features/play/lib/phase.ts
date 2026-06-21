import type { GamePhase } from "@/types";

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
