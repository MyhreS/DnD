import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";
import { characterSheetNumber } from "./characterSheetValues";

export function CharacterSheetHealth({ model }: { model: AppSheetModel }) {
  const stage = useAppEditStage();
  const { result } = useCharacterAutomation();
  const hpMax = characterSheetNumber(result.fields.hpMax);
  const tempHp = characterSheetNumber(sheetText(model.data, "hpTemp"));
  return <div className="character-sheet-vital-page character-sheet-health-page">
    <div className="character-sheet-vital-summary"><small>Current condition</small><strong>{stage.previewCard.currentHp ?? hpMax}<span> / {hpMax} HP</span></strong></div>
    <div className="character-sheet-resource-grid character-sheet-vital-controls">
      <CharacterSheetResourceControl label="Hit points" value={stage.previewCard.currentHp ?? hpMax} max={hpMax} disabled={model.readOnly} onChange={stage.stageHp} />
      <CharacterSheetResourceControl label="Temporary HP" value={tempHp} note="Temporary HP sits above your normal HP." disabled={model.readOnly} onChange={(value) => model.setField("hpTemp", String(value))} />
    </div>
  </div>;
}
