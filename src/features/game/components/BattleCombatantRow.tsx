import { useMemo, type ChangeEvent } from "react";
import { CONDITIONS, CONDITION_NAME } from "@/data/conditions";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, HunterCard } from "@/types";
import { combatVitals } from "../lib/combatPresentation";

export function BattleCombatantRow({
  combatant,
  position,
  round,
  active,
  characters,
  game,
  canManage,
  disabled,
}: {
  combatant: Combatant;
  position: number;
  round: number;
  active: boolean;
  characters: HunterCard[];
  game: Game;
  canManage: boolean;
  disabled: boolean;
}) {
  const patch = useCombatStore((state) => state.patch);
  const toggleCondition = useCombatStore((state) => state.toggleCondition);
  const vitals = combatVitals(combatant, characters);
  const damagePercent = vitals.maxHp && vitals.damageTaken !== null
    ? Math.min(100, (vitals.damageTaken / vitals.maxHp) * 100)
    : 0;
  const availableConditions = useMemo(
    () => CONDITIONS.filter((condition) => !combatant.conditions.includes(condition.id)),
    [combatant.conditions],
  );

  async function setDamage(value: string) {
    if (vitals.maxHp === null) return;
    const damage = Math.min(vitals.maxHp, Math.max(0, Number.parseInt(value, 10) || 0));
    await patch(game.id, combatant.id, { currentHp: vitals.maxHp - damage });
  }

  function updateInitiative(event: ChangeEvent<HTMLInputElement>) {
    const initiative = Math.min(99, Math.max(-99, Number.parseInt(event.currentTarget.value, 10) || 0));
    event.currentTarget.value = String(initiative);
    if (initiative !== combatant.initiative) void patch(game.id, combatant.id, { initiative });
  }

  function updateArmorClass(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value.trim();
    const ac = value === "" ? null : Math.min(99, Math.max(0, Number.parseInt(value, 10) || 0));
    event.currentTarget.value = ac === null ? "" : String(ac);
    if (ac !== combatant.ac) void patch(game.id, combatant.id, { ac });
  }

  return (
    <article className={active ? "battle-row is-current" : "battle-row"} data-testid={`battle-combatant-${combatant.id}`}>
      <span className="battle-position">{position}</span>
      <div className="battle-name">
        <strong>{combatant.name}</strong>
        <span>{combatant.kind === "monster" ? "Enemy" : "Hunter"}</span>
      </div>
      <strong className="battle-initiative">{combatant.initiative}</strong>
      <div className="battle-damage">
        <strong>{vitals.damageTaken ?? "—"}</strong>
        <span>taken</span>
        {vitals.maxHp !== null && <div className="battle-damage-track" aria-hidden="true"><span style={{ width: `${damagePercent}%` }} /></div>}
      </div>
      <strong className="battle-ac">{vitals.ac ?? "—"}</strong>
      <div className="battle-conditions">
        {combatant.conditions.length === 0 ? <span>None</span> : combatant.conditions.map((conditionId) => {
          const since = combatant.conditionSince?.[conditionId];
          const rounds = since ? Math.max(1, round - since + 1) : null;
          return <span key={conditionId}>{CONDITION_NAME[conditionId] ?? conditionId}{rounds ? ` · ${rounds}r` : ""}</span>;
        })}
      </div>
      {canManage && (
        <div className="battle-row-controls" aria-label={`${combatant.name} DM controls`}>
          <label>Initiative<input aria-label={`${combatant.name} initiative`} type="number" min="-99" max="99" disabled={disabled} defaultValue={combatant.initiative} onBlur={updateInitiative} /></label>
          <label>AC<input key={combatant.ac ?? `base-${vitals.ac ?? "unknown"}`} aria-label={`${combatant.name} AC`} type="number" min="0" max="99" disabled={disabled} defaultValue={combatant.ac ?? vitals.ac ?? ""} onBlur={updateArmorClass} /></label>
          <label>Damage<input key={vitals.damageTaken ?? "unknown"} aria-label={`${combatant.name} damage taken`} type="number" min="0" max={vitals.maxHp ?? undefined} disabled={disabled || vitals.maxHp === null} defaultValue={vitals.damageTaken ?? ""} onBlur={(event) => void setDamage(event.currentTarget.value)} /></label>
          <button type="button" disabled={disabled || vitals.maxHp === null} onClick={() => void setDamage(String((vitals.damageTaken ?? 0) - 1))}>−1</button>
          <button type="button" disabled={disabled || vitals.maxHp === null} onClick={() => void setDamage(String((vitals.damageTaken ?? 0) + 1))}>+1</button>
          <button type="button" disabled={disabled || vitals.maxHp === null} onClick={() => void setDamage(String((vitals.damageTaken ?? 0) + 5))}>+5</button>
          <div className="battle-condition-controls">
            {combatant.conditions.map((conditionId) => <button key={conditionId} type="button" disabled={disabled} onClick={() => void toggleCondition(game.id, combatant, conditionId, round)}>{CONDITION_NAME[conditionId] ?? conditionId} ×</button>)}
            <select aria-label={`Add condition to ${combatant.name}`} value="" disabled={disabled || availableConditions.length === 0} onChange={(event) => { if (event.target.value) void toggleCondition(game.id, combatant, event.target.value, round); }}>
              <option value="">Add condition…</option>
              {availableConditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}
            </select>
          </div>
        </div>
      )}
    </article>
  );
}
