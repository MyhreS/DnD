import { useState } from "react";
import { COMBAT_CONDITIONS } from "../data/combatConditions";
import { useCombatStore } from "../store/combatStore";
import type { Combatant } from "../types";
import { CombatantGlyph } from "./CombatantGlyph";

export function CombatantControlRow({ combatant, active }: { combatant: Combatant; active: boolean }) {
  const adjustHp = useCombatStore((s) => s.adjustHp);
  const toggleCondition = useCombatStore((s) => s.toggleCondition);
  const removeCombatant = useCombatStore((s) => s.removeCombatant);
  const [condition, setCondition] = useState("");
  const conditionOptionsId = `combat-condition-options-${combatant.id}`;
  const damageTaken =
    combatant.maxHp !== null && combatant.currentHp !== null
      ? Math.max(0, combatant.maxHp - combatant.currentHp)
      : null;

  const addCondition = () => {
    const value = condition.trim();
    if (!value || combatant.conditions.includes(value)) return;
    toggleCondition(combatant.id, value);
    setCondition("");
  };

  return (
    <details className={`combat-control-row${active ? " is-active" : ""}`} open={active} data-testid={`combatant-${combatant.name}`}>
      <summary>
        <CombatantGlyph combatant={combatant} size={44} />
        <span className="combat-control-name">
          <strong>{combatant.name}</strong>
          <span>Initiative {combatant.initiative ?? "-"} · AC {combatant.armorClass ?? "-"}</span>
        </span>
        <span className="combat-control-hp">
          <strong>{combatant.currentHp ?? "-"}/{combatant.maxHp ?? "-"}</strong>
          <span>{damageTaken === null ? "HP unknown" : `${damageTaken} damage`}</span>
        </span>
      </summary>
      <div className="combat-control-details">
        {combatant.currentHp !== null && (
          <div className="combat-hp-controls" aria-label={`${combatant.name} hit points`}>
            <button type="button" onClick={() => adjustHp(combatant.id, -5)} aria-label={`Deal 5 damage to ${combatant.name}`}>-5</button>
            <button type="button" onClick={() => adjustHp(combatant.id, -1)} aria-label={`Deal 1 damage to ${combatant.name}`}>-1</button>
            <span>{combatant.currentHp} HP</span>
            <button type="button" onClick={() => adjustHp(combatant.id, 1)} aria-label={`Heal ${combatant.name} by 1`}>+1</button>
            <button type="button" onClick={() => adjustHp(combatant.id, 5)} aria-label={`Heal ${combatant.name} by 5`}>+5</button>
          </div>
        )}

        <div className="combat-condition-list">
          {combatant.conditions.length === 0 ? (
            <span className="muted">No conditions</span>
          ) : combatant.conditions.map((item) => (
            <button type="button" key={item} onClick={() => toggleCondition(combatant.id, item)} title="Remove condition">
              {item} ×
            </button>
          ))}
        </div>
        <div className="combat-condition-add">
          <input
            className="input"
            list={conditionOptionsId}
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCondition();
              }
            }}
            placeholder="Add condition"
            aria-label={`Add condition to ${combatant.name}`}
          />
          <datalist id={conditionOptionsId}>
            {COMBAT_CONDITIONS.map((item) => <option key={item} value={item} />)}
          </datalist>
          <button className="btn btn-ghost btn-sm" type="button" onClick={addCondition}>Add</button>
        </div>
        {!active && (
          <button className="combat-delete-link" type="button" onClick={() => window.confirm(`Remove ${combatant.name}?`) && removeCombatant(combatant.id)}>
            Remove from combat
          </button>
        )}
      </div>
    </details>
  );
}
