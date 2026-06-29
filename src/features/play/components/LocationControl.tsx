import { useGameStore } from "../store/gameStore";
import { LOCATIONS } from "../lib/phase";
import type { Game } from "@/types";

/** DM control: set where the party is (Wild / Safe Zone / Hunters Lodge).
 * This is the input that makes rests rulebook-accurate — see RestPanel. */
export function LocationControl({ game }: { game: Game }) {
  const setLocation = useGameStore((s) => s.setLocation);
  const busy = useGameStore((s) => s.busy);
  const current = game.location ?? "wild";
  const hint = LOCATIONS.find((l) => l.id === current)?.hint;

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Location</p>
      <div className="chip-row">
        {LOCATIONS.map((l) => {
          const selected = l.id === current;
          return (
            <button
              key={l.id}
              type="button"
              className={`chip selectable${selected ? " selected" : ""}`}
              disabled={busy}
              aria-pressed={selected}
              onClick={() => !selected && void setLocation(game.id, l.id)}
            >
              {l.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="faint" style={{ fontSize: "0.82rem", margin: "8px 0 0" }}>{hint}</p>}
    </div>
  );
}
