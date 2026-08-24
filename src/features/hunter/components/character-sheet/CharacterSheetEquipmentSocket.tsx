export type EquipmentGlyph = "armor" | "weapon" | "storage" | "gear" | "empty";

function SlotGlyph({ kind }: { kind: EquipmentGlyph }) {
  if (kind === "empty") return <span className="character-sheet-slot-plus">+</span>;
  return <svg viewBox="0 0 32 32" aria-hidden="true">
    {kind === "armor" && <path d="M7 8 12 4h8l5 4-3 5v14H10V13L7 8Zm5-3 4 4 4-4M13 14h6M13 19h6" />}
    {kind === "weapon" && <path d="m7 26 7-7m-2-2L24 5l3 3-12 12m-4 3-2-2m10-12 4 4" />}
    {kind === "storage" && <path d="M6 11h20v16H6V11Zm4 0V8a6 6 0 0 1 12 0v3m-6 6v5m-3-2h6" />}
    {kind === "gear" && <><circle cx="16" cy="16" r="10" /><path d="M16 10v12m-6-6h12" /></>}
  </svg>;
}

export function CharacterSheetEquipmentSocket({
  label,
  name,
  detail,
  kind = "empty",
  disabled,
  onClick,
  compact = false,
}: {
  label?: string;
  name?: string;
  detail?: string;
  kind?: EquipmentGlyph;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const empty = !name;
  return <button
    type="button"
    className={`character-sheet-equipment-socket${empty ? " is-empty" : " is-filled"}${compact ? " is-compact" : ""}`}
    disabled={disabled}
    onClick={onClick}
  >
    <span className="character-sheet-slot-glyph"><SlotGlyph kind={empty ? "empty" : kind} /></span>
    <span className="character-sheet-slot-copy">
      {label && <small>{label}</small>}
      <strong>{name ?? "Add item"}</strong>
      {detail && <em>{detail}</em>}
    </span>
    <span className="character-sheet-slot-chevron" aria-hidden="true">›</span>
  </button>;
}
