import type { CombatTimerPhase } from "../types";
import { formatCombatTime } from "../lib/formatCombatTime";

const PHASE_LABEL: Record<CombatTimerPhase, string> = {
  idle: "Waiting for combat",
  briefing: "Tactical briefing",
  running: "Turn in progress",
  paused: "Timer paused by DM",
  untimed: "DM turn - no timer",
  expired: "Time - finish current resolution",
};

export function CombatTimerPanel({
  phase,
  seconds,
  compact = false,
}: {
  phase: CombatTimerPhase;
  seconds: number;
  compact?: boolean;
}) {
  const warning = phase === "running" && seconds <= 30;
  return (
    <div
      className={`combat-timer combat-timer-${phase}${warning ? " combat-timer-warning" : ""}${compact ? " combat-timer-compact" : ""}`}
      role="timer"
      aria-live={phase === "expired" ? "assertive" : "off"}
      data-testid="combat-timer"
    >
      <div className="combat-timer-label">{PHASE_LABEL[phase]}</div>
      {phase === "briefing" || phase === "untimed" ? (
        <div className="combat-timer-briefing">{phase === "briefing" ? "UNLIMITED" : "UNTIMED"}</div>
      ) : (
        <div className="combat-timer-value">{formatCombatTime(seconds)}</div>
      )}
    </div>
  );
}
