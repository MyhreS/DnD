import type { CombatSession, Combatant } from "../types";

const TIMER_PHASES = new Set(["idle", "briefing", "running", "paused", "untimed", "expired"]);

function nullableFinite(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function validCombatant(value: unknown): value is Combatant {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Combatant>;
  return (
    typeof item.id === "string" && item.id.length > 0 && item.id.length <= 128 &&
    typeof item.name === "string" && item.name.length > 0 && item.name.length <= 80 &&
    (item.kind === "hunter" || item.kind === "creature") &&
    nullableFinite(item.initiative) &&
    nullableFinite(item.armorClass) &&
    nullableFinite(item.maxHp) &&
    nullableFinite(item.currentHp) &&
    Array.isArray(item.conditions) && item.conditions.length <= 20 &&
    item.conditions.every((condition) => typeof condition === "string" && condition.length <= 64) &&
    (item.classId === undefined || (typeof item.classId === "string" && item.classId.length <= 64)) &&
    typeof item.isWarden === "boolean"
  );
}

/** Firestore data is untrusted at runtime even when security rules gate writes. */
export function decodeCombatSession(value: unknown): CombatSession | null {
  if (!value || typeof value !== "object") return null;
  const session = value as Partial<CombatSession>;
  const valid =
    typeof session.title === "string" && session.title.length <= 120 &&
    Array.isArray(session.combatants) && session.combatants.length <= 60 &&
    session.combatants.every(validCombatant) &&
    typeof session.round === "number" && Number.isInteger(session.round) && session.round >= 0 &&
    nullableString(session.activeCombatantId) &&
    nullableString(session.designatedWardenId) &&
    session.turnDurationSeconds === 90 &&
    typeof session.timerPhase === "string" && TIMER_PHASES.has(session.timerPhase) &&
    nullableFinite(session.timerEndsAt) &&
    nullableFinite(session.pausedRemainingMs) &&
    typeof session.started === "boolean" &&
    typeof session.updatedAt === "number" && Number.isFinite(session.updatedAt);
  return valid ? session as CombatSession : null;
}
