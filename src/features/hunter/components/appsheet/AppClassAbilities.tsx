import type { HunterClass, SheetAutomationState } from "@/types";
import { abilityChoice, classAbilitiesThroughLevel } from "../../lib/classAbilityChoices";

/** Every class and path ability through the Hunter's level, each with what
 * this Hunter chose for it (or a flag when a choice is still open). */
export function AppClassAbilities({ klass, subclassId, level, state }: {
  klass: HunterClass;
  subclassId?: string | null;
  level: number;
  state?: SheetAutomationState;
}) {
  const subclass = klass.subclasses.find((entry) => entry.id === subclassId);
  const abilities = classAbilitiesThroughLevel(klass, subclassId, level);

  return (
    <div className="appsheet-feature-timeline" data-testid="appsheet-class-abilities">
      {abilities.map((ability, index) => {
        const choice = abilityChoice(ability, state, subclass);
        const isPath = / subclass$/i.test(ability.name);
        return (
          <details key={`${ability.level}-${ability.name}-${index}`}>
            <summary>
              <span>Level {ability.level}</span>
              <b>
                {isPath ? (subclass ? `Path: ${subclass.name}` : "Path") : ability.name}
                {choice && !isPath && (choice.missing
                  ? <small className="appsheet-ability-choice is-missing">Not chosen yet</small>
                  : <small className="appsheet-ability-choice">Your choice: {choice.picks.join(", ")}</small>)}
                {isPath && !subclass && <small className="appsheet-ability-choice is-missing">Not chosen yet</small>}
              </b>
              {ability.source && <em>{ability.source}</em>}
            </summary>
            <p>{isPath && subclass ? `${subclass.tagline ? `${subclass.tagline}\n\n` : ""}${subclass.blurb}` : ability.text}</p>
          </details>
        );
      })}
    </div>
  );
}
