import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4Figure } from "./View4Figure";
import { View4CarryPoint } from "./View4CarryPoint";
import { View4StorageRack } from "./View4StorageRack";
import { carryingUnits } from "./view4Carrying";

export function View4CarryingGear({ model }: { model: AppSheetModel }) {
  const { card } = useCharacterAutomation();
  const units = carryingUnits(card);
  const storage = card.equippedStorageIds ?? [];
  return <div className="v4-carrying-gear">
    <div className="v4-carry-stage">
      <View4Figure classId={card.classId} />
      <View4CarryPoint location="hand" units={units} readOnly={model.readOnly} />
      <View4CarryPoint location="chest" units={units} readOnly={model.readOnly} />
      <View4CarryPoint location="back" units={units} readOnly={model.readOnly} />
      <View4CarryPoint location="hip" units={units} readOnly={model.readOnly} />
      <View4CarryPoint location="ankle" units={units} readOnly={model.readOnly} />
    </div>
    {storage.length > 0 && <div className="v4-storage-racks">{storage.map((storageId) => <View4StorageRack storageId={storageId} units={units} readOnly={model.readOnly} key={storageId} />)}</div>}
    {!storage.length && !units.some((unit) => unit.assignment) && <p className="v4-carrying-tip">Choose a body slot to carry gear. Equipping storage opens its extra compartments here.</p>}
  </div>;
}
