import { useAllCharacters } from "../hooks/useAllCharacters";
import { useDmPicks } from "../hooks/useDmPicks";
import { DMHunterList } from "./DMHunterList";
import { DMHunterSearch } from "./DMHunterSearch";
import { CardSkeleton } from "@/components/Skeleton";

/** The DM's board: an opt-in table of character sheets. It starts empty —
 * search across every player and hunter, add the ones you want at hand, and
 * dismiss them when the hunt moves on. Selection persists on this device.
 * Reached from the main menu when Dungeon Master mode is on (Profile). */
export function DMOverviewPage() {
  const { characters, error } = useAllCharacters();
  const { pickIds, picked, addPick, removePick } = useDmPicks(characters);
  const candidates = (characters ?? []).filter((c) => !pickIds.includes(c.id));

  return (
    <div className="reading">
      <p className="eyebrow">Dungeon Master</p>
      <h1 className="page-title">DM board</h1>
      <p className="page-intro">
        Your personal table of sheets. Search across every player and hunter,
        summon the ones you need — sheets open read-only; nothing you open here
        can be edited.
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      <DMHunterSearch characters={candidates} onAdd={addPick} />

      <p className="eyebrow" style={{ marginTop: 22 }}>On the board</p>
      {picked === null ? (
        <div className="stack" style={{ gap: 10 }}>
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      ) : picked.length === 0 ? (
        <div className="card center">
          <p className="muted" style={{ margin: 0 }}>
            The board lies bare. Search for a player or a hunter to add them to
            your board.
          </p>
        </div>
      ) : (
        <DMHunterList characters={picked} onRemove={removePick} />
      )}
    </div>
  );
}
