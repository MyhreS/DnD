import { levelHistory } from "../../lib/levelHistory";
import { useAppEditStage } from "../appsheet/appEditStageContext";

/** What every level the Hunter has reached gave them — newest first, the
 * latest one open. */
export function CharacterSheetLevelHistory() {
  const stage = useAppEditStage();
  const entries = levelHistory(stage.savedCard);
  if (entries.length === 0) return null;
  return <section className="character-sheet-level-history" aria-label="Level history">
    {entries.map((entry, index) => <details key={entry.level} className="character-sheet-level-entry" open={index === 0}>
      <summary>
        <span className="character-sheet-level-badge">{entry.level}</span>
        <span><b>Level {entry.level}</b><small>{entry.level === 1 ? "Starting level" : `Reached at ${entry.insight} Insight`}</small></span>
        <span className="character-sheet-level-gains">
          <em>+{entry.hpGained} HP</em>
          {entry.proficiencyBefore != null && entry.proficiencyAfter > entry.proficiencyBefore && <em>Proficiency +{entry.proficiencyAfter}</em>}
        </span>
      </summary>
      <div className="character-sheet-level-body">
        <dl className="character-sheet-level-stats">
          <div><dt>Max HP</dt><dd>{entry.level === 1 ? entry.hpAfter : `${entry.hpAfter - entry.hpGained} → ${entry.hpAfter}`} <small>(+{entry.hpGained})</small></dd></div>
          <div><dt>Proficiency</dt><dd>{entry.proficiencyBefore == null || entry.proficiencyBefore === entry.proficiencyAfter ? `+${entry.proficiencyAfter}` : `+${entry.proficiencyBefore} → +${entry.proficiencyAfter}`}</dd></div>
        </dl>
        {entry.choices.length > 0 && <div className="character-sheet-level-choices"><h4>Your choices</h4><ul>{entry.choices.map((choice) => <li key={choice}>{choice}</li>)}</ul></div>}
        {entry.features.length > 0 && <div className="character-sheet-level-features"><h4>Features gained</h4>{entry.features.map((feature) => <details key={feature.name}><summary>{feature.name}</summary>{feature.text && <p>{feature.text}</p>}</details>)}</div>}
      </div>
    </details>)}
  </section>;
}
