import { useState } from "react";
import { useCombatClock } from "../hooks/useCombatClock";
import { activeCombatant } from "../lib/combatRules";
import { useCombatStore } from "../store/combatStore";
import { AddCombatantForm } from "./AddCombatantForm";
import { CombatantControlRow } from "./CombatantControlRow";
import { CombatTimerPanel } from "./CombatTimerPanel";

export function CombatTracker() {
  const session = useCombatStore((s) => s.session);
  const nextTurn = useCombatStore((s) => s.nextTurn);
  const previousTurn = useCombatStore((s) => s.previousTurn);
  const startTimer = useCombatStore((s) => s.startTimer);
  const pauseTimer = useCombatStore((s) => s.pauseTimer);
  const resumeTimer = useCombatStore((s) => s.resumeTimer);
  const restartTimer = useCombatStore((s) => s.restartTimer);
  const endCombat = useCombatStore((s) => s.endCombat);
  const seconds = useCombatClock();
  const current = activeCombatant(session);
  const [adding, setAdding] = useState(false);

  return (
    <div className="combat-control-stack">
      <section className="combat-live-heading">
        <div>
          <span>Round {session.round}</span>
          <h2>{current?.name ?? "No active combatant"}</h2>
        </div>
        <CombatTimerPanel phase={session.timerPhase} seconds={seconds} compact />
      </section>

      <div className="combat-turn-controls">
        {session.timerPhase === "briefing" && (
          <button className="btn btn-primary" type="button" onClick={startTimer} data-testid="start-warden-turn">
            Begin Warden's 90 seconds
          </button>
        )}
        {session.timerPhase === "running" && (
          <button className="btn btn-ghost" type="button" onClick={pauseTimer}>Pause timer</button>
        )}
        {session.timerPhase === "paused" && (
          <button className="btn btn-primary" type="button" onClick={resumeTimer}>Resume timer</button>
        )}
        {(session.timerPhase === "expired" || session.timerPhase === "paused") && (
          <button className="btn btn-ghost" type="button" onClick={restartTimer}>Restart 90 seconds</button>
        )}
        <div className="btn-row">
          <button className="btn btn-ghost" type="button" onClick={previousTurn}>Previous</button>
          <button className="btn btn-primary" type="button" onClick={nextTurn} data-testid="next-turn">End turn / Next</button>
        </div>
      </div>

      <section className="combat-section">
        <div className="row between">
          <h2>Combatants</h2>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAdding((value) => !value)}>
            {adding ? "Close" : "Add"}
          </button>
        </div>
        {adding && <AddCombatantForm onAdded={() => setAdding(false)} />}
        <div className="combat-control-list">
          {session.combatants.map((combatant) => (
            <CombatantControlRow key={combatant.id} combatant={combatant} active={combatant.id === session.activeCombatantId} />
          ))}
        </div>
      </section>

      <button className="btn btn-ghost" type="button" onClick={() => window.confirm("End combat and return to setup?") && endCombat()}>
        End combat
      </button>
    </div>
  );
}

