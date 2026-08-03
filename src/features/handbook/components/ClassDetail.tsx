import type { HunterClass, LevelFeature, Subclass } from "@/types";

// Class-detail renderers used by the Handbook Classes tab: the 1–20 progression
// table, the level-by-level feature list, and a subclass block.

export function LevelTable({ c }: { c: HunterClass }) {
  return (
    <div className="table-scroll">
      <table className="level-table">
        <thead>
          <tr>
            <th className="lvl-col">Lv</th>
            <th className="lvl-col">Prof</th>
            <th>Features</th>
            {c.progressionColumns.map((col) => (
              <th key={col} className="lvl-col">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {c.progression.map((row) => (
            <tr key={row.level}>
              <td className="lvl-col">{row.level}</td>
              <td className="lvl-col">+{row.profBonus}</td>
              <td>{row.features || "—"}</td>
              {c.progressionColumns.map((col) => (
                <td key={col} className="lvl-col">{row.extras[col] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FeatureList({ features }: { features: LevelFeature[] }) {
  return (
    <ul className="list-reset pill-list">
      {features.map((f, i) => (
        <li key={i}>
          <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
            <span className="role-tag" style={{ flex: "none" }}>Lv {f.level}</span>
            <span style={{ fontWeight: 600 }}>{f.name}</span>
          </div>
          <div className="muted" style={{ fontSize: "0.88rem", marginTop: 2, whiteSpace: "pre-wrap" }}>{f.text}</div>
        </li>
      ))}
    </ul>
  );
}

export function SubclassBlock({ s }: { s: Subclass }) {
  return (
    <div className="card" style={{ background: "var(--bg-elev-2)" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1rem" }}>{s.name}</div>
      <div className="gold" style={{ fontSize: "0.82rem" }}>{s.tagline}</div>
      <p className="muted" style={{ fontSize: "0.9rem", marginTop: 6 }}>{s.blurb}</p>
      <FeatureList features={s.features} />
    </div>
  );
}
