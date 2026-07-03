import { useState } from "react";
import type { AbilityScores, HunterClass, LevelFeature } from "@/types";
import { getSubclass } from "@/data/classes";
import { formatModifier } from "@/data/abilities";
import {
  maxHp,
  maxSanity,
  proficiencyBonus,
  subclassDisplayName,
  ZEALOT_ID,
} from "@/lib/character";

interface Props {
  klass: HunterClass;
  subclassId: string | null;
  abilities: AbilityScores;
  /** The level the hunter is actually being built/saved at (slider default). */
  startLevel: number;
}

/** Read-only sandbox on the review step: slide through levels 1–20 and see
 * what this hunter becomes — HP, proficiency, sanity, the class-table columns
 * and the features gained. Pure preview: it never touches the card. */
export function ProgressionPreview({ klass, subclassId, abilities, startLevel }: Props) {
  const [lvl, setLvl] = useState(() => Math.max(1, Math.min(20, startLevel)));

  const row = klass.progression.find((r) => r.level === lvl);
  const sub = getSubclass(klass.id, subclassId);
  const zealot = subclassId === ZEALOT_ID;
  const pathName = subclassDisplayName(sub?.name, subclassId);

  // Burn the Book: the Zealot keeps NO Deepcaller class features — the
  // subclass list IS the feature list (mirrors FeaturesSection). Everyone
  // else stacks class + subclass features.
  const gained: (LevelFeature & { from: string })[] = [
    ...(zealot ? [] : (klass.features ?? []).filter((f) => f.level === lvl)).map((f) => ({
      ...f,
      from: klass.name,
    })),
    ...(sub?.features ?? []).filter((f) => f.level === lvl).map((f) => ({ ...f, from: sub!.name })),
  ];

  return (
    <div className="card">
      <p className="eyebrow">The road ahead</p>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>Progression preview</h3>
      <p className="faint" style={{ fontSize: "0.8rem", marginTop: 0 }}>
        Explore how a {klass.name}
        {pathName ? ` · ${pathName}` : ""} grows — this doesn't change your hunter.
      </p>

      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: 30, padding: 4, flex: "none" }}
          disabled={lvl <= 1}
          onClick={() => setLvl(lvl - 1)}
          aria-label="previous level"
        >
          −
        </button>
        <input
          type="range"
          className="level-range"
          min={1}
          max={20}
          value={lvl}
          onChange={(e) => setLvl(Number(e.target.value))}
          aria-label="preview level"
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ width: 30, padding: 4, flex: "none" }}
          disabled={lvl >= 20}
          onClick={() => setLvl(lvl + 1)}
          aria-label="next level"
        >
          +
        </button>
        <span
          style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", minWidth: 52, textAlign: "right", flex: "none" }}
        >
          Lv {lvl}
        </span>
      </div>
      {lvl === startLevel && (
        <p className="faint center" style={{ fontSize: "0.72rem", margin: "2px 0 0" }}>
          where this hunter starts
        </p>
      )}

      <div className="derived-grid" style={{ marginTop: 10 }}>
        <Stat label="Max HP" value={maxHp(klass, abilities, lvl)} />
        <Stat label="Prof. Bonus" value={formatModifier(row?.profBonus ?? proficiencyBonus(lvl))} />
        <Stat label="Sanity" value={maxSanity(klass, abilities, lvl)} />
        <Stat label="Sanity Die" value={klass.sanityDie} />
        {klass.progressionColumns.map((col) => (
          <Stat key={col} label={col} value={row?.extras[col] ?? "—"} />
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Gained at level {lvl}</p>
        {row && row.features !== "—" && (
          <p className="muted" style={{ fontSize: "0.88rem", marginTop: 0, marginBottom: gained.length ? 8 : 0 }}>
            {row.features}
          </p>
        )}
        {gained.length > 0 && (
          <div className="stack" style={{ gap: 4 }}>
            {gained.map((f) => (
              <details key={`${f.from}-${f.name}`}>
                <summary style={{ cursor: "pointer", fontSize: "0.92rem" }}>
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                  <span className="faint" style={{ fontSize: "0.74rem" }}> · {f.from} {f.level}</span>
                </summary>
                <p className="muted" style={{ fontSize: "0.86rem", margin: "6px 0 4px", whiteSpace: "pre-wrap" }}>
                  {f.text}
                </p>
              </details>
            ))}
          </div>
        )}
        {(!row || row.features === "—") && gained.length === 0 && (
          <p className="faint" style={{ fontSize: "0.82rem", margin: 0 }}>
            Nothing new this level — the climb continues.
          </p>
        )}
        {zealot && (
          <p className="faint" style={{ fontSize: "0.78rem", marginTop: 8, marginBottom: 0 }}>
            Burn the Book — all Deepcaller class features are replaced by the Zealot's.
          </p>
        )}
        {lvl >= 3 && !subclassId && klass.subclasses.length > 0 && (
          <p className="faint" style={{ fontSize: "0.78rem", marginTop: 8, marginBottom: 0 }}>
            Subclass features not shown — you choose your path at level 3.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
