import { useState } from "react";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";
import { characterSheetNumber, madnessPatch } from "./characterSheetValues";

const SLEEPLESS_NOTE = "1 per hour outside a rest; Short Rest −6; Long Rest → 0. At 24 you gain Sleepless and 1d4 Madness, again at 30, 36, 42 and every further 6. Ends below 24.";
const EXHAUSTION_NOTE = "Subtract twice your level from every D20 Test and reduce every Speed by 5 ft per level. You die at level 6. A Long Rest removes 1.";

/** Recovery. core-rulebook.txt [page 25] (Short and Long Rest benefits) and
 * [page 21] (Sleepless Counters, Exhaustion). */
export function CharacterSheetRecovery({ model }: { model: AppSheetModel }) {
  const { klass, result } = useCharacterAutomation();
  const stage = useAppEditStage();
  const [sanityRoll, setSanityRoll] = useState(0);
  const disabled = model.readOnly;
  const hdMax = characterSheetNumber(result.fields.hdMax);
  const strainMax = characterSheetNumber(result.fields.strainMax);
  const bandsMax = characterSheetNumber(result.fields.bandsMax);
  const warden = klass?.id === "warden";
  const setNumber = (field: string) => (value: number) => model.setField(field, String(value));
  const card = stage.previewCard;

  // core-rulebook.txt [page 25], "When you finish a Long Rest": Exhaustion −1,
  // all Transformation Levels removed, Sleepless Counters to 0, Madness reduced
  // by the Sanity Die roll + Wisdom modifier (minimum 0), unspent Blood Tinge
  // lost, and Not Tonight! regained if not already held.
  function finishLongRest() {
    // [page 89]: a Warden regains all Bands Directive uses on a Long Rest.
    stage.stageChange(warden ? { bandsCur: String(bandsMax) } : {}, {
      transformationLevel: 0,
      activeTransformations: [],
      bloodTinge: false,
      notTonight: true,
      sleeplessCounter: 0,
      exhaustion: Math.max(0, (card.exhaustion ?? 0) - 1),
      ...madnessPatch(card, (card.madness ?? 0) - Math.max(0, sanityRoll), characterSheetNumber(result.fields.sanityMax)),
    });
    setSanityRoll(0);
  }

  return <section className="character-sheet-resource-group"><h3>Recovery</h3><div className="character-sheet-resource-grid">
    <CharacterSheetResourceControl label="Hit dice left" value={characterSheetNumber(sheetText(model.data, "hdCur"), hdMax)} max={hdMax} disabled={disabled} onChange={setNumber("hdCur")} />
    <CharacterSheetResourceControl label="Hit dice spent" value={characterSheetNumber(sheetText(model.data, "hdSpent"))} max={hdMax} disabled={disabled} onChange={setNumber("hdSpent")} />
    {klass?.caster && <CharacterSheetResourceControl label="Strains left" value={characterSheetNumber(sheetText(model.data, "strainCur"), strainMax)} max={strainMax} disabled={disabled} onChange={setNumber("strainCur")} />}
    {warden && <CharacterSheetResourceControl label="Bands Directive uses" value={characterSheetNumber(sheetText(model.data, "bandsCur"), bandsMax)} min={0} max={bandsMax} note={`Wisdom modifier × ${card.level >= 11 ? 4 : card.level >= 5 ? 3 : 2}. All regained on a Long Rest${card.level >= 5 ? " or Short Rest" : ""}.`} disabled={disabled} onChange={setNumber("bandsCur")} />}
    <CharacterSheetResourceControl label="Sleepless counters" value={card.sleeplessCounter ?? 0} min={0} note={SLEEPLESS_NOTE} disabled={disabled} onChange={(value) => stage.stageChange({}, { sleeplessCounter: Math.max(0, Math.floor(value)) })} />
    <CharacterSheetResourceControl label="Exhaustion" value={card.exhaustion ?? 0} min={0} max={6} note={EXHAUSTION_NOTE} disabled={disabled} onChange={(value) => stage.stageChange({}, { exhaustion: Math.max(0, Math.min(6, Math.floor(value))) })} />
    <CharacterSheetResourceControl label="Favors" value={card.favors ?? 0} min={0} max={2} note="Awarded only by your GM. You can hold no more than two." disabled={disabled} onChange={(value) => stage.stageChange({}, { favors: Math.max(0, Math.min(2, Math.floor(value))) })} />
    <CharacterSheetResourceControl label="Sanity Die roll + WIS" value={sanityRoll} min={0} note={`Roll ${String(result.fields.sanityDice ?? "your Sanity Die")} and add your Wisdom modifier, then finish the Long Rest.`} disabled={disabled} onChange={(value) => setSanityRoll(Math.max(0, Math.floor(value)))} />
    {!disabled && <button type="button" className="character-sheet-upgrade-launch" onClick={finishLongRest}>Finish a Long Rest<small>Transformations cleared, Sleepless to 0, Exhaustion −1, Blood Tinge lost, Not Tonight! regained{warden ? ", Bands Directive refilled" : ""}, Madness −{Math.max(0, sanityRoll)}.</small></button>}
  </div></section>;
}
