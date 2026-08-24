import { NumericStepper } from "../appsheet/appSheetShared";

export function CharacterSheetResourceControl({ label, value, min, max, note, onChange, disabled }: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  note?: string;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return <label className="character-sheet-resource">
    <span>{label}</span>
    <NumericStepper label={label} value={value} min={min} max={max} disabled={disabled} onChange={onChange} />
    {(note || max != null) && <small>{note ?? `Maximum ${max}`}</small>}
  </label>;
}
