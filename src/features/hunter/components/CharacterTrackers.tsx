import { getClass } from "@/data/classes";
import { maxHp, maxSanity } from "@/lib/character";
import { usePlayerStore } from "../store/playerStore";
import type { HunterCard } from "@/types";

/** Live, editable play trackers: HP, Sanity, Blood Tinge. Saved on change. */
export function CharacterTrackers({ card }: { card: HunterCard }) {
  const save = usePlayerStore((s) => s.save);
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  const hp = card.currentHp ?? hpMax;
  const sanMax = klass ? maxSanity(klass, card.abilities, card.level) : 0;
  const san = card.sanity ?? sanMax;

  function patch(p: Partial<HunterCard>) {
    void save({ ...card, ...p });
  }

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Vitals · tracked in play</p>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: "auto" }}
          onClick={() => patch({ currentHp: hpMax })}
        >
          Long rest
        </button>
      </div>

      <Tracker
        label="Hit Points"
        value={hp}
        max={hpMax}
        color="var(--blood-bright)"
        onChange={(v) => patch({ currentHp: Math.max(0, Math.min(hpMax, v)) })}
      />
      <Tracker
        label="Sanity"
        sub="Suffer Madness → lose Sanity"
        value={san}
        max={sanMax}
        color="#7c5cff"
        onChange={(v) => patch({ sanity: Math.max(0, Math.min(sanMax, v)) })}
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
