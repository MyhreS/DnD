import { characterVitals } from "@/features/hunter/lib/papersheet";
import type { HunterCard } from "@/types";

/** A Hunter's mind and last chance at a glance: Madness against Max Sanity,
 * Insane (Madness at or above Max Sanity, core-rulebook.txt [page 23]) and
 * whether Not Tonight! is still held ([page 45]). */
export function BattleHunterState({ card }: { card: HunterCard }) {
  const notTonight = card.notTonight === true;
  const madness = Math.max(0, card.madness ?? 0);
  const sanityMax = characterVitals(card).sanityMax;
  const insane = sanityMax !== null && sanityMax > 0 && madness >= sanityMax;
  const pressure = sanityMax ? Math.min(100, (madness / sanityMax) * 100) : 0;
  return (
    <div className="battle-hunter-state">
      <span className={`battle-madness${insane ? " is-insane" : ""}`} aria-label={`Madness ${madness}${sanityMax ? ` of ${sanityMax}` : ""}${insane ? ", Insane" : ""}`}>
        <small>Madness</small>
        <b>{madness}{sanityMax ? <span> / {sanityMax}</span> : null}</b>
        <i aria-hidden="true"><span style={{ width: `${pressure}%` }} /></i>
      </span>
      {insane && <span className="battle-state-chip is-insane">Insane</span>}
      <span className={`battle-state-chip ${notTonight ? "is-ready" : "is-used"}`} title={notTonight ? "Held: the next blow that would drop this Hunter to 0 leaves them at 1 HP" : "Spent: regained after a Long Rest"}>
        Not Tonight! <em>{notTonight ? "ready" : "used"}</em>
      </span>
    </div>
  );
}
