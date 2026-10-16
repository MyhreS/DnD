import type { Combatant, HunterCard } from "@/types";
import { combatVitals } from "../lib/combatPresentation";

/** The whole initiative order at a glance: one chip per combatant, the acting
 * one lit. Tapping a chip brings that combatant's card into view. */
export function BattleTurnTrack({ order, currentId, characters }: {
  order: Combatant[];
  currentId: string | null;
  characters: HunterCard[];
}) {
  return (
    <nav className="battle-track" aria-label="Turn order overview">
      <ol>
        {order.map((combatant, index) => {
          const vitals = combatVitals(combatant, characters);
          const dead = combatant.defeated === true
            || (combatant.kind === "monster" && vitals.currentHp !== null && vitals.currentHp <= 0);
          return (
            <li key={combatant.id}>
              <button
                type="button"
                className={`battle-track-chip${combatant.kind === "monster" ? " is-monster" : ""}${combatant.id === currentId ? " is-current" : ""}${dead ? " is-dead" : ""}`}
                aria-current={combatant.id === currentId ? "step" : undefined}
                onClick={() => document.querySelector(`[data-testid="battle-combatant-${combatant.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                <b>{index + 1}</b>
                <span>{combatant.name}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
