import type { ReactNode } from "react";

/** A compact −/value/+ control for one battle number (initiative, armor class).
 * The value can optionally be typed directly; read-only viewers see the number. */
export function BattleStepper({
  className,
  icon,
  label,
  name,
  noun,
  value,
  min,
  max,
  canManage,
  disabled,
  editable = false,
  onChange,
}: {
  className: string;
  icon: ReactNode;
  label: string;
  name: string;
  noun: string;
  value: number | null;
  min: number;
  max: number;
  canManage: boolean;
  disabled: boolean;
  editable?: boolean;
  onChange: (value: number) => void;
}) {
  const current = value ?? 0;
  function commit(raw: string) {
    const next = Math.min(max, Math.max(min, Number.parseInt(raw, 10) || 0));
    if (next !== current) onChange(next);
  }

  return (
    <div className={`battle-stat ${className}`}>
      <span className="battle-stat-label"><span className="battle-stat-icon" aria-hidden="true">{icon}</span>{label}</span>
      <div className="battle-stepper-value">
        {canManage && <button type="button" aria-label={`Decrease ${name} ${noun}`} disabled={disabled || current <= min} onClick={() => onChange(current - 1)}>−</button>}
        {canManage && editable
          ? <input
              key={current}
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              defaultValue={current}
              aria-label={`Set ${name} ${noun}`}
              disabled={disabled}
              onBlur={(event) => commit(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
            />
          : <strong aria-label={`${name} ${noun} ${value ?? "unknown"}`}>{value ?? "—"}</strong>}
        {canManage && <button type="button" aria-label={`Increase ${name} ${noun}`} disabled={disabled || current >= max} onClick={() => onChange(current + 1)}>+</button>}
      </div>
    </div>
  );
}
