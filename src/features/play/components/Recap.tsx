import { PHASE_LABEL } from "../lib/phase";
import type { Game } from "@/types";

/** A short wrap-up shown after a game ends. */
export function Recap({ game }: { game: Game }) {
  const dur = game.startedAt && game.endedAt ? game.endedAt - game.startedAt : 0;
  const mins = Math.round(dur / 60000);
  const durLabel = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;

  return (
    <div className="card">
      <p className="eyebrow">Last session · wrap-up</p>
      <h2 style={{ marginTop: 4, marginBottom: 4 }}>{game.title}</h2>
      <p className="muted" style={{ marginBottom: 0 }}>
        The hunt has ended{game.endedPhase ? ` during ${PHASE_LABEL[game.endedPhase]}` : ""}
        {mins > 0 ? ` · ${durLabel} at the table` : ""}. Rest up and ready your hunter for next time.
      </p>
    </div>
  );
}
