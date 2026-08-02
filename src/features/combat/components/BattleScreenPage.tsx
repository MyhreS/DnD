import { useCombatClock } from "../hooks/useCombatClock";
import { useCombatSync } from "../hooks/useCombatSync";
import { activeCombatant } from "../lib/combatRules";
import { useCombatStore } from "../store/combatStore";
import { BattleCombatantRow } from "./BattleCombatantRow";
import { CombatTimerPanel } from "./CombatTimerPanel";

export function BattleScreenPage() {
  const syncStatus = useCombatSync(false);
  const session = useCombatStore((s) => s.session);
  const seconds = useCombatClock();
  const current = activeCombatant(session);

  const fullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.warn("Fullscreen is unavailable", error);
    }
  };

  if (!session.started || session.combatants.length === 0) {
    return (
      <main className="battle-screen battle-screen-empty">
        <div className="battle-empty-mark" aria-hidden="true">◆</div>
        <h1>Combat is close.</h1>
        <p>Roll for initiative.</p>
        <button className="battle-fullscreen-button" type="button" onClick={fullscreen}>Fullscreen</button>
      </main>
    );
  }

  return (
    <main className="battle-screen">
      <header className="battle-header">
        <div>
          <span>Round {session.round}</span>
          <h1>{session.title}</h1>
        </div>
        <div className="battle-header-actions">
          <span className="battle-sync-status">
            {syncStatus === "live" ? "Live" : syncStatus === "local" ? "Preview" : "Reconnecting"}
          </span>
          <button className="battle-fullscreen-button" type="button" onClick={fullscreen}>Fullscreen</button>
        </div>
      </header>

      <div className="battle-layout">
        <ol className="battle-order" aria-label="Initiative order">
          {session.combatants.map((combatant, index) => (
            <BattleCombatantRow key={combatant.id} combatant={combatant} position={index + 1} active={combatant.id === session.activeCombatantId} />
          ))}
        </ol>

        <aside className="battle-turn">
          <div className="battle-turn-name">
            <span>Current turn</span>
            <h2>{current?.name ?? "-"}</h2>
          </div>
          <CombatTimerPanel phase={session.timerPhase} seconds={seconds} />
          {session.timerPhase === "briefing" && (
            <p>Strategy and discussion only. The Warden's 90 seconds have not begun.</p>
          )}
          {session.timerPhase === "expired" && (
            <p>Finish the action or effect already begun. No new movement, attack, Bonus Action, or optional effect.</p>
          )}
          {session.timerPhase === "untimed" && (
            <p>The DM and creatures controlled by the DM are not subject to the player turn timer.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
