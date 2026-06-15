import { useState } from "react";

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;
type Die = (typeof DICE)[number];

interface Roll {
  id: number;
  die: Die;
  raw: number;
  mod: number;
  total: number;
  crit: "hit" | "miss" | null;
}

let rollId = 0;

export function DiceRoller() {
  const [mod, setMod] = useState(0);
  const [history, setHistory] = useState<Roll[]>([]);
  const last = history[0];

  function roll(die: Die) {
    const raw = 1 + Math.floor(Math.random() * die);
    const crit: Roll["crit"] = die === 20 ? (raw === 20 ? "hit" : raw === 1 ? "miss" : null) : null;
    setHistory((h) => [{ id: ++rollId, die, raw, mod, total: raw + mod, crit }, ...h].slice(0, 8));
  }

  return (
    <div className="card">
      <p className="eyebrow">Dice</p>
      <div
        className="center"
        style={{
          minHeight: 64,
          display: "grid",
          placeItems: "center",
          marginBottom: 10,
        }}
      >
        {last ? (
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.4rem",
                lineHeight: 1,
                color: last.crit === "hit" ? "var(--gold)" : last.crit === "miss" ? "var(--blood-bright)" : "var(--ink)",
              }}
            >
              {last.total}
            </div>
            <div className="faint" style={{ fontSize: "0.78rem" }}>
              d{last.die}: {last.raw}
              {last.mod ? (last.mod > 0 ? ` + ${last.mod}` : ` − ${-last.mod}`) : ""}
              {last.crit === "hit" ? " · Critical!" : last.crit === "miss" ? " · Critical miss" : ""}
            </div>
          </div>
        ) : (
          <span className="faint">Tap a die to roll</span>
        )}
      </div>

      <div className="chip-row" style={{ justifyContent: "center" }}>
        {DICE.map((d) => (
          <button key={d} className="chip selectable" onClick={() => roll(d)} style={{ minWidth: 52, justifyContent: "center" }}>
            d{d}
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: "center" }}>
        <span className="faint" style={{ fontSize: "0.8rem" }}>Modifier</span>
        <button className="btn btn-ghost btn-sm" style={{ width: 36, padding: 6 }} onClick={() => setMod((m) => m - 1)}>−</button>
        <span style={{ fontFamily: "var(--font-display)", minWidth: 28, textAlign: "center" }}>
          {mod >= 0 ? `+${mod}` : mod}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ width: 36, padding: 6 }} onClick={() => setMod((m) => m + 1)}>+</button>
      </div>

      {history.length > 1 && (
        <p className="faint center" style={{ fontSize: "0.74rem", marginTop: 10, marginBottom: 0 }}>
          {history.slice(1).map((r) => `${r.total}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
