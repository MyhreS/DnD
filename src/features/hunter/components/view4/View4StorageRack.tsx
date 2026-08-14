import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import type { SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { availableUnitsFor, catalogueItemsForTarget, type CarryUnit, unitLabel } from "./view4Carrying";
import { useEquipmentPicker } from "./view4EquipmentPickerContext";
import { View4EquipmentSocket } from "./View4EquipmentSocket";

const LOCATION_LABEL = { hand: "held", back: "back", chest: "front", hip: "hip", ankle: "ankle" } as const;

export function View4StorageRack({ storageId, units, readOnly }: { storageId: string; units: CarryUnit[]; readOnly: boolean }) {
  const automation = useCharacterAutomation();
  const picker = useEquipmentPicker();
  const definition = STORAGE_BY_ITEM_ID[storageId];
  if (!definition) return null;
  const slots = Array.from({ length: definition.gives.count }, (_, index) => {
    const target = `storage:${storageId}:${index + 1}` as SlotAssignment;
    return { target, unit: units.find((entry) => entry.assignment === target), choices: availableUnitsFor(automation.card, units, target) };
  });
  const used = slots.filter((slot) => slot.unit).length;

  function openEmpty(target: SlotAssignment, index: number, choices: CarryUnit[]) {
    const catalogue = catalogueItemsForTarget(automation.card, target);
    picker.openPicker({
      title: `${ITEM_BY_ID[storageId]?.name ?? storageId} · slot ${index + 1}`,
      hint: definition.gives.only ? `Only ${definition.gives.only.map((id) => ITEM_BY_ID[id]?.name ?? id).join(" or ")} fits here.` : "Choose what this compartment carries.",
      inventory: choices.map((unit) => ({ id: `${unit.item.id}-${unit.index}`, name: unitLabel(unit, units), detail: `${unit.item.category} · ${unit.item.weightLb} lb`, kind: unit.item.category === "Weapon" ? "weapon" : "gear", onChoose: () => automation.setSlotAssignment(unit.item.id, unit.index, target) })),
      catalogue: catalogue.map((item) => ({ id: item.id, name: item.name, detail: `${item.category} · ${item.weightLb} lb`, kind: item.category === "Weapon" ? "weapon" : "gear", onChoose: () => automation.addCatalogItemToSlot(item.id, target) })),
      unique: definition.gives.only ? undefined : { kind: "gear", target, carry: "Significant" },
    });
  }

  return <details className="v4-storage-rack" open>
    <summary><span><strong>{ITEM_BY_ID[storageId]?.name ?? storageId}</strong><small>{LOCATION_LABEL[definition.gives.location]} storage · {used}/{definition.gives.count} filled</small></span><b>{used}/{definition.gives.count}</b></summary>
    <div className={`v4-storage-cells${definition.gives.count > 8 ? " is-dense" : ""}`}>
      {slots.map(({ target, unit, choices }, index) => <div className={`v4-storage-cell${unit ? " is-filled" : ""}`} key={target}>
        <small>{index + 1}</small>
        {unit ? <View4EquipmentSocket name={unitLabel(unit, units)} detail={`${unit.item.weightLb} lb`} kind={unit.item.category === "Weapon" ? "weapon" : "gear"} disabled={readOnly} compact onClick={() => picker.openPicker({ title: `${ITEM_BY_ID[storageId]?.name ?? storageId} · slot ${index + 1}`, current: { id: `${unit.item.id}-${unit.index}`, name: unitLabel(unit, units), detail: unit.item.note, kind: unit.item.category === "Weapon" ? "weapon" : "gear", onChoose: () => undefined }, onRemove: () => automation.setSlotAssignment(unit.item.id, unit.index, null) })} /> : <View4EquipmentSocket label={`Slot ${index + 1}`} disabled={readOnly} compact onClick={() => openEmpty(target, index, choices)} />}
      </div>)}
    </div>
    {definition.gives.only && <p>Only {definition.gives.only.map((id) => ITEM_BY_ID[id]?.name ?? id).join(" or ")} can use this slot.</p>}
  </details>;
}
