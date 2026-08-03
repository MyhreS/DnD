import type { Combatant, EncounterState, TurnTimerPhase } from "@/types";

export const TURN_DURATION_MS = 90_000;

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
        ? Math.min(TURN_DURATION_MS, Math.max(0, raw.pausedRemainingMs))
        : null,
  };
}

export function timerForCombatant(
  combatant: Combatant | undefined,
  designatedWardenId: string | null,
  now = Date.now(),
): Pick<EncounterState, "timerPhase" | "timerEndsAt" | "pausedRemainingMs"> {
  if (!combatant || combatant.kind === "monster") {
    return { timerPhase: "untimed", timerEndsAt: null, pausedRemainingMs: null };
  }
  if (combatant.id === designatedWardenId) {
    return { timerPhase: "briefing", timerEndsAt: null, pausedRemainingMs: null };
  }
  return { timerPhase: "running", timerEndsAt: now + TURN_DURATION_MS, pausedRemainingMs: null };
}

export function effectiveTimerPhase(encounter: EncounterState, now = Date.now()): TurnTimerPhase {
  if (encounter.timerPhase === "running" && encounter.timerEndsAt !== null && encounter.timerEndsAt <= now) {
    return "expired";
  }
  return encounter.timerPhase;
}

export function remainingTurnMs(encounter: EncounterState, now = Date.now()): number | null {
  if (encounter.timerPhase === "paused") {
    return Math.min(TURN_DURATION_MS, Math.max(0, encounter.pausedRemainingMs ?? 0));
  }
  if (encounter.timerPhase !== "running" || encounter.timerEndsAt === null) return null;
  return Math.min(TURN_DURATION_MS, Math.max(0, encounter.timerEndsAt - now));
}

export function formatTurnTime(milliseconds: number | null): string {
  if (milliseconds === null) return "--:--";
  const seconds = Math.ceil(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function startTurnTimer(encounter: EncounterState, now = Date.now()): EncounterState {
  return {
    ...encounter,
    timerPhase: "running",
    timerEndsAt: now + TURN_DURATION_MS,
    pausedRemainingMs: null,
  };
}

export function pauseTurnTimer(encounter: EncounterState, now = Date.now()): EncounterState {
  const remaining = remainingTurnMs(encounter, now);
  if (remaining === null) return encounter;
  return { ...encounter, timerPhase: "paused", timerEndsAt: null, pausedRemainingMs: remaining };
}

export function resumeTurnTimer(encounter: EncounterState, now = Date.now()): EncounterState {
  if (encounter.timerPhase !== "paused") return encounter;
  const remaining = Math.max(0, encounter.pausedRemainingMs ?? 0);
  return {
    ...encounter,
    timerPhase: remaining === 0 ? "expired" : "running",
    timerEndsAt: remaining === 0 ? null : now + remaining,
    pausedRemainingMs: null,
  };
}
