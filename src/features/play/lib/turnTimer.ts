import type { EncounterState, TurnTimerPhase } from "@/types";

const LEGACY_TURN_DURATION_MS = 90_000;

const TIMER_PHASES = new Set<TurnTimerPhase>([
  "idle",
  "briefing",
  "running",
  "paused",
  "untimed",
  "expired",
]);

export function emptyEncounter(): EncounterState {
  return {
    active: false,
    round: 0,
    turnId: null,
    designatedWardenId: null,
    timerPhase: "idle",
    timerEndsAt: null,
    pausedRemainingMs: null,
  };
}

/** Accept legacy game documents while bounding untrusted Firestore values. */
export function normalizeEncounterState(value: unknown): EncounterState {
  if (!value || typeof value !== "object") return emptyEncounter();
  const raw = value as Partial<EncounterState>;
  const phase = typeof raw.timerPhase === "string" && TIMER_PHASES.has(raw.timerPhase)
    ? raw.timerPhase
    : "idle";
  return {
    active: raw.active === true,
    round: typeof raw.round === "number" && Number.isInteger(raw.round) && raw.round >= 0 ? raw.round : 0,
    turnId: typeof raw.turnId === "string" ? raw.turnId : null,
    designatedWardenId: typeof raw.designatedWardenId === "string" ? raw.designatedWardenId : null,
    timerPhase: phase,
    timerEndsAt: typeof raw.timerEndsAt === "number" && Number.isFinite(raw.timerEndsAt) ? raw.timerEndsAt : null,
    pausedRemainingMs:
      typeof raw.pausedRemainingMs === "number" && Number.isFinite(raw.pausedRemainingMs)
        ? Math.min(LEGACY_TURN_DURATION_MS, Math.max(0, raw.pausedRemainingMs))
        : null,
  };
}
