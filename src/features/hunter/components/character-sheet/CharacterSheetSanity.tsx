import type { AppSheetModel } from "../appsheet/appSheetShared";
import { currentMadness, minimumTrackedSanity } from "@/lib/character";
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
  const madness = currentMadness(sanityMax, sanity);
  return <div className="character-sheet-vital-page character-sheet-sanity-page">
    <div className="character-sheet-vital-summary"><small>Mind remaining · Madness {madness}</small><strong>{sanity}<span> / {sanityMax} Sanity</span></strong></div>
    <div className="character-sheet-resource-grid character-sheet-vital-controls">
      <CharacterSheetResourceControl label="Sanity" value={sanity} min={minimumTrackedSanity(sanityMax)} max={sanityMax} disabled={model.readOnly} onChange={stage.stageSanity} />
      <label className="character-sheet-status-toggle"><input type="checkbox" checked={sheetBool(model.data, "insane")} disabled={model.readOnly} onChange={(event) => model.setField("insane", event.target.checked)} /><span><b>Insane</b><small>Mark when your hunter is in an Insane state.</small></span></label>
    </div>
  </div>;
}
