import { getClass } from "@/data/classes";
import { maxHp } from "@/lib/character";
import { usePlayerStore } from "../store/playerStore";
import type { HunterCard } from "@/types";

/** Live, editable play trackers: HP, Madness, Transform. Saved on change. */
export function CharacterTrackers({ card }: { card: HunterCard }) {
  const save = usePlayerStore((s) => s.save);
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities) : 0;
  const hp = card.currentHp ?? hpMax;

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
        tone="hp"
        onChange={(v) => patch({ currentHp: Math.max(0, Math.min(hpMax, v)) })}
      />
      <Tracker
        label="Madness"
        value={card.madness ?? 0}
        tone="madness"
        onChange={(v) => patch({ madness: Math.max(0, v) })}
      />
      <Tracker
        label="Transform"
        value={card.transform ?? 0}
        tone="transform"
        onChange={(v) => patch({ transform: Math.max(0, v) })}
      />
    </div>
  );
}

function Tracker({
  label,
  value,
  max,
  tone,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  tone: "hp" | "madness" | "transform";
  onChange: (v: number) => void;
}) {
  const color =
    tone === "hp" ? "var(--blood-bright)" : tone === "madness" ? "var(--gold)" : "#7c5cff";
  const pct = max && max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="row between" style={{ marginBottom: max ? 6 : 0 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
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
