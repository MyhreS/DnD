import { useAllCharacters } from "../hooks/useAllCharacters";
import { DMHunterList } from "./DMHunterList";
import { CardSkeleton } from "@/components/Skeleton";

/** The DM's table overview: every hunter's character sheet, read-only.
 * Reached from the main menu when Dungeon Master mode is on (Profile). */
export function DMOverviewPage() {
  const { characters, error } = useAllCharacters();

  return (
    <div className="reading">
      <p className="eyebrow">Dungeon Master</p>
      <h1 className="page-title">DM overview</h1>
      <p className="page-intro">
        Every hunter&rsquo;s character sheet in one place — tap a hunter to read
        their sheet. Sheets open read-only; nothing you open here can be edited.
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      {characters === null ? (
        <div className="stack" style={{ gap: 10 }}>
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      ) : characters.length === 0 ? (
        <div className="card center">
          <p className="muted" style={{ margin: 0 }}>No hunters forged yet.</p>
        </div>
      ) : (
        <DMHunterList characters={characters} />
      )}
    </div>
  );
}
