export type CombatantKind = "hunter" | "creature";

export type CombatTimerPhase =
  | "idle"
  | "briefing"
  | "running"
  | "paused"
  | "untimed"
  | "expired";

export interface Combatant {
  id: string;
  name: string;
  kind: CombatantKind;
  initiative: number | null;
  armorClass: number | null;
  maxHp: number | null;
  currentHp: number | null;
  conditions: string[];
  classId?: string;
  isWarden: boolean;
}

export interface CombatSession {
  title: string;
  combatants: Combatant[];
  round: number;
  activeCombatantId: string | null;
  designatedWardenId: string | null;
  turnDurationSeconds: 90;
  timerPhase: CombatTimerPhase;
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
  started: boolean;
  updatedAt: number;
}

export interface ManualCombatantInput {
  name: string;
  kind: CombatantKind;
  initiative: number | null;
  armorClass: number | null;
  maxHp: number | null;
  isWarden: boolean;
}
