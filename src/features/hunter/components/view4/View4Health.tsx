import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4ResourceControl } from "./View4ResourceControl";
import { view4Number } from "./view4Values";

export function View4Health({ model }: { model: AppSheetModel }) {
  const stage = useAppEditStage();
  const { result } = useCharacterAutomation();
  const hpMax = view4Number(result.fields.hpMax);
  const tempHp = view4Number(sheetText(model.data, "hpTemp"));
  return <div className="v4-vital-drawer v4-health-drawer">
    <div className="v4-vital-summary"><small>Current condition</small><strong>{stage.previewCard.currentHp ?? hpMax}<span> / {hpMax} HP</span></strong></div>
    <div className="v4-resource-grid v4-vital-controls">
      <View4ResourceControl label="Hit points" value={stage.previewCard.currentHp ?? hpMax} max={hpMax} disabled={model.readOnly} onChange={stage.stageHp} />
      <View4ResourceControl label="Temporary HP" value={tempHp} note="Temporary HP sits above your normal HP." disabled={model.readOnly} onChange={(value) => model.setField("hpTemp", String(value))} />
    </div>
  </div>;
}
