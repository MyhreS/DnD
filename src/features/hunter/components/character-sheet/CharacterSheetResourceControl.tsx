import type { ReactNode } from "react";
import { NumericStepper } from "../appsheet/appSheetShared";

export function CharacterSheetResourceControl({ label, labelNode, value, min, max, note, onChange, disabled }: {
  label: string;
  /** Shown instead of `label` (e.g. with a tappable value); `label` still names the stepper. */
  labelNode?: ReactNode;
  value: number;
  min?: number;
  max?: number;
  note?: ReactNode;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return <label className="character-sheet-resource">
    <span>{labelNode ?? label}</span>
    <NumericStepper label={label} value={value} min={min} max={max} disabled={disabled} onChange={onChange} />
    {(note || max != null) && <small>{note ?? `Maximum ${max}`}</small>}
  </label>;
}
