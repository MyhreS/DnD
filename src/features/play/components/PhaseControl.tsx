import { useGameStore } from "../store/gameStore";
import { PHASES } from "../lib/phase";
import type { Game, GamePhase } from "@/types";

/** DM control: set the current phase (exploration / combat / rests). */
export function PhaseControl({ game }: { game: Game }) {
  const setPhase = useGameStore((s) => s.setPhase);
  const busy = useGameStore((s) => s.busy);
  const hint = PHASES.find((p) => p.id === game.phase)?.hint;

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Phase</p>
      <div className="chip-row">
        {PHASES.map((p) => {
          const selected = p.id === game.phase;
          return (
            <button
              key={p.id}
              type="button"
              className={`chip selectable${selected ? " selected" : ""}`}
              disabled={busy}
              aria-pressed={selected}
              onClick={() => !selected && void setPhase(game.id, p.id as GamePhase)}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="faint" style={{ fontSize: "0.82rem", margin: "8px 0 0" }}>{hint}</p>}
    </div>
  );
}
