import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import type { SlotAssignment } from "@/types";
import { useCharacterAutomation, type SlotReplacement } from "../papersheet/characterAutomationContext";
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
    return { target, unit: units.find((entry) => entry.assignment === target) };
  });
  const used = slots.filter((slot) => slot.unit).length;

  function openSlot(target: SlotAssignment, index: number, current?: CarryUnit) {
    const replace: SlotReplacement | undefined = current ? { id: current.item.id, index: current.index } : undefined;
    const candidateUnits = units.map((unit) => unit === current ? { ...unit, assignment: null } : unit);
    const currentAssignments = current ? [...(automation.card.slotAssignments?.[current.item.id] ?? [])] : [];
    if (current) currentAssignments[current.index] = null;
    const candidateCard = current ? {
      ...automation.card,
      slotAssignments: { ...(automation.card.slotAssignments ?? {}), [current.item.id]: currentAssignments },
    } : automation.card;
    const choices = availableUnitsFor(candidateCard, candidateUnits, target).filter((unit) => unit !== current);
    const catalogue = catalogueItemsForTarget(candidateCard, target);
    picker.openPicker({
      title: `${ITEM_BY_ID[storageId]?.name ?? storageId} · slot ${index + 1}`,
      hint: definition.gives.only ? `Only ${definition.gives.only.map((id) => ITEM_BY_ID[id]?.name ?? id).join(" or ")} fits here.` : "Choose what this compartment carries.",
      current: current ? {
        id: `${current.item.id}-${current.index}`,
        name: unitLabel(current, units),
        detail: current.item.note,
        kind: current.item.category === "Weapon" ? "weapon" : "gear",
        onChoose: () => undefined,
      } : undefined,
      onRemove: current ? () => automation.setSlotAssignment(current.item.id, current.index, null) : undefined,
      inventory: choices.map((unit) => ({
        id: `${unit.item.id}-${unit.index}`,
        name: unitLabel(unit, units),
        detail: `${unit.item.category} · ${unit.item.weightLb} lb`,
        kind: unit.item.category === "Weapon" ? "weapon" : "gear",
        onChoose: () => automation.setSlotAssignment(unit.item.id, unit.index, target, replace),
      })),
      catalogue: catalogue.map((item) => ({
        id: item.id,
        name: item.name,
        detail: `${item.category} · ${item.weightLb} lb`,
        kind: item.category === "Weapon" ? "weapon" : "gear",
        onChoose: () => automation.addCatalogItemToSlot(item.id, target, replace),
      })),
      unique: { kind: "gear", target, carry: "Significant", replace, allowedBaseIds: definition.gives.only },
    });
  }

  return <details className="v4-storage-rack" open>
    <summary><span><strong>{ITEM_BY_ID[storageId]?.name ?? storageId}</strong><small>{LOCATION_LABEL[definition.gives.location]} storage · {used}/{definition.gives.count} filled</small></span><b>{used}/{definition.gives.count}</b></summary>
    <div className={`v4-storage-cells${definition.gives.count > 8 ? " is-dense" : ""}`}>
      {slots.map(({ target, unit }, index) => <div className={`v4-storage-cell${unit ? " is-filled" : ""}`} key={target}>
        <small>{index + 1}</small>
        <View4EquipmentSocket
          label={`Slot ${index + 1}`}
          name={unit ? unitLabel(unit, units) : undefined}
          detail={unit ? `${unit.item.weightLb} lb` : undefined}
          kind={unit?.item.category === "Weapon" ? "weapon" : "gear"}
          disabled={readOnly}
          compact
          onClick={() => openSlot(target, index, unit)}
        />
      </div>)}
    </div>
    {definition.gives.only && <p>Only {definition.gives.only.map((id) => ITEM_BY_ID[id]?.name ?? id).join(" or ")} can use this slot.</p>}
  </details>;
}
