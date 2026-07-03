import { ARMOR_BY_ID } from "@/data/armor";

/** What toggling the NEXT state means, from the current studded count — the
 * 1-piece and 5-piece AC breakpoints, and the weight-only middle ground. */
function breakpointHint(n: number): string {
  if (n === 0) return "Stud one piece for +1 AC. Pieces 2–4 add only weight — all five give +2 AC.";
  if (n === 1) return "+1 AC. More studded pieces add weight but no extra AC until all five.";
  if (n < 5) return "+1 AC — pieces 2–4 add weight without more AC. Stud five for +2.";
  return "+2 AC — the maximum.";
}

/** Step 4's Studs upgrade: a per-piece "Studded" toggle for each SELECTED
 * Add-on (matching the official sheet's STUDS checkbox per row), a live
 * breakpoint hint, and the Stealth-disadvantage warning once ≥1 is studded.
 * Rendered only while at least one Add-on is worn. */
export function StudsPanel({
  addonIds,
  studdedIds,
  onToggle,
}: {
  /** The currently selected Add-on piece ids (each gets a toggle). */
  addonIds: string[];
  /** The subset of `addonIds` carrying Studs. */
  studdedIds: string[];
  onToggle: (id: string) => void;
}) {
  const n = studdedIds.length;
  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
      <div className="row between" style={{ gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Studs upgrade</span>
        <span className={`pick-counter${n > 0 ? " done" : ""}`}>
          {n} studded · +{n >= 5 ? 2 : n >= 1 ? 1 : 0} AC
        </span>
      </div>
      <p className="faint" style={{ fontSize: "0.8rem", margin: "4px 0 8px" }}>
        Metal studs riveted onto the Add-on pieces you wear — +3 lb per studded
        piece. Tap a piece to stud it.
      </p>
      <div className="chip-row">
        {addonIds.map((id) => {
          const selected = studdedIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`chip selectable${selected ? " selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onToggle(id)}
            >
              {ARMOR_BY_ID[id]?.name ?? id}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: "0.82rem", margin: "8px 0 0" }}>{breakpointHint(n)}</p>
      {n > 0 && (
        <div className="banner banner-warn" style={{ marginTop: 8 }}>
          Studded armor: disadvantage on Dexterity (Stealth) checks to hide or
          move silently.
        </div>
      )}
    </div>
  );
}
