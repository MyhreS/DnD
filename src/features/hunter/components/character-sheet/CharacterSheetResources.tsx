import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetBool } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetRecovery } from "./CharacterSheetRecovery";
import { CharacterSheetTransformations } from "./CharacterSheetTransformations";
import { ExplainValue } from "./CharacterSheetExplain";
import { breakdownFor } from "../../lib/calculationBreakdowns";

export function CharacterSheetResources({ model }: { model: AppSheetModel }) {
  const { card, klass, result } = useCharacterAutomation();
  const disabled = model.readOnly;
  return <div className="character-sheet-resource-layout">
    <CharacterSheetRecovery model={model} />
    <section className="character-sheet-resource-group"><h3>Character sheet values</h3><div className="character-sheet-resource-grid">
      <div className="character-sheet-resource"><span>Sanity dice</span><strong><ExplainValue breakdown={breakdownFor(card, "sanityDice")}>{String(result.fields.sanityDice ?? "—")}</ExplainValue></strong></div>
      <div className="character-sheet-resource"><span>Melee attack bonus</span><strong><ExplainValue breakdown={breakdownFor(card, "meleeAttack")}>{String(result.fields.meleeAttack ?? "—")}</ExplainValue></strong></div>
      <div className="character-sheet-resource"><span>Ranged attack bonus</span><strong><ExplainValue breakdown={breakdownFor(card, "rangedAttack")}>{String(result.fields.rangedAttack ?? "—")}</ExplainValue></strong></div>
      {klass?.caster && <>
        <div className="character-sheet-resource"><span>Rite performing ability</span><strong><ExplainValue breakdown={breakdownFor(card, "riteAbility")}>{String(result.fields.riteAbility ?? "—")}</ExplainValue></strong></div>
        <div className="character-sheet-resource"><span>Rite modifier</span><strong><ExplainValue breakdown={breakdownFor(card, "riteMod")}>{String(result.fields.riteMod ?? "—")}</ExplainValue></strong></div>
        <div className="character-sheet-resource"><span>Rite save DC</span><strong><ExplainValue breakdown={breakdownFor(card, "riteDC")}>{String(result.fields.riteDC ?? "—")}</ExplainValue></strong></div>
        <div className="character-sheet-resource"><span>Rite attack bonus</span><strong><ExplainValue breakdown={breakdownFor(card, "riteAttack")}>{String(result.fields.riteAttack ?? "—")}</ExplainValue></strong></div>
      </>}
    </div></section>
    <section className="character-sheet-resource-group"><h3>Battle states</h3><div className="character-sheet-state-grid">
      <label><input data-haptic type="checkbox" checked={card.bloodTinge === true} disabled={disabled} onChange={(event) => model.setFields({ bloodTinge: event.target.checked }, { bloodTinge: event.target.checked })} /> Blood Tinge held</label>
      <label><input data-haptic type="checkbox" checked={card.notTonight === true} disabled={disabled} onChange={(event) => model.setFields({ notTonight: event.target.checked }, { notTonight: event.target.checked })} /> Not Tonight! held</label>
      {["dsS1", "dsS2", "dsS3"].map((field, index) => <label key={field}><input data-haptic="success" type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save success {index + 1}</label>)}
      {["dsF1", "dsF2", "dsF3"].map((field, index) => <label key={field}><input data-haptic="warning" type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save failure {index + 1}</label>)}
    </div></section>
    <CharacterSheetTransformations disabled={disabled} />
  </div>;
}
