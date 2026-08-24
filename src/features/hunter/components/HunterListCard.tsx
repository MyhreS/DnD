import type { HunterCard } from "@/types";
import { cardClassName, sheetVitals } from "../lib/papersheet";

/** A neutral roster card. Class art and calculated armor were removed with the
 * superseded class/equipment sources; only values recorded on the current
 * character sheet are shown. */
export function HunterListCard({
  card,
  campaignName,
  onOpen,
  onEdit,
  onDelete,
}: {
  card: HunterCard;
  campaignName?: string | null;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const className = cardClassName(card);
  const vitals = sheetVitals(card.sheet);

  return (
    <div className="card card-hover" style={{ position: "relative", overflow: "hidden" }}>
      <button
        type="button"
        aria-label={`Open ${card.name || "unnamed hunter"}`}
        onClick={onOpen}
        style={{ position: "absolute", inset: 0, zIndex: 1, border: 0, borderRadius: "inherit", background: "transparent", cursor: "pointer" }}
      />
      <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Character sheet</p>
          <div style={{ marginTop: 3, fontFamily: "var(--font-display)", fontSize: "1.18rem", fontWeight: 600 }}>
            {card.name || "Unnamed hunter"}
          </div>
          <div className="hunter-list-card-meta">
            {className && <span>{className}</span>}
            <span className="hunter-list-card-level">Level {card.level}</span>
            {campaignName && <span className="hunter-list-card-campaign">in {campaignName}</span>}
          </div>
        </div>
        <div className="chip-row" style={{ justifyContent: "flex-end" }}>
          {vitals.ac !== null && <span className="chip">AC {vitals.ac}</span>}
          {vitals.hpCur !== null && <span className="chip">HP {vitals.hpCur}{vitals.hpMax !== null ? `/${vitals.hpMax}` : ""}</span>}
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="row" style={{ position: "relative", zIndex: 2, gap: 8, marginTop: 14 }}>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={onEdit ?? onOpen}>
            {onEdit ? "Edit character" : "View character"}
          </button>
          {onDelete && <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", color: "var(--red, #b54a4a)" }} onClick={onDelete}>Delete character</button>}
        </div>
      )}
    </div>
  );
}
