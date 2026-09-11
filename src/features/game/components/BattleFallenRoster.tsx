import { useCharactersStore } from "@/features/play/store/charactersStore";
import type { ArchivedCharacter } from "@/types";

/** The fallen of this game: who is archived, and — for a Hunter who expended a
 * Favor — that they are waiting on the Band's next Long Rest. core-rulebook.txt
 * [page 45]. Returning them is the DM's call, made when that rest completes. */
export function BattleFallenRoster({ gameId, isDm, disabled }: { gameId: string; isDm: boolean; disabled: boolean }) {
  const archive = useCharactersStore((state) => state.archive);
  const recover = useCharactersStore((state) => state.recover);
  const busy = useCharactersStore((state) => state.busy);
  const fallen = archive.filter((entry) => entry.gameId === gameId && entry.reason === "dead");
  if (fallen.length === 0) return null;
  const pending = fallen.filter((entry) => entry.favorSpent).length;

  return (
    <section className="battle-fallen" aria-label="The fallen">
      <div className="battle-roster-heading">
        <div>
          <span>The fallen</span>
          <h2>Out of the fight</h2>
        </div>
        <strong>{pending > 0 ? `${pending} awaiting a Long Rest` : `${fallen.length} fallen`}</strong>
      </div>
      <div className="battle-fallen-list">
        {fallen.map((entry) => <FallenRow key={entry.id} entry={entry} isDm={isDm} disabled={disabled || busy} onRecover={() => void recover(entry)} />)}
      </div>
    </section>
  );
}

function FallenRow({ entry, isDm, disabled, onRecover }: {
  entry: ArchivedCharacter;
  isDm: boolean;
  disabled: boolean;
  onRecover: () => void;
}) {
  return (
    <article className={`battle-fallen-row${entry.favorSpent ? " is-pending" : ""}`}>
      <div className="battle-fallen-name">
        <strong>{entry.card.name}</strong>
        <small>{entry.favorSpent
          ? "Favor expended · body and gear gone from the world. Returns during the Band's next Long Rest."
          : "Died without a Favor · their gear dropped as loot."}</small>
      </div>
      {entry.favorSpent && <span className="battle-fallen-tag">Pending return</span>}
      {isDm && <button className="btn btn-ghost" type="button" disabled={disabled} onClick={onRecover}>
        {entry.favorSpent ? "Long Rest complete — return" : "Recover"}
      </button>}
    </article>
  );
}
