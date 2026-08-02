import type { HunterCard } from "@/types";
import { AddCombatantForm } from "./AddCombatantForm";
import { CombatantSetupRow } from "./CombatantSetupRow";
import { useCombatStore } from "../store/combatStore";

export function CombatSetup({ hunters }: { hunters: HunterCard[] }) {
  const session = useCombatStore((s) => s.session);
  const setTitle = useCombatStore((s) => s.setTitle);
  const importHunters = useCombatStore((s) => s.importHunters);
  const startCombat = useCombatStore((s) => s.startCombat);
  const clearCombat = useCombatStore((s) => s.clearCombat);
  const wardens = session.combatants.filter((c) => c.isWarden);
  const importable = hunters.filter((card) => !session.combatants.some((c) => c.id === `hunter-${card.uid}`));

  return (
    <div className="combat-control-stack">
      <section className="combat-section">
        <div className="field">
          <label htmlFor="combat-title">Encounter name</label>
          <input id="combat-title" className="input" value={session.title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        {importable.length > 0 && (
          <button className="btn btn-ghost" type="button" onClick={() => importHunters(importable)}>
            Import party ({importable.length})
          </button>
        )}
      </section>

      <section className="combat-section">
        <h2>Add combatants</h2>
        <AddCombatantForm />
      </section>

      <section className="combat-section">
        <div className="row between">
          <h2>Initiative order</h2>
          <span className="muted">{session.combatants.length} combatants</span>
        </div>
        {session.combatants.length === 0 ? (
          <p className="combat-empty">Import the party or add a hunter or creature to begin.</p>
        ) : (
          <div className="combat-setup-list">
            {session.combatants.map((combatant) => <CombatantSetupRow key={combatant.id} combatant={combatant} />)}
          </div>
        )}
        {wardens.length > 1 && (
          <p className="combat-note">Multiple Wardens detected. Choose the one whose Tactical Command pauses the clock.</p>
        )}
      </section>

      <div className="combat-primary-actions">
        <button className="btn btn-primary" type="button" disabled={!session.combatants.length} onClick={startCombat} data-testid="start-combat">
          Start combat
        </button>
        {session.combatants.length > 0 && (
          <button className="btn btn-ghost" type="button" onClick={() => window.confirm("Clear the entire encounter?") && clearCombat()}>
            Clear encounter
          </button>
        )}
      </div>
    </div>
  );
}

