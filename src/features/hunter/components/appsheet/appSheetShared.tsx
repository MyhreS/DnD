import { createContext, useContext, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import type { HunterCard, SheetData } from "@/types";
import { ExplainValue } from "../character-sheet/CharacterSheetExplain";
import type { Breakdown } from "../../lib/calculationBreakdowns";

export interface AppSheetModel {
  card: HunterCard;
  data: SheetData;
  readOnly: boolean;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
}

const AppSectionsExpandedContext = createContext(false);
const AppAutoReasonsVisibleContext = createContext(true);

export function AppSectionsExpanded({ children }: { children: ReactNode }) {
  return <AppSectionsExpandedContext.Provider value>{children}</AppSectionsExpandedContext.Provider>;
}

export function AppAutoReasonsHidden({ children }: { children: ReactNode }) {
  return <AppAutoReasonsVisibleContext.Provider value={false}>{children}</AppAutoReasonsVisibleContext.Provider>;
}

export function AppSection({
  title,
  children,
  defaultOpen = false,
  id,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const expanded = useContext(AppSectionsExpandedContext);

  return (
    <details id={id} className="appsheet-section" open={expanded || isOpen} onToggle={(event) => { if (!expanded) setIsOpen(event.currentTarget.open); }}>
      <summary>
        <h2>{title}</h2>
        <span className="appsheet-section-icon" aria-hidden="true" />
      </summary>
      <div className="appsheet-section-content">{children}</div>
    </details>
  );
}

export function AppPanel({ title, aside, children, className = "" }: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`appsheet-panel ${className}`.trim()}>
      <header><h3>{title}</h3>{aside}</header>
      {children}
    </section>
  );
}

export function AutoReason({ reason }: { reason?: string }) {
  const visible = useContext(AppAutoReasonsVisibleContext);
  if (!reason || !visible) return null;
  return (
    <details className="appsheet-auto-reason">
      <summary aria-label="Why this value is automatic" title="Why this value is automatic">ⓘ</summary>
      <span>{reason}</span>
    </details>
  );
}

export function DerivedValue({ label, value, reason, testId, breakdown }: {
  label: string;
  value: ReactNode;
  reason?: string;
  testId?: string;
  /** Tap the value to see how it is calculated. */
  breakdown?: Breakdown | null;
}) {
  const shown = value === "" || value == null ? "—" : value;
  return (
    <div className="appsheet-derived" data-testid={testId}>
      <span className="appsheet-field-label">{label}</span>
      <strong>{breakdown ? <ExplainValue breakdown={breakdown}>{shown}</ExplainValue> : shown}</strong>
      <AutoReason reason={reason} />
    </div>
  );
}

export function DecisionField({ label, help, children }: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="appsheet-decision">
      <span className="appsheet-field-label">{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  );
}

export function AppSelect({ label, help, children, ...props }: {
  label: string;
  help?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <DecisionField label={label} help={help}>
      <select {...props}>{children}</select>
    </DecisionField>
  );
}

export function ChoiceToggle({ checked, disabled, label, meta, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  meta?: string;
  onChange: () => void;
}) {
  return (
    <label className={`appsheet-choice ${checked ? "selected" : ""}`}>
      <input data-haptic type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span><b>{label}</b>{meta && <small>{meta}</small>}</span>
    </label>
  );
}

export function PendingNotice({ children }: { children: ReactNode }) {
  return <div className="appsheet-pending"><span aria-hidden="true">!</span><div>{children}</div></div>;
}

export function NumericStepper({ value, onChange, disabled = false, label, min = 0, max }: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="appsheet-stepper compact">
      <button data-haptic type="button" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output aria-label={label}>{value}</output>
      <button data-haptic type="button" aria-label={`Increase ${label}`} disabled={disabled || (max != null && value >= max)} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
