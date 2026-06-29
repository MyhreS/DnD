import type { RuleEntry } from "@/types";

export function RuleEntryCard({ entry }: { entry: RuleEntry }) {
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 4, gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{entry.term}</h3>
        <span className="chip" style={{ flex: "none", fontSize: "0.7rem" }}>{entry.category}</span>
      </div>
      {entry.body.map((p, i) => (
        <p key={i} className="muted" style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>{p}</p>
      ))}
    </div>
  );
}
