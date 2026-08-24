import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetFigure } from "./CharacterSheetFigure";
import { CharacterSheetCarryPoint } from "./CharacterSheetCarryPoint";
import { CharacterSheetStorageRack } from "./CharacterSheetStorageRack";
import { carryingUnits } from "./characterSheetCarrying";

export function CharacterSheetCarryingGear({ model }: { model: AppSheetModel }) {
  const { card } = useCharacterAutomation();
  const units = carryingUnits(card);
  const storage = card.equippedStorageIds ?? [];
  return <div className="character-sheet-carrying-gear">
    <div className="character-sheet-carry-stage">
      <CharacterSheetFigure classId={card.classId} />
      <CharacterSheetCarryPoint location="hand" units={units} readOnly={model.readOnly} />
      <CharacterSheetCarryPoint location="chest" units={units} readOnly={model.readOnly} />
      <CharacterSheetCarryPoint location="back" units={units} readOnly={model.readOnly} />
      <CharacterSheetCarryPoint location="hip" units={units} readOnly={model.readOnly} />
      <CharacterSheetCarryPoint location="ankle" units={units} readOnly={model.readOnly} />
    </div>
    {storage.length > 0 && <div className="character-sheet-storage-racks">{storage.map((storageId) => <CharacterSheetStorageRack storageId={storageId} units={units} readOnly={model.readOnly} key={storageId} />)}</div>}
    {!storage.length && !units.some((unit) => unit.assignment) && <p className="character-sheet-carrying-tip">Choose a body slot to carry gear. Equipping storage opens its extra compartments here.</p>}
  </div>;
}
