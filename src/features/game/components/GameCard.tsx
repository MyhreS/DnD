import type { Game } from "@/types";

function gameDate(game: Game): Date | null {
  const value = game.endedAt || game.startedAt || game.createdAt;
  return value ? new Date(value) : null;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function statusOf(game: Game): { label: string; tone: "live" | "waiting" | "ended" } {
  if (game.status === "ended") return { label: "Ended", tone: "ended" };
  if (game.status === "active") return { label: game.combat?.active ? `Battle · Round ${Math.max(1, game.combat.round)}` : "Live", tone: "live" };
  return { label: "Waiting", tone: "waiting" };
}

/** One game as an illustrated card: status, a sigil banner, the Hunters at the
 * table and the DM. The same card serves the current and previous lists. */
export function GameCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const status = statusOf(game);
  const date = gameDate(game);
  const hunters = game.participantRoster ?? [];
  const shown = hunters.slice(0, 4);

  return (
    <button className={`game-card is-${status.tone}`} type="button" onClick={onOpen}>
      <span className="game-card-banner" aria-hidden="true">
        <svg viewBox="0 0 120 120" className="game-card-sigil"><circle cx="60" cy="60" r="44" /><circle cx="60" cy="60" r="30" /><path d="M60 8v104M8 60h104M23 23l74 74M97 23 23 97" /></svg>
        {date && <span className="game-card-date"><b>{date.getDate()}</b><small>{date.toLocaleString(undefined, { month: "short" })}</small></span>}
      </span>
      <span className="game-card-body">
        <span className={`game-card-status is-${status.tone}`}><i aria-hidden="true" />{status.label}</span>
        <strong className="game-card-title">{game.title}</strong>
        <span className="game-card-meta">
          <span className="game-card-hunters" aria-label={`${hunters.length} Hunter${hunters.length === 1 ? "" : "s"}`}>
            {shown.map((hunter) => <span key={hunter.uid} className="game-card-avatar" title={hunter.name}>{initials(hunter.name)}</span>)}
            {hunters.length > shown.length && <span className="game-card-avatar is-more">+{hunters.length - shown.length}</span>}
            {hunters.length === 0 && <span className="game-card-none">No Hunters yet</span>}
          </span>
          <span className="game-card-dm">DM · {game.dmName}</span>
        </span>
      </span>
    </button>
  );
}
