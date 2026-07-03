import { useState } from "react";
import { TRANSFORMATION_RESULTS, type TransformationResult } from "@/data/transformation";
import type { HunterCard } from "@/types";

/** The five persistent Transformation results a physical d20 roll can leave on
 * a hunter. Momentary results (Nothing Happens, Blood Lust) resolve at the
 * table and are never stored. */
const PERSISTENT: TransformationResult[] = Object.values(TRANSFORMATION_RESULTS).filter(
  (r) => r.isTransformation,
);

function activeResults(card: HunterCard): TransformationResult[] {
  return (card.activeTransformations ?? []).map((k) => TRANSFORMATION_RESULTS[k]).filter(Boolean);
}

function Bar({ level }: { level: number }) {
  return (
    <div style={{ height: 6, borderRadius: 6, background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ width: `${level * 10}%`, height: "100%", background: "#c9962f", transition: "width 0.2s ease" }} />
    </div>
  );
}

/** Player view — read-only. The Transformation roll happens physically at the
 * table and the DM records the level + results; rests reduce the level. Each
 * active Transformation shows its full rules text ("Lost" stays deliberately
 * unexplained — a table secret). */
export function TransformationStatus({ card }: { card: HunterCard }) {
  const level = card.transformationLevel ?? 0;
  const active = activeResults(card);
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600 }}>Transformation</span>
          <div className="faint" style={{ fontSize: "0.72rem" }}>
            Rolled at the table — the DM records it · rests reduce it
          </div>
        </div>
        <span
          style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", minWidth: 56, textAlign: "center", flex: "none" }}
        >
          {level}
          <span className="faint" style={{ fontSize: "0.9rem" }}> / 10</span>
        </span>
      </div>
      <Bar level={level} />
      {active.map((t, i) => (
        <div
          key={`${t.key}-${i}`}
          className="card"
          style={{ marginTop: 8, padding: 10, borderColor: t.key === "lost" ? "var(--blood-bright)" : "var(--gold-dim)" }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.name}</span>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>{t.text}</p>
        </div>
      ))}
    </div>
  );
}

/** DM control — sets the level directly (the d20 is rolled physically at the
 * table) and records which persistent results came up, duplicates allowed.
 * Reducing the level sheds ALL active Transformations (rest/reduction rule) —
 * announced, never silent. */
export function TransformationEditor({
  card,
  onPatch,
  divider = "bottom",
}: {
  card: HunterCard;
  onPatch: (p: Partial<HunterCard>) => void;
  /** Where the hairline sits: "bottom" among CharacterTrackers rows, "top" among
   * DMCharacterEditor's steppers. */
  divider?: "top" | "bottom";
}) {
  const [note, setNote] = useState<string | null>(null);
  const level = card.transformationLevel ?? 0;
  const active = activeResults(card);

  function setLevel(v: number) {
    const next = Math.max(0, Math.min(10, v));
    if (next === level) return;
    if (next < level) {
      onPatch({ transformationLevel: next, activeTransformations: [] });
      setNote(
        active.length > 0
          ? `Level reduced — all active Transformations fade (${active.length} cleared).`
          : null,
      );
    } else {
      onPatch({ transformationLevel: next });
      setNote(null);
    }
  }

  function add(key: string) {
    onPatch({ activeTransformations: [...(card.activeTransformations ?? []), key] });
    setNote(null);
  }

  function removeAt(i: number) {
    onPatch({ activeTransformations: (card.activeTransformations ?? []).filter((_, idx) => idx !== i) });
  }

  const hairline = "1px solid var(--border)";
  return (
    <div
      style={{
        padding: divider === "top" ? "6px 0" : "8px 0",
        borderTop: divider === "top" ? hairline : undefined,
        borderBottom: divider === "bottom" ? hairline : undefined,
      }}
    >
      <div className="row between" style={{ marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600 }}>Transformation</span>
          <div className="faint" style={{ fontSize: "0.72rem" }}>
            Rolled at the table — you record it · reducing sheds ALL active Transformations
          </div>
        </div>
        <div className="row" style={{ gap: 10, flex: "none" }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 38, padding: 6 }}
            aria-label="decrease Transformation"
            onClick={() => setLevel(level - 1)}
          >
            −
          </button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", minWidth: 56, textAlign: "center" }}>
            {level}
            <span className="faint" style={{ fontSize: "0.9rem" }}> / 10</span>
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 38, padding: 6 }}
            aria-label="increase Transformation"
            onClick={() => setLevel(level + 1)}
          >
            +
          </button>
        </div>
      </div>
      <Bar level={level} />
      {note && (
        <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#c9962f" }}>{note}</p>
      )}
      {active.length > 0 && (
        <div className="chip-row" style={{ marginTop: 8 }}>
          {active.map((t, i) => (
            <span key={`${t.key}-${i}`} className="chip" style={{ fontSize: "0.72rem" }}>
              {t.name}
              <button
                type="button"
                aria-label={`remove ${t.name}`}
                onClick={() => removeAt(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: "0.95rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        className="select"
        value=""
        onChange={(e) => e.target.value && add(e.target.value)}
        style={{ marginTop: 8, padding: "8px 10px", fontSize: "0.88rem" }}
        aria-label="record a rolled Transformation"
      >
        <option value="" disabled>
          Add rolled transformation…
        </option>
        {PERSISTENT.map((r) => (
          <option key={r.key} value={r.key}>
            {r.name}
          </option>
        ))}
      </select>
    </div>
  );
}
