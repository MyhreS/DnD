import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetBool } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4ResourceControl } from "./View4ResourceControl";
import { view4Number } from "./view4Values";

export function View4Sanity({ model }: { model: AppSheetModel }) {
  const stage = useAppEditStage();
  const { result } = useCharacterAutomation();
  const sanityMax = view4Number(result.fields.sanityMax);
  const sanity = stage.previewCard.sanity ?? sanityMax;
  return <div className="v4-vital-page v4-sanity-page">
    <div className="v4-vital-summary"><small>Mind remaining</small><strong>{sanity}<span> / {sanityMax} Sanity</span></strong></div>
    <div className="v4-resource-grid v4-vital-controls">
      <View4ResourceControl label="Sanity" value={sanity} max={sanityMax} disabled={model.readOnly} onChange={stage.stageSanity} />
      <label className="v4-status-toggle"><input type="checkbox" checked={sheetBool(model.data, "insane")} disabled={model.readOnly} onChange={(event) => model.setField("insane", event.target.checked)} /><span><b>Insane</b><small>Mark when your hunter is in an Insane state.</small></span></label>
    </div>
  </div>;
}
