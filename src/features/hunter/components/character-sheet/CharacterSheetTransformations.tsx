import { TRANSFORMATION_EFFECT_BY_ID, TRANSFORMATION_TABLE } from "@/data/transformations";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";

/** core-rulebook.txt [page 26]: reductions come from a Short Rest (−1, plus one
 * more on a DC 13 Constitution (Grit) check), a Long Rest (all levels removed)
 * and the first time you fall Unconscious in a rest (−2). */
const REDUCTION_NOTE = "Reducing this level clears all active transformations. Short Rest −1 (DC 13 CON (Grit) for −1 more); Long Rest → 0; first Unconscious −2.";

function effectName(entry: string): string {
  return TRANSFORMATION_EFFECT_BY_ID[entry]?.name ?? entry;
}

export function CharacterSheetTransformations({ disabled }: { disabled: boolean }) {
  const stage = useAppEditStage();
  const level = stage.previewCard.transformationLevel ?? 0;
  const savedLevel = stage.savedCard.transformationLevel ?? 0;
  const active = stage.previewCard.activeTransformations ?? [];
  // core-rulebook.txt [page 26]: gaining several levels at once is still one
  // roll, taken at the final level — so only the new level's column is shown.
  const column = level > savedLevel && level >= 1 && level <= 10 ? level : null;
  return <section className="character-sheet-resource-group character-sheet-transformations"><h3>Transformations</h3>
    <CharacterSheetResourceControl label="Transformation level" value={level} max={10} note={REDUCTION_NOTE} disabled={disabled} onChange={stage.stageTransformation} />
    <span>Active transformations</span>
    {active.length > 0
      ? <div>{active.map((entry, index) => <b key={`${entry}-${index}`}>{effectName(entry)}</b>)}</div>
      : <small>No active transformations.</small>}
    {column != null && <>
      <span>Transformation Table · level {column}</span>
      <small>Roll 1d20 once at your new level and tell your GM the result.</small>
      {TRANSFORMATION_TABLE.map((row, index) => {
        const effect = TRANSFORMATION_EFFECT_BY_ID[row[column - 1]];
        return <small key={index}>{index + 1} — {effect?.name ?? row[column - 1]}{effect && effect.madnessOnGain > 0 ? ` (${effect.madnessOnGain} Madness)` : ""}</small>;
      })}
    </>}
    {active.length > 0 && active.map((entry, index) => {
      const effect = TRANSFORMATION_EFFECT_BY_ID[entry];
      return effect ? <small key={`text-${entry}-${index}`}>{effect.name}. {effect.text}</small> : null;
    })}
  </section>;
}
