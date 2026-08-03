import type { EncounterState } from "@/types";
import { useTurnClock } from "../hooks/useTurnClock";
import { formatTurnTime } from "../lib/turnTimer";

export function CombatTurnTimer({
  encounter,
  combatantName,
  controls = false,
  onStart,
  onPause,
  onResume,
}: {
  encounter: EncounterState;
  combatantName?: string;
  controls?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}) {
  const { phase, remainingMs } = useTurnClock(encounter);
  const timed = phase === "running" || phase === "paused" || phase === "expired";
  const label = phase === "briefing"
    ? "Tactical briefing"
    : phase === "untimed"
      ? "DM turn — no timer"
      : phase === "paused"
        ? "Timer paused by DM"
        : phase === "expired"
          ? "Time expired"
          : phase === "running"
            ? "Turn in progress"
            : "Turn timer";
  const description = phase === "briefing"
    ? "Unlimited planning only. Start the clock when the designated Warden begins acting."
    : phase === "expired"
      ? "Finish the action already begun; no new movement, attack, Bonus Action, or optional effect."
      : phase === "untimed"
        ? "Creatures controlled by the DM are not subject to the player turn timer."
        : phase === "running"
          ? "Movement, actions, Bonus Actions, item interactions, and effects must resolve before time runs out."
          : phase === "paused"
            ? "Paused for a DM clarification or resolution outside the player's control."
            : "The timer begins when the DM advances to a Hunter's turn.";

  return (
    <section className={`combat-turn-clock combat-turn-clock-${phase}`} data-testid="combat-turn-clock">
      <div className="combat-turn-clock-copy">
        <span aria-live="polite">{combatantName ? `${combatantName} · ${label}` : label}</span>
        <strong data-testid="combat-timer">{timed ? formatTurnTime(remainingMs) : phase === "briefing" ? "Briefing" : "No timer"}</strong>
      </div>
      <p>{description}</p>
      {controls && (
        <div className="combat-turn-clock-actions">
          {phase === "briefing" && <button type="button" className="btn btn-primary btn-sm" data-testid="start-warden-timer" onClick={onStart}>Start 90 seconds</button>}
          {phase === "running" && <button type="button" className="btn btn-ghost btn-sm" data-testid="pause-combat-timer" onClick={onPause}>Pause timer</button>}
          {phase === "paused" && <button type="button" className="btn btn-primary btn-sm" data-testid="resume-combat-timer" onClick={onResume}>Resume timer</button>}
        </div>
      )}
    </section>
  );
}
