import type { Game } from "@/types";
import { GameCard } from "./GameCard";
import "./games-menu.css";

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6.04L3.5 8.5" /><path d="M3.5 4.5v4h4M12 7v5l3.5 2" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

export function GamesMenu({
  currentGames,
  previousGames,
  showingPrevious,
  loading,
  onTogglePrevious,
  onOpen,
  onCreate,
}: {
  currentGames: Game[];
  previousGames: Game[];
  showingPrevious: boolean;
  loading: boolean;
  onTogglePrevious: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const visibleGames = showingPrevious ? previousGames : currentGames;
  const listName = showingPrevious ? "Previous games" : "Current games";

  return (
    <section className="games-menu" aria-labelledby="games-menu-title">
      <header className="games-menu-heading">
        <div>
          <h1 className="page-title" id="games-menu-title">Games</h1>
          <p>{showingPrevious ? "Sessions you have played" : "Your table, tonight"}</p>
        </div>
        <div className="games-menu-actions">
          {!showingPrevious && (
            <button className="games-menu-create" type="button" onClick={onCreate}>
              <PlusIcon />
              <span>Create game</span>
            </button>
          )}
          <button
            className="games-menu-switch"
            type="button"
            aria-pressed={showingPrevious}
            aria-label={showingPrevious ? "Show current games" : "Show previous games"}
            onClick={onTogglePrevious}
          >
            <HistoryIcon />
            <span>{showingPrevious ? "Current" : "Previous"}</span>
          </button>
        </div>
      </header>

      <nav className="games-menu-list" aria-label={listName}>
        {loading ? <p className="games-menu-empty">Loading games…</p> : visibleGames.length ? visibleGames.map((game) => (
          <GameCard key={game.id} game={game} onOpen={() => onOpen(game.id)} />
        )) : (
          <div className="games-menu-empty">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="44" /><circle cx="60" cy="60" r="30" /><path d="M60 8v104M8 60h104" /></svg>
            <strong>No {showingPrevious ? "previous" : "current"} games.</strong>
            <span>{showingPrevious ? "Finished sessions will gather here." : "Create a game to gather your Hunters."}</span>
          </div>
        )}
      </nav>
    </section>
  );
}
