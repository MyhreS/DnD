import { CombatantGlyph } from "./CombatantGlyph";
import { useCombatStore } from "../store/combatStore";
import type { Combatant } from "../types";

function parsed(value: string): number | null {
  if (value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function CombatantSetupRow({ combatant }: { combatant: Combatant }) {
  const update = useCombatStore((s) => s.updateCombatant);
  const remove = useCombatStore((s) => s.removeCombatant);
  const designatedWardenId = useCombatStore((s) => s.session.designatedWardenId);
  const setDesignatedWarden = useCombatStore((s) => s.setDesignatedWarden);

  return (
    <div className="combat-setup-row" data-testid={`setup-${combatant.id}`}>
      <CombatantGlyph combatant={combatant} />
      <div className="combat-setup-identity">
        <strong>{combatant.name}</strong>
        <span>{combatant.kind === "hunter" ? "Hunter" : "Creature"}</span>
      </div>
      <EditableNumber label="Initiative" value={combatant.initiative} onChange={(value) => update(combatant.id, { initiative: value })} />
      <EditableNumber label="AC" value={combatant.armorClass} onChange={(value) => update(combatant.id, { armorClass: value })} />
      <EditableNumber label="Max HP" value={combatant.maxHp} onChange={(value) => update(combatant.id, { maxHp: value, currentHp: value })} min={0} />
      {combatant.isWarden && (
        <label className="combat-warden-choice">
          <input
            type="radio"
            name="designated-warden"
            checked={designatedWardenId === combatant.id}
            onChange={() => setDesignatedWarden(combatant.id)}
          />
          Tactical Command
        </label>
      )}
      <button className="btn btn-ghost btn-sm combat-remove" type="button" onClick={() => remove(combatant.id)} aria-label={`Remove ${combatant.name}`}>
        Remove
      </button>
    </div>
  );
}

function EditableNumber({ label, value, onChange, min }: { label: string; value: number | null; onChange: (value: number | null) => void; min?: number }) {
  return (
    <label className="combat-inline-field">
      <span>{label}</span>
      <input type="number" min={min} value={value ?? ""} onChange={(event) => onChange(parsed(event.target.value))} aria-label={`${label}`} />
    </label>
  );
}

