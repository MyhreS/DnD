import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchControls } from "@/components/SearchControls";
import {
  GAME_CARD_CATEGORIES,
  GAME_CARD_ENTRIES,
  type GameCardCategory,
} from "@/data/gameCard";
import { searchEntries } from "@/lib/search";
import { GameCardEntry } from "./GameCardEntry";

function isCategory(value: string | null): value is GameCardCategory {
  return value !== null && (GAME_CARD_CATEGORIES as readonly string[]).includes(value);
}

export function GameCardPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const categoryParam = params.get("category");
  const category: GameCardCategory | "all" = isCategory(categoryParam) ? categoryParam : "all";

  const results = useMemo(() => {
    const candidates = category === "all"
      ? GAME_CARD_ENTRIES
      : GAME_CARD_ENTRIES.filter((item) => item.category === category);
    return searchEntries(candidates, query);
  }, [category, query]);

  function setQuery(next: string) {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next) updated.set("q", next);
      else updated.delete("q");
      return updated;
    }, { replace: true });
  }

  function setCategory(next: GameCardCategory | "all") {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next === "all") updated.delete("category");
      else updated.set("category", next);
      return updated;
    }, { replace: true });
  }

  const grouped = GAME_CARD_CATEGORIES.map((name) => ({
    name,
    id: `game-card-group-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    entries: results.filter((item) => item.category === name),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="game-card-reference">
      <div className="game-card-heading">
        <div>
          <h1>Player&rsquo;s Game Card</h1>
          <p>Search the table reference for actions, conditions, equipment, Transformation, and exploration rules.</p>
        </div>
        <a
          className="btn btn-ghost"
          href="/game-card/players-game-card.pdf"
          target="_blank"
          rel="noreferrer"
          data-testid="game-card-pdf"
        >
          Open printable PDF
        </a>
      </div>

      <div className="game-card-search">
        <SearchControls
          query={query}
          onQuery={setQuery}
          placeholder="Search the game card… (e.g. grapple, rifle, darkness)"
          categories={GAME_CARD_CATEGORIES}
          category={category}
          onCategory={setCategory}
        />
        <p className="game-card-result-count" aria-live="polite">
          {results.length} {results.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="faint" data-testid="game-card-empty">No game-card entries match “{query}”.</p>
      ) : (
        <div className="game-card-groups">
          {grouped.map((group) => (
            <section key={group.name} aria-labelledby={group.id}>
              <h2 id={group.id}>{group.name}</h2>
              <div className="game-card-entry-list">
                {group.entries.map((item) => <GameCardEntry key={item.id} entry={item} query={query} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="game-card-source-note">
        Transcribed from the nine-page Player&rsquo;s Game Card. Where the card reserves an effect for the DM, the app does the same.
      </p>
    </div>
  );
}
