import { useState, type ReactNode, type SelectHTMLAttributes } from "react";
import type { HunterCard, SheetData } from "@/types";

export interface AppSheetModel {
  card: HunterCard;
  data: SheetData;
  readOnly: boolean;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
}

export function sheetText(data: SheetData, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value : "";
}

export function sheetBool(data: SheetData, field: string): boolean {
  return data[field] === true;
}

export function AppSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="appsheet-section" aria-label={title ?? "Character overview"}>
      {title && <header className="appsheet-section-head"><h2>{title}</h2></header>}
      {children}
    </section>
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

export function AppDisclosure({
  title,
  summary,
  aside,
  children,
  defaultOpen = false,
  className = "",
}: {
  title: string;
  summary?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={`appsheet-disclosure ${className}`.trim()}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span className="appsheet-disclosure-heading">
          <b>{title}</b>
          {summary && <span className="appsheet-disclosure-summary">{summary}</span>}
        </span>
        {aside && <span className="appsheet-disclosure-aside">{aside}</span>}
        <span className="appsheet-disclosure-icon" aria-hidden="true" />
      </summary>
      <div className="appsheet-disclosure-content">{children}</div>
    </details>
  );
}

export function AutoReason({ reason }: { reason?: string }) {
  if (!reason) return null;
  return (
    <details className="appsheet-auto-reason">
      <summary aria-label="Why this value is automatic" title="Why this value is automatic">ⓘ</summary>
      <span>{reason}</span>
    </details>
  );
}

export function DerivedValue({ label, value, reason, testId }: {
  label: string;
  value: ReactNode;
  reason?: string;
  testId?: string;
}) {
  return (
    <div className="appsheet-derived" data-testid={testId}>
      <span className="appsheet-field-label">{label}</span>
      <strong>{value === "" || value == null ? "—" : value}</strong>
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
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span><b>{label}</b>{meta && <small>{meta}</small>}</span>
    </label>
  );
}

export function PendingNotice({ children }: { children: ReactNode }) {
  return <div className="appsheet-pending"><span aria-hidden="true">!</span><div>{children}</div></div>;
}

export function NumericStepper({ value, onChange, disabled = false, label, max }: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  max?: number;
}) {
  return (
    <div className="appsheet-stepper compact">
      <button type="button" aria-label={`Decrease ${label}`} disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <output aria-label={label}>{value}</output>
      <button type="button" aria-label={`Increase ${label}`} disabled={disabled || (max != null && value >= max)} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
