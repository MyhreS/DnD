import { ABILITY_NAME } from "@/data/abilities";
import type { Background } from "@/types";
import { OriginFeatInfo } from "./OriginFeatInfo";

function list(values: string[], fallback: string) {
  return values.length > 0 ? values.join(", ") : fallback;
}

/** The practical and story-facing consequences of the selected background.
 * Kept beside the character choices so players do not need to cross-reference
 * the handbook while building a hunter. */
export function BackgroundDetails({ background, className = "" }: {
  background?: Background;
  className?: string;
}) {
  if (!background) {
    return (
      <div className={`background-details ${className}`.trim()} data-testid="background-details">
        <b>Choose a background to see its story and what it adds to your hunter.</b>
        <span>It determines eligible ability bonuses, proficiencies, an Origin feat where specified, and starting gear.</span>
      </div>
    );
  }

  const abilities = background.abilityScores.map((ability) => ABILITY_NAME[ability]).join(", ");
  return (
    <section className={`background-details ${className}`.trim()} data-testid="background-details" aria-label={`${background.name} background details`}>
      <div className="background-details-heading">
        <h3>{background.name}</h3>
        <span>Background details</span>
      </div>
      <p>{background.text}</p>
      <dl>
        <div><dt>Ability bonuses</dt><dd>{abilities} <small>Choose +2 and +1 across different listed abilities, or +1 to all three.</small></dd></div>
        <div><dt>Origin feat</dt><dd>{background.feat ? <OriginFeatInfo feat={background.feat} /> : "Not specified in the handbook scan"}</dd></div>
        <div><dt>Skill proficiencies</dt><dd>{list(background.skills, "None")}</dd></div>
        <div><dt>Tool proficiency</dt><dd>{background.tool ?? "None"}</dd></div>
        <div><dt>Starting gear</dt><dd>{list(background.equipment, "None")}</dd></div>
      </dl>
    </section>
  );
}
