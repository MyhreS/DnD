import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import type { SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { availableUnitsFor, parseUnitValue, type CarryUnit, unitLabel, unitValue } from "./view4Carrying";

const LOCATION_LABEL = { hand: "held", back: "back", chest: "front", hip: "hip", ankle: "ankle" } as const;

export function View4StorageRack({ storageId, units, readOnly }: { storageId: string; units: CarryUnit[]; readOnly: boolean }) {
  const automation = useCharacterAutomation();
  const definition = STORAGE_BY_ITEM_ID[storageId];
  if (!definition) return null;
  const slots = Array.from({ length: definition.gives.count }, (_, index) => {
    const target = `storage:${storageId}:${index + 1}` as SlotAssignment;
    return { target, unit: units.find((entry) => entry.assignment === target), choices: availableUnitsFor(automation.card, units, target) };
  });
  const used = slots.filter((slot) => slot.unit).length;

  function choose(value: string, target: SlotAssignment) {
    const unit = parseUnitValue(value);
    if (unit) automation.setSlotAssignment(unit.itemId, unit.index, target);
  }

  return <details className="v4-storage-rack" open>
    <summary><span><strong>{ITEM_BY_ID[storageId]?.name ?? storageId}</strong><small>{LOCATION_LABEL[definition.gives.location]} storage · {used}/{definition.gives.count} filled</small></span><b>{used}/{definition.gives.count}</b></summary>
    <div className={`v4-storage-cells${definition.gives.count > 8 ? " is-dense" : ""}`}>
      {slots.map(({ target, unit, choices }, index) => <div className={`v4-storage-cell${unit ? " is-filled" : ""}`} key={target}>
        <small>{index + 1}</small>
        {unit ? <><strong>{unitLabel(unit, units)}</strong><button type="button" aria-label={`Return ${unit.item.name} to inventory`} disabled={readOnly} onClick={() => automation.setSlotAssignment(unit.item.id, unit.index, null)}>×</button></> : <select aria-label={`${ITEM_BY_ID[storageId]?.name} slot ${index + 1}`} disabled={readOnly || choices.length === 0} value="" onChange={(event) => choose(event.target.value, target)}><option value="">{choices.length ? "Choose item" : "Empty"}</option>{choices.map((choice) => <option key={unitValue(choice)} value={unitValue(choice)}>{unitLabel(choice, units)}</option>)}</select>}
      </div>)}
    </div>
    {definition.gives.only && <p>Only {definition.gives.only.map((id) => ITEM_BY_ID[id]?.name ?? id).join(" or ")} can use this slot.</p>}
  </details>;
}
