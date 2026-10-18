import { useState } from "react";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { classResources } from "../../lib/characterAutomation";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";
import { characterSheetNumber, madnessPatch } from "./characterSheetValues";
import { abilityModifier, formatModifier } from "@/data/abilities";
import { proficiencyBonus, withClassAbilityBonuses } from "@/lib/character";
import { breakdownFor } from "../../lib/calculationBreakdowns";
import { ExplainValue } from "./CharacterSheetExplain";

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
  const resources = classResources(stage.previewCard);
  const setNumber = (field: string) => (value: number) => model.setField(field, String(value));
  const card = stage.previewCard;
  // core-rulebook.txt [page 43]: each Hit Point Die is the class's die plus the
  // Constitution modifier; up to Proficiency Bonus of them per Short Rest, and
  // only in a Safe Zone.
  const conMod = abilityModifier(withClassAbilityBonuses(card).abilities.con);
  const hitDieNote = klass
    ? <>Roll 1d{klass.hitDie} {formatModifier(conMod)} per die (Constitution). Spend up to {proficiencyBonus(card.level)} per Short Rest, in a Safe Zone. Maximum <ExplainValue breakdown={breakdownFor(card, "hdMax")}>{hdMax}</ExplainValue>.</>
    : undefined;

  // core-rulebook.txt [page 25], "When you finish a Long Rest": Exhaustion −1,
  // all Transformation Levels removed, Sleepless Counters to 0, Madness reduced
  // by the Sanity Die roll + Wisdom modifier (minimum 0), unspent Blood Tinge
  // lost, and Not Tonight! regained if not already held.
  function finishLongRest() {
    // Every tracked class resource is fully regained on a Long Rest.
    stage.stageChange(Object.fromEntries(resources.map((resource) => [`${resource.key}Cur`, String(resource.max)])), {
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
    <CharacterSheetResourceControl label={klass ? `Hit dice left (d${klass.hitDie})` : "Hit dice left"} labelNode={klass ? <>Hit dice left (<ExplainValue breakdown={breakdownFor(card, "hitDie")}>d{klass.hitDie}</ExplainValue>)</> : undefined} value={characterSheetNumber(sheetText(model.data, "hdCur"), hdMax)} max={hdMax} note={hitDieNote} disabled={disabled} onChange={setNumber("hdCur")} />
    <CharacterSheetResourceControl label="Hit dice spent" value={characterSheetNumber(sheetText(model.data, "hdSpent"))} max={hdMax} disabled={disabled} onChange={setNumber("hdSpent")} />
    {klass?.caster && <CharacterSheetResourceControl label="Strains left" value={characterSheetNumber(sheetText(model.data, "strainCur"), strainMax)} note={<>Level allowance <ExplainValue breakdown={breakdownFor(card, "strainMax")}>{strainMax}</ExplainValue>. No upper limit.</>} disabled={disabled} onChange={setNumber("strainCur")} />}
    {resources.map((resource) => <CharacterSheetResourceControl key={resource.key} label={resource.label} value={characterSheetNumber(sheetText(model.data, `${resource.key}Cur`), resource.max)} min={0} max={resource.max} note={<>Maximum <ExplainValue breakdown={breakdownFor(card, `resource:${resource.key}`)}>{resource.max}</ExplainValue>. {resource.note}</>} disabled={disabled} onChange={setNumber(`${resource.key}Cur`)} />)}
    <CharacterSheetResourceControl label="Sleepless counters" value={card.sleeplessCounter ?? 0} min={0} note={SLEEPLESS_NOTE} disabled={disabled} onChange={(value) => stage.stageChange({}, { sleeplessCounter: Math.max(0, Math.floor(value)) })} />
    <CharacterSheetResourceControl label="Exhaustion" value={card.exhaustion ?? 0} min={0} max={6} note={EXHAUSTION_NOTE} disabled={disabled} onChange={(value) => stage.stageChange({}, { exhaustion: Math.max(0, Math.min(6, Math.floor(value))) })} />
    <CharacterSheetResourceControl label="Favors" value={card.favors ?? 0} min={0} max={2} note="Awarded only by your GM. You can hold no more than two." disabled={disabled} onChange={(value) => stage.stageChange({}, { favors: Math.max(0, Math.min(2, Math.floor(value))) })} />
    <CharacterSheetResourceControl label="Sanity Die roll + WIS" value={sanityRoll} min={0} note={<>Roll <ExplainValue breakdown={breakdownFor(card, "sanityDice")}>{String(result.fields.sanityDice ?? "your Sanity Die")}</ExplainValue> and add your Wisdom modifier, then finish the Long Rest.</>} disabled={disabled} onChange={(value) => setSanityRoll(Math.max(0, Math.floor(value)))} />
    {!disabled && <button data-haptic="success" type="button" className="character-sheet-upgrade-launch" onClick={finishLongRest}>Finish a Long Rest<small>Transformations cleared, Sleepless to 0, Exhaustion −1, Blood Tinge lost, Not Tonight! regained{resources.length ? `, ${resources.map((resource) => resource.label.replace(/ uses$/, "")).join(", ")} refilled` : ""}, Madness −{Math.max(0, sanityRoll)}.</small></button>}
  </div></section>;
}
