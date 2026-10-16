import { useState } from "react";
import type { CombatVitals } from "../lib/combatPresentation";

/** Hit points for one battle row: the bar and numbers for everyone, plus an
 * amount box with Damage / Heal for the DM. An empty box means 1. */
export function BattleHealthCell({
  name,
  vitals,
  canManage,
  disabled,
  dead,
  onSetDamage,
}: {
  name: string;
  vitals: CombatVitals;
  canManage: boolean;
  disabled: boolean;
  dead: boolean;
  onSetDamage: (damage: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const known = vitals.currentHp !== null && vitals.maxHp !== null;
  const percent = known && vitals.maxHp
    ? Math.min(100, Math.max(0, ((vitals.currentHp ?? 0) / vitals.maxHp) * 100))
    : 0;
  const taken = vitals.damageTaken ?? 0;
  // Unknown max HP (a DM-side tally exists but no maximum): damage still counts.
  const tallyOnly = vitals.maxHp === null && vitals.damageTaken !== null;
  const canDamage = vitals.maxHp !== null || tallyOnly;
  const step = Math.max(1, Number.parseInt(amount, 10) || 1);
  const state = !known ? "unknown" : percent <= 0 ? "down" : percent < 34 ? "critical" : percent < 67 ? "wounded" : "healthy";

  function apply(direction: 1 | -1) {
    onSetDamage(Math.max(0, taken + direction * step));
    setAmount("");
  }

  return (
    <div className={`battle-health is-${state}`}>
      <div className="battle-health-numbers">
        {known
          ? <strong aria-label={`${name} hit points ${vitals.currentHp} of ${vitals.maxHp}`}><b>{vitals.currentHp}</b><span>/ {vitals.maxHp} HP</span></strong>
          : <strong className="is-hidden">{tallyOnly ? "HP unknown" : "HP hidden"}</strong>}
        <span className="battle-damage-readout"><b aria-label={`${name} damage taken ${vitals.damageTaken ?? "unknown"}`}>{vitals.damageTaken ?? "—"}</b> <span>damage</span></span>
      </div>
      {vitals.maxHp !== null
        ? <div className="battle-health-track" role="progressbar" aria-label={`${name} health`} aria-valuemin={0} aria-valuemax={vitals.maxHp} aria-valuenow={Math.max(0, vitals.currentHp ?? 0)}><span style={{ width: `${percent}%` }} /></div>
        : <div className="battle-health-track is-hidden" aria-hidden="true"><span /></div>}
      {canManage && (
        <div className="battle-health-actions">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="1"
            value={amount}
            aria-label={`Amount for ${name}`}
            disabled={disabled || !canDamage}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !dead) apply(1); }}
          />
          <button className="is-damage" type="button" data-haptic="light" aria-label={`Damage ${name}`} disabled={disabled || !canDamage || dead} onClick={() => apply(1)}>Damage</button>
          <button className="is-heal" type="button" data-haptic="light" aria-label={`Heal ${name}`} disabled={disabled || vitals.damageTaken === null || taken <= 0} onClick={() => apply(-1)}>Heal</button>
        </div>
      )}
    </div>
  );
}
