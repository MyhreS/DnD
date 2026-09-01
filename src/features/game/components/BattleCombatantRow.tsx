import { useMemo, useState } from "react";
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
  encounterCombatants,
}: {
  combatant: Combatant;
  position: number;
  round: number;
  active: boolean;
  characters: HunterCard[];
  game: Game;
  canManage: boolean;
  disabled: boolean;
  encounterCombatants: Combatant[];
}) {
  const patch = useCombatStore((state) => state.patch);
  const remove = useCombatStore((state) => state.remove);
  const resetMonster = useCombatStore((state) => state.resetMonster);
  const toggleCondition = useCombatStore((state) => state.toggleCondition);
  const vitals = combatVitals(combatant, characters);
  const healthPercent = vitals.maxHp && vitals.currentHp !== null
    ? Math.min(100, Math.max(0, (vitals.currentHp / vitals.maxHp) * 100))
    : 0;
  const availableConditions = useMemo(
    () => CONDITIONS.filter((condition) => !combatant.conditions.includes(condition.id)),
    [combatant.conditions],
  );
  const [menuOpen, setMenuOpen] = useState(false);

  function runMenuAction(action: () => void | Promise<unknown>) {
    setMenuOpen(false);
    void action();
  }

  async function setDamage(value: string) {
    if (vitals.maxHp === null) return;
    // Damage is deliberately NOT clamped to the HP maximum: Instant Death keys
    // off the damage remaining after a Hunter drops to 0, so `currentHp` must
    // be allowed to go negative for the DM to see it. The health bar clamps at
    // 0% on its own.
    const damage = Math.max(0, Number.parseInt(value, 10) || 0);
    await patch(game.id, combatant.id, {
      currentHp: vitals.maxHp - damage,
      ...(combatant.kind === "monster" ? { defeated: damage >= vitals.maxHp } : {}),
    });
  }

  function changeInitiative(delta: number) {
    setInitiative(String(combatant.initiative + delta));
  }

  function setInitiative(value: string) {
    const initiative = Math.min(99, Math.max(-99, Number.parseInt(value, 10) || 0));
    if (initiative !== combatant.initiative) void patch(game.id, combatant.id, { initiative });
  }

  function changeArmorClass(delta: number) {
    const current = combatant.ac ?? vitals.ac ?? 0;
    const ac = Math.min(99, Math.max(0, current + delta));
    if (ac !== current) void patch(game.id, combatant.id, { ac });
  }

  const dead = combatant.kind === "monster" && (combatant.defeated === true || (vitals.currentHp !== null && vitals.currentHp <= 0));

  return (
    <article
      className={`battle-row${canManage ? " has-actions" : ""}${combatant.kind === "monster" ? " is-monster" : ""}${active ? " is-current" : ""}${dead ? " is-dead" : ""}`}
      data-testid={`battle-combatant-${combatant.id}`}
      aria-current={active ? "true" : undefined}
    >
      <header className="battle-row-header">
        <span className="battle-position" aria-label={`Turn position ${position}`}>{position}</span>
        <div className="battle-name">
          <strong>{combatant.name}</strong>
          <span>{combatant.kind === "monster" ? (dead ? "Enemy · dead" : "Enemy") : `Hunter${vitals.speed !== null ? ` · ${vitals.speed} ft speed` : ""}`}</span>
        </div>
        {active && <span className="battle-playing"><i aria-hidden="true" /> Playing</span>}
        {canManage && (
          <div className="battle-row-actions">
            <details className="battle-more" open={menuOpen} onToggle={(event) => setMenuOpen(event.currentTarget.open)}>
              <summary aria-label={`More options for ${combatant.name}`}>•••</summary>
              <div className="battle-more-menu">
                {combatant.kind === "monster" && <>
                  {vitals.maxHp !== null && <button
                    className="battle-death-toggle"
                    type="button"
                    aria-label={dead ? `Revive ${combatant.name}` : `Kill ${combatant.name}`}
                    aria-pressed={dead}
                    disabled={disabled}
                    onClick={() => runMenuAction(() => patch(game.id, combatant.id, { currentHp: dead ? 1 : 0, defeated: !dead }))}
                  >{dead ? "Revive" : "Kill enemy"}</button>}
                  <button type="button" disabled={disabled || dead} onClick={() => runMenuAction(() => setDamage(String((vitals.damageTaken ?? 0) + 5)))}>Add 5 damage</button>
                  <button type="button" aria-pressed={combatant.revealHp === true} disabled={disabled} onClick={() => runMenuAction(() => patch(game.id, combatant.id, { revealHp: combatant.revealHp !== true }))}>{combatant.revealHp === true ? "Hide HP" : "Show HP"}</button>
                  <button type="button" aria-pressed={combatant.revealStats === true} disabled={disabled} onClick={() => runMenuAction(() => patch(game.id, combatant.id, { revealStats: combatant.revealStats !== true }))}>{combatant.revealStats === true ? "Hide stats" : "Show stats"}</button>
                  <button type="button" disabled={disabled} onClick={() => runMenuAction(() => resetMonster(game.id, combatant.id))}>Reset stats</button>
                </>}
                <button className="battle-remove" type="button" disabled={disabled} onClick={() => runMenuAction(() => remove(game.id, combatant.id, game, encounterCombatants))}>Remove {combatant.kind === "monster" ? "enemy" : "Hunter"}</button>
              </div>
            </details>
          </div>
        )}
      </header>

      <div className="battle-card-body">
        <div className="battle-health">
          <div className="battle-health-heading">
            <span>Hit points</span>
            {vitals.currentHp !== null && vitals.maxHp !== null
              ? <strong aria-label={`${combatant.name} hit points ${vitals.currentHp} of ${vitals.maxHp}`}><b>{vitals.currentHp}</b> / {vitals.maxHp}</strong>
              : <strong>Hidden</strong>}
          </div>
          {vitals.maxHp !== null
            ? <div className="battle-health-track" role="progressbar" aria-label={`${combatant.name} health`} aria-valuemin={0} aria-valuemax={vitals.maxHp} aria-valuenow={Math.max(0, vitals.currentHp ?? 0)}><span style={{ width: `${healthPercent}%` }} /></div>
            : <div className="battle-health-track is-hidden" aria-hidden="true"><span /></div>}
          <div className="battle-damage">
            <div className="battle-damage-readout"><strong aria-label={`${combatant.name} damage taken ${vitals.damageTaken ?? "unknown"}`}>{vitals.damageTaken ?? "—"}</strong><span>damage</span></div>
            {canManage && <div className="battle-health-actions">
              <button type="button" aria-label={`Damage ${combatant.name} by 1`} disabled={disabled || vitals.maxHp === null || dead} onClick={() => void setDamage(String((vitals.damageTaken ?? 0) + 1))}>− HP</button>
              <button type="button" aria-label={`Heal ${combatant.name} by 1`} disabled={disabled || vitals.damageTaken === null || vitals.damageTaken <= 0} onClick={() => void setDamage(String((vitals.damageTaken ?? 0) - 1))}>+ HP</button>
            </div>}
          </div>
        </div>

        <div className="battle-stat battle-initiative">
          <span>Initiative</span>
          <div className="battle-value">
            {canManage && <button type="button" aria-label={`Decrease ${combatant.name} initiative`} disabled={disabled || combatant.initiative <= -99} onClick={() => changeInitiative(-1)}>−</button>}
            {canManage
              ? <input
                  key={combatant.initiative}
                  type="number"
                  min="-99"
                  max="99"
                  defaultValue={combatant.initiative}
                  aria-label={`Set ${combatant.name} initiative`}
                  disabled={disabled}
                  onBlur={(event) => setInitiative(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                />
              : <strong aria-label={`${combatant.name} initiative ${combatant.initiative}`}>{combatant.initiative}</strong>}
            {canManage && <button type="button" aria-label={`Increase ${combatant.name} initiative`} disabled={disabled || combatant.initiative >= 99} onClick={() => changeInitiative(1)}>+</button>}
          </div>
        </div>

        <div className="battle-stat battle-ac">
          <span>Armor class</span>
          <div className="battle-value">
            {canManage && <button type="button" aria-label={`Decrease ${combatant.name} armor class`} disabled={disabled || (vitals.ac ?? 0) <= 0} onClick={() => changeArmorClass(-1)}>−</button>}
            <strong aria-label={`${combatant.name} armor class ${vitals.ac ?? "unknown"}`}>{vitals.ac ?? "—"}</strong>
            {canManage && <button type="button" aria-label={`Increase ${combatant.name} armor class`} disabled={disabled || (vitals.ac ?? 0) >= 99} onClick={() => changeArmorClass(1)}>+</button>}
          </div>
        </div>
      </div>

      <div className="battle-conditions">
        <span className="battle-conditions-label">Conditions</span>
        {combatant.conditions.length === 0 ? <span className="battle-no-conditions">None</span> : combatant.conditions.map((conditionId) => {
          const since = combatant.conditionSince?.[conditionId];
          const rounds = since ? Math.max(1, round - since + 1) : null;
          const label = `${CONDITION_NAME[conditionId] ?? conditionId}${rounds ? ` · ${rounds}r` : ""}`;
          return canManage
            ? <button className="battle-condition" key={conditionId} type="button" aria-label={`Remove ${CONDITION_NAME[conditionId] ?? conditionId} from ${combatant.name}`} disabled={disabled} onClick={() => void toggleCondition(game.id, combatant, conditionId, round)}>{label}<span aria-hidden="true">×</span></button>
            : <span key={conditionId}>{label}</span>;
        })}
        {canManage && (
          <select aria-label={`Add condition to ${combatant.name}`} value="" disabled={disabled || availableConditions.length === 0} onChange={(event) => { if (event.target.value) void toggleCondition(game.id, combatant, event.target.value, round); }}>
            <option value="">+ Condition</option>
            {availableConditions.map((condition) => <option key={condition.id} value={condition.id}>{condition.name}</option>)}
          </select>
        )}
      </div>
    </article>
  );
}
