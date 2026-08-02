import { useState, type FormEvent } from "react";
import { useCombatStore } from "../store/combatStore";
import type { CombatantKind } from "../types";

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AddCombatantForm({ onAdded }: { onAdded?: () => void }) {
  const addCombatant = useCombatStore((s) => s.addCombatant);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CombatantKind>("creature");
  const [initiative, setInitiative] = useState("");
  const [armorClass, setArmorClass] = useState("");
  const [maxHp, setMaxHp] = useState("");
  const [isWarden, setIsWarden] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addCombatant({
      name: name.trim(),
      kind,
      initiative: optionalNumber(initiative),
      armorClass: optionalNumber(armorClass),
      maxHp: optionalNumber(maxHp),
      isWarden: kind === "hunter" && isWarden,
    });
    setName("");
    setInitiative("");
    setArmorClass("");
    setMaxHp("");
    setIsWarden(false);
    onAdded?.();
  };

  return (
    <form className="combat-add-form" onSubmit={submit} data-testid="add-combatant-form">
      <div className="field combat-name-field">
        <label htmlFor="combatant-name">Name</label>
        <input
          id="combatant-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Hunter or creature"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="combatant-kind">Type</label>
        <select
          id="combatant-kind"
          className="select"
          value={kind}
          onChange={(event) => setKind(event.target.value as CombatantKind)}
        >
          <option value="hunter">Hunter</option>
          <option value="creature">Creature</option>
        </select>
      </div>
      <NumberField id="combatant-initiative" label="Initiative" value={initiative} setValue={setInitiative} />
      <NumberField id="combatant-ac" label="AC" value={armorClass} setValue={setArmorClass} />
      <NumberField id="combatant-hp" label="Max HP" value={maxHp} setValue={setMaxHp} min="0" />
      {kind === "hunter" && (
        <label className="combat-check">
          <input type="checkbox" checked={isWarden} onChange={(event) => setIsWarden(event.target.checked)} />
          Warden
        </label>
      )}
      <button className="btn btn-primary combat-add-button" type="submit">Add combatant</button>
    </form>
  );
}

function NumberField({
  id,
  label,
  value,
  setValue,
  min,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (value: string) => void;
  min?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" type="number" min={min} value={value} onChange={(event) => setValue(event.target.value)} />
    </div>
  );
}
