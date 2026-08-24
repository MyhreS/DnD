import type { AppSheetModel } from "../appsheet/appSheetShared";
import { AppDeepcallerReference } from "../appsheet/AppDeepcallerReference";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { sheetBool, sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4ResourceControl } from "./View4ResourceControl";
import { view4Number } from "./view4Values";

export function View4Resources({ model }: { model: AppSheetModel }) {
  const { card, klass, result } = useCharacterAutomation();
  const stage = useAppEditStage();
  const strainMax = view4Number(result.fields.strainMax);
  const disabled = model.readOnly;
  const setNumber = (field: string) => (value: number) => model.setField(field, String(value));
  return <div className="v4-resource-layout">
    <section className="v4-resource-group"><h3>Recovery</h3><div className="v4-resource-grid">
      <View4ResourceControl label="Hit dice left" value={view4Number(sheetText(model.data, "hdCur"), view4Number(result.fields.hdMax))} max={view4Number(result.fields.hdMax)} disabled={disabled} onChange={setNumber("hdCur")} />
      <View4ResourceControl label="Hit dice spent" value={view4Number(sheetText(model.data, "hdSpent"))} max={view4Number(result.fields.hdMax)} disabled={disabled} onChange={setNumber("hdSpent")} />
      {klass?.caster && <View4ResourceControl label="Strains left" value={view4Number(sheetText(model.data, "strainCur"), strainMax)} max={strainMax} disabled={disabled} onChange={setNumber("strainCur")} />}
    </div></section>
    <section className="v4-resource-group"><h3>Battle states</h3><div className="v4-state-grid">
      <label><input type="checkbox" checked={card.bloodTinge === true} disabled={disabled} onChange={(event) => model.setFields({ bloodTinge: event.target.checked }, { bloodTinge: event.target.checked })} /> Blood Tinge held</label>
      {["dsS1", "dsS2", "dsS3"].map((field, index) => <label key={field}><input type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save success {index + 1}</label>)}
      {["dsF1", "dsF2", "dsF3"].map((field, index) => <label key={field}><input type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save failure {index + 1}</label>)}
    </div></section>
    <section className="v4-resource-group v4-transformations"><h3>Transformations</h3>
      <View4ResourceControl label="Transformation level" value={stage.previewCard.transformationLevel ?? 0} max={10} note="Reducing this level clears all active transformations." disabled={disabled} onChange={stage.stageTransformation} />
      <span>Active transformations</span>
      {(stage.previewCard.activeTransformations ?? []).length > 0
        ? <div>{(stage.previewCard.activeTransformations ?? []).map((entry, index) => <b key={`${entry}-${index}`}>{entry}</b>)}</div>
        : <small>No active transformations.</small>}
    </section>
    <AppDeepcallerReference />
  </div>;
}
