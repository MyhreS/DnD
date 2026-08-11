import { NumericStepper, type AppSheetModel } from "../appsheet/appSheetShared";
import { sheetBool, sheetText } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

function numberOf(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Resource({ label, value, min, max, onChange, disabled }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void; disabled: boolean }) {
  return <label className="v4-resource"><span>{label}</span><NumericStepper label={label} value={value} min={min} max={max} disabled={disabled} onChange={onChange} />{max != null && <small>Maximum {max}</small>}</label>;
}

export function View4Resources({ model }: { model: AppSheetModel }) {
  const stage = useAppEditStage();
  const { card, klass, result } = useCharacterAutomation();
  const hpMax = numberOf(result.fields.hpMax);
  const sanityMax = numberOf(result.fields.sanityMax);
  const strainMax = numberOf(result.fields.strainMax);
  const disabled = model.readOnly;
  const setNumber = (field: string, patchKey?: "insight" | "coins") => (value: number) => {
    model.setFields({ [field]: String(value) }, patchKey ? { [patchKey]: value } : {});
  };
  return <div className="v4-resource-layout">
    <section className="v4-resource-group"><h3>Progress</h3><div className="v4-resource-grid">
      <Resource label="Level" value={stage.previewCard.level} min={1} max={20} disabled={disabled} onChange={stage.stageLevel} />
      <Resource label="Insight" value={card.insight ?? numberOf(sheetText(model.data, "insight"))} disabled={disabled} onChange={setNumber("insight", "insight")} />
      <Resource label="Transformation" value={stage.previewCard.transformationLevel ?? 0} max={10} disabled={disabled} onChange={stage.stageTransformation} />
      <Resource label="Gold" value={card.coins ?? 0} disabled={disabled} onChange={setNumber("coins", "coins")} />
    </div></section>
    <section className="v4-resource-group"><h3>Vital pools</h3><div className="v4-resource-grid">
      <Resource label="Hit points" value={stage.previewCard.currentHp ?? hpMax} max={hpMax} disabled={disabled} onChange={stage.stageHp} />
      <Resource label="Temporary HP" value={numberOf(sheetText(model.data, "hpTemp"))} disabled={disabled} onChange={setNumber("hpTemp")} />
      <Resource label="Sanity" value={stage.previewCard.sanity ?? sanityMax} max={sanityMax} disabled={disabled} onChange={stage.stageSanity} />
      <Resource label="Hit dice left" value={numberOf(sheetText(model.data, "hdCur"), numberOf(result.fields.hdMax))} max={numberOf(result.fields.hdMax)} disabled={disabled} onChange={setNumber("hdCur")} />
      <Resource label="Hit dice spent" value={numberOf(sheetText(model.data, "hdSpent"))} max={numberOf(result.fields.hdMax)} disabled={disabled} onChange={setNumber("hdSpent")} />
      {klass?.caster && <Resource label="Strains left" value={numberOf(sheetText(model.data, "strainCur"), strainMax)} max={strainMax} disabled={disabled} onChange={setNumber("strainCur")} />}
    </div></section>
    <section className="v4-resource-group"><h3>Battle states</h3><div className="v4-state-grid">
      <label><input type="checkbox" checked={card.bloodTinge === true} disabled={disabled} onChange={(event) => model.setFields({ bloodTinge: event.target.checked }, { bloodTinge: event.target.checked })} /> Blood Tinge held</label>
      <label><input type="checkbox" checked={sheetBool(model.data, "insane")} disabled={disabled} onChange={(event) => model.setField("insane", event.target.checked)} /> Insane</label>
      {["dsS1", "dsS2", "dsS3"].map((field, index) => <label key={field}><input type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save success {index + 1}</label>)}
      {["dsF1", "dsF2", "dsF3"].map((field, index) => <label key={field}><input type="checkbox" checked={sheetBool(model.data, field)} disabled={disabled} onChange={(event) => model.setField(field, event.target.checked)} /> Death save failure {index + 1}</label>)}
    </div></section>
  </div>;
}
