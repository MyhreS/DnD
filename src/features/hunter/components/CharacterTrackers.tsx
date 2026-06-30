import { getClass } from "@/data/classes";
import { maxHp, maxSanity } from "@/lib/character";
import { usePlayerStore } from "../store/playerStore";
import type { HunterCard } from "@/types";

/** Live, editable play trackers: HP, Sanity (with derived Madness),
 * Transformation, Blood Tinge. Saved on change. */
export function CharacterTrackers({
  card,
  onPatch,
}: {
  card: HunterCard;
  /** When provided (e.g. the DM playing as this hunter), edits route here
   * instead of the owner's playerStore — so the owner's own selection isn't
   * clobbered. */
  onPatch?: (p: Partial<HunterCard>) => void;
}) {
  const save = usePlayerStore((s) => s.save);
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  // Clamp the displayed value: a saved HP/Sanity can exceed a max that later
  // dropped (e.g. a CON/WIS change), which would render an over-100% bar.
  const hp = Math.min(hpMax, card.currentHp ?? hpMax);
  const sanMax = klass ? maxSanity(klass, card.abilities, card.level) : 0;
  const san = Math.min(sanMax, card.sanity ?? sanMax);

  function patch(p: Partial<HunterCard>) {
    if (onPatch) onPatch(p);
    else void save({ ...card, ...p });
  }

  return (
    <div className="card">
      <p className="eyebrow" style={{ margin: "0 0 10px" }}>Vitals · tracked in play</p>

      <Tracker
        label="Hit Points"
        value={hp}
        max={hpMax}
        color="var(--blood-bright)"
        onChange={(v) => patch({ currentHp: Math.max(0, Math.min(hpMax, v)) })}
      />
      <Tracker
        label="Sanity"
        sub={`Madness ${Math.max(0, sanMax - san)}`}
        value={san}
        max={sanMax}
        color="#7c5cff"
        onChange={(v) => patch({ sanity: Math.max(0, Math.min(sanMax, v)) })}
      />
      <Tracker
        label="Transformation"
        sub="Short rest −1 · Long rest clears all"
        value={card.transformationLevel ?? 0}
        color="#c9962f"
        onChange={(v) => patch({ transformationLevel: Math.max(0, v) })}
      />

      <div className="row between" style={{ padding: "10px 0 2px" }}>
        <div>
          <span style={{ fontWeight: 600 }}>Blood Tinge</span>
          <div className="faint" style={{ fontSize: "0.74rem" }}>Heroic inspiration</div>
        </div>
        <button
          type="button"
          className={`btn btn-sm${card.bloodTinge ? " btn-primary" : " btn-ghost"}`}
          style={{ width: "auto", minWidth: 84 }}
          aria-pressed={!!card.bloodTinge}
          onClick={() => patch({ bloodTinge: !card.bloodTinge })}
        >
          {card.bloodTinge ? "● Held" : "○ Spend"}
        </button>
      </div>

      {hp <= 0 && (
        <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          {card.deathPending ? (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              <strong className="blood">Fallen.</strong> Awaiting the DM to confirm your hunter's death.
            </p>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: "0.9rem" }}>
                <strong className="blood">0 Hit Points.</strong> If your hunter has truly fallen, confirm
                their death — the DM still has to verify it.
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--blood-bright)", width: "auto" }}
                onClick={() => patch({ deathPending: true })}
              >
                Confirm my hunter's death
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Tracker({
  label,
  sub,
  value,
  max,
  color,
  onChange,
}: {
  label: string;
  sub?: string;
  value: number;
  max?: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const pct = max && max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="row between" style={{ marginBottom: max ? 6 : 0 }}>
        <div>
          <span style={{ fontWeight: 600 }}>{label}</span>
          {sub && <div className="faint" style={{ fontSize: "0.72rem" }}>{sub}</div>}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 38, padding: 6 }} onClick={() => onChange(value - 1)} aria-label={`decrease ${label}`}>−</button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", minWidth: 56, textAlign: "center" }}>
            {value}{max ? <span className="faint" style={{ fontSize: "0.9rem" }}> / {max}</span> : null}
          </span>
          <button className="btn btn-ghost btn-sm" style={{ width: 38, padding: 6 }} onClick={() => onChange(value + 1)} aria-label={`increase ${label}`}>+</button>
        </div>
      </div>
      {max ? (
        <div style={{ height: 6, borderRadius: 6, background: "var(--bg)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.2s ease" }} />
        </div>
      ) : null}
    </div>
  );
}
