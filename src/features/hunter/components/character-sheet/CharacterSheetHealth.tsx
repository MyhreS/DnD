import { isBloodied } from "@/lib/character";
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
  const currentHp = stage.previewCard.currentHp ?? hpMax;
  // core-rulebook.txt [page 29] "Bloodied" — flags the existing HP readout.
  const bloodied = isBloodied(currentHp, hpMax);
  return <div className="character-sheet-vital-page character-sheet-health-page">
    <div className="character-sheet-vital-summary" data-bloodied={bloodied || undefined}><small>{bloodied ? "Current condition · Bloodied" : "Current condition"}</small><strong>{currentHp}<span> / {hpMax} HP</span></strong></div>
    <div className="character-sheet-resource-grid character-sheet-vital-controls">
      <CharacterSheetResourceControl label="Hit points" value={currentHp} max={hpMax} disabled={model.readOnly} onChange={stage.stageHp} />
      <CharacterSheetResourceControl label="Temporary HP" value={tempHp} note="Temporary HP sits above your normal HP." disabled={model.readOnly} onChange={(value) => model.setField("hpTemp", String(value))} />
    </div>
  </div>;
}
