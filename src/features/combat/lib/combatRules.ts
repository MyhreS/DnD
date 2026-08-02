import type { CombatSession, Combatant } from "../types";

export const TURN_DURATION_SECONDS = 90 as const;

export function freshCombatSession(now = Date.now()): CombatSession {
  return {
    title: "Tonight's Hunt",
    combatants: [],
    round: 0,
    activeCombatantId: null,
    designatedWardenId: null,
    turnDurationSeconds: TURN_DURATION_SECONDS,
    timerPhase: "idle",
    timerEndsAt: null,
    pausedRemainingMs: null,
    started: false,
    updatedAt: now,
  };
}

export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
    if (a.initiative === null) return 1;
    if (b.initiative === null) return -1;
    return b.initiative - a.initiative || a.name.localeCompare(b.name);
  });
}

export function activeCombatant(session: CombatSession): Combatant | null {
  return session.combatants.find((c) => c.id === session.activeCombatantId) ?? null;
}

function activateTurn(
  session: CombatSession,
  combatantId: string,
  round: number,
  now: number,
): CombatSession {
  const combatant = session.combatants.find((item) => item.id === combatantId);
  const tacticalBriefing = combatant?.kind === "hunter" && combatantId === session.designatedWardenId;
  const untimed = combatant?.kind === "creature";
  return {
    ...session,
    round,
    activeCombatantId: combatantId,
    timerPhase: tacticalBriefing ? "briefing" : untimed ? "untimed" : "running",
    timerEndsAt: tacticalBriefing || untimed
      ? null
      : now + session.turnDurationSeconds * 1_000,
    pausedRemainingMs: null,
    started: true,
    updatedAt: now,
  };
}

export function beginCombat(session: CombatSession, now = Date.now()): CombatSession {
  const combatants = sortByInitiative(session.combatants);
  const first = combatants[0];
  if (!first) return session;
  return activateTurn({ ...session, combatants }, first.id, 1, now);
}

export function moveTurn(
  session: CombatSession,
  direction: 1 | -1,
  now = Date.now(),
): CombatSession {
  if (!session.combatants.length) return session;
  const currentIndex = Math.max(
    0,
    session.combatants.findIndex((c) => c.id === session.activeCombatantId),
  );
  const rawIndex = currentIndex + direction;
  const nextIndex = (rawIndex + session.combatants.length) % session.combatants.length;
  const wrappedForward = direction === 1 && nextIndex === 0;
  const wrappedBack = direction === -1 && currentIndex === 0;
  const nextRound = Math.max(
    1,
    session.round + (wrappedForward ? 1 : 0) - (wrappedBack ? 1 : 0),
  );
  return activateTurn(session, session.combatants[nextIndex].id, nextRound, now);
}

export function startTurnTimer(session: CombatSession, now = Date.now()): CombatSession {
  if (session.timerPhase !== "briefing") return session;
  return {
    ...session,
    timerPhase: "running",
    timerEndsAt: now + session.turnDurationSeconds * 1_000,
    pausedRemainingMs: null,
    updatedAt: now,
  };
}

export function pauseTurnTimer(session: CombatSession, now = Date.now()): CombatSession {
  if (session.timerPhase !== "running" || session.timerEndsAt === null) return session;
  return {
    ...session,
    timerPhase: "paused",
    timerEndsAt: null,
    pausedRemainingMs: Math.max(0, session.timerEndsAt - now),
    updatedAt: now,
  };
}

export function resumeTurnTimer(session: CombatSession, now = Date.now()): CombatSession {
  if (session.timerPhase !== "paused") return session;
  const remaining = session.pausedRemainingMs ?? session.turnDurationSeconds * 1_000;
  return {
    ...session,
    timerPhase: "running",
    timerEndsAt: now + remaining,
    pausedRemainingMs: null,
    updatedAt: now,
  };
}

export function restartTurnTimer(session: CombatSession, now = Date.now()): CombatSession {
  if (!session.started) return session;
  return {
    ...session,
    timerPhase: "running",
    timerEndsAt: now + session.turnDurationSeconds * 1_000,
    pausedRemainingMs: null,
    updatedAt: now,
  };
}

export function expireTurnTimer(session: CombatSession, now = Date.now()): CombatSession {
  if (
    session.timerPhase !== "running" ||
    session.timerEndsAt === null ||
    session.timerEndsAt > now
  ) {
    return session;
  }
  return {
    ...session,
    timerPhase: "expired",
    timerEndsAt: null,
    pausedRemainingMs: 0,
    updatedAt: now,
  };
}

export function remainingSeconds(session: CombatSession, now = Date.now()): number {
  if (session.timerPhase === "paused") {
    return Math.ceil((session.pausedRemainingMs ?? 0) / 1_000);
  }
  if (session.timerPhase !== "running" || session.timerEndsAt === null) return 0;
  return Math.max(0, Math.ceil((session.timerEndsAt - now) / 1_000));
}
