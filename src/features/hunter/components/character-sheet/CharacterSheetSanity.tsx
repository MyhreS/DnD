import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetBool } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";
import { characterSheetNumber } from "./characterSheetValues";

export function CharacterSheetSanity({ model }: { model: AppSheetModel }) {
  const stage = useAppEditStage();
  const { result } = useCharacterAutomation();
  const sanityMax = characterSheetNumber(result.fields.sanityMax);
  const sanity = stage.previewCard.sanity ?? sanityMax;
  const madness = stage.previewCard.madness ?? 0;
  return <div className="character-sheet-vital-page character-sheet-sanity-page">
    <div className="character-sheet-vital-summary"><small>Mind remaining · Madness {madness}</small><strong>{sanity}<span> / {sanityMax} Sanity</span></strong></div>
    <div className="character-sheet-resource-grid character-sheet-vital-controls">
      <CharacterSheetResourceControl label="Sanity" value={sanity} min={0} max={sanityMax} disabled={model.readOnly} onChange={stage.stageSanity} />
      <CharacterSheetResourceControl label="Madness" value={madness} min={0} note="Tracked separately from Sanity." disabled={model.readOnly} onChange={(value) => stage.stageChange({}, { madness: Math.max(0, Math.floor(value)) })} />
      <label className="character-sheet-status-toggle"><input type="checkbox" checked={sheetBool(model.data, "insane")} disabled={model.readOnly} onChange={(event) => model.setField("insane", event.target.checked)} /><span><b>Insane</b><small>Mark when your hunter is in an Insane state.</small></span></label>
    </div>
  </div>;
}
