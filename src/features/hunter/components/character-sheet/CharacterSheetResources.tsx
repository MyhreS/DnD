import type { AppSheetModel } from "../appsheet/appSheetShared";
import { AppDeepcallerReference } from "../appsheet/AppDeepcallerReference";
import { sheetBool } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetRecovery } from "./CharacterSheetRecovery";
import { CharacterSheetTransformations } from "./CharacterSheetTransformations";

export function CharacterSheetResources({ model }: { model: AppSheetModel }) {
  const { card, klass, result } = useCharacterAutomation();
  const disabled = model.readOnly;
  return <div className="character-sheet-resource-layout">
    <CharacterSheetRecovery model={model} />
    <section className="character-sheet-resource-group"><h3>Character sheet values</h3><div className="character-sheet-resource-grid">
      <div className="character-sheet-resource"><span>Sanity dice</span><strong>{String(result.fields.sanityDice ?? "—")}</strong></div>
      <div className="character-sheet-resource"><span>Melee attack bonus</span><strong>{String(result.fields.meleeAttack ?? "—")}</strong></div>
      <div className="character-sheet-resource"><span>Ranged attack bonus</span><strong>{String(result.fields.rangedAttack ?? "—")}</strong></div>
      {klass?.caster && <>
        <div className="character-sheet-resource"><span>Rite performing ability</span><strong>{String(result.fields.riteAbility ?? "—")}</strong></div>
        <div className="character-sheet-resource"><span>Rite modifier</span><strong>{String(result.fields.riteMod ?? "—")}</strong></div>
        <div className="character-sheet-resource"><span>Rite save DC</span><strong>{String(result.fields.riteDC ?? "—")}</strong></div>
        <div className="character-sheet-resource"><span>Rite attack bonus</span><strong>{String(result.fields.riteAttack ?? "—")}</strong></div>
      </>}
    </div></section>
    <section className="character-sheet-resource-group"><h3>Battle states</h3><div className="character-sheet-state-grid">
      <label><input type="checkbox" checked={card.bloodTinge === true} disabled={disabled} onChange={(event) => model.setFields({ bloodTinge: event.target.checked }, { bloodTinge: event.target.checked })} /> Blood Tinge held</label>
      <label><input type="checkbox" checked={card.notTonight === true} disabled={disabled} onChange={(event) => model.setFields({ notTonight: event.target.checked }, { notTonight: event.target.checked })} /> Not Tonight! held</label>
      {["dsS1", "dsS2", "dsS3"].map((field, index) => <label key={field}><input type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save success {index + 1}</label>)}
      {["dsF1", "dsF2", "dsF3"].map((field, index) => <label key={field}><input type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save failure {index + 1}</label>)}
    </div></section>
    <CharacterSheetTransformations disabled={disabled} />
    <AppDeepcallerReference />
  </div>;
}
