import { Link, useLocation } from "react-router-dom";
import { useGameStore, currentGame } from "../store/gameStore";

/** A persistent strip shown when a game is live, so you can hop back into Play
 * from anywhere in the menu (without leaving the game). Hidden on the Play tab. */
export function LiveGameBanner() {
  const games = useGameStore((s) => s.games);
  const location = useLocation();
  const game = currentGame(games);

  if (!game || location.pathname.startsWith("/play")) return null;

  const label = game.status === "lobby" ? "Lobby open" : "Game in progress";

  return (
    <Link to="/play" className="live-banner" aria-label="Return to the live game">
      <span className="live-dot" aria-hidden />
      <span className="live-banner-text">
        {label} · {game.title}
      </span>
      <span className="live-banner-cta">Return →</span>
    </Link>
  );
}
