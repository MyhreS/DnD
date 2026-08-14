import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_DEFS } from "@/data/storage";
import type { SlotLocation } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { availableUnitsFor, catalogueItemsForTarget, type CarryUnit, unitLabel } from "./view4Carrying";
import { useEquipmentPicker, type EquipmentPickerOption } from "./view4EquipmentPickerContext";
import { View4EquipmentSocket, type EquipmentGlyph } from "./View4EquipmentSocket";

const COPY: Record<SlotLocation, { label: string; hint: string }> = {
  hand: { label: "Held gear", hint: "2 significant or 1 oversized" },
  back: { label: "Back", hint: "1 significant" },
  chest: { label: "Front", hint: "1 significant" },
  hip: { label: "Hip", hint: "1 significant" },
  ankle: { label: "Ankle", hint: "Requires a holster" },
};

function storageAt(location: SlotLocation, equipped: string[]) {
  return equipped.find((id) => {
    const definition = STORAGE_DEFS.find((entry) => entry.itemId === id);
    return definition?.requires?.location === location || (!definition?.requires && definition?.gives.location === location);
  });
}

export function View4CarryPoint({ location, units, readOnly }: { location: SlotLocation; units: CarryUnit[]; readOnly: boolean }) {
  const automation = useCharacterAutomation();
  const picker = useEquipmentPicker();
  const equipped = automation.card.equippedStorageIds ?? [];
  const storageId = storageAt(location, equipped);
  const storage = storageId ? STORAGE_DEFS.find((entry) => entry.itemId === storageId) : undefined;
  const placed = units.filter((unit) => unit.assignment === location);
  const choices = availableUnitsFor(automation.card, units, location);
  const storageChoices = STORAGE_DEFS.filter((definition) => (
    definition.requires?.location === location || (!definition.requires && definition.gives.location === location)
  ) && !equipped.includes(definition.itemId));
  const significantUsed = placed.filter((unit) => unit.item.carry === "Significant").length;
  const oversizedUsed = placed.some((unit) => unit.item.carry === "Oversized");
  const baseOpen = location === "hand" ? (oversizedUsed ? 0 : 2 - significantUsed) : location === "ankle" ? 0 : 1 - placed.length;
  const canChoose = !storage && (baseOpen > 0 || storageChoices.length > 0);
  const catalogue = catalogueItemsForTarget(automation.card, location);

  function glyph(unit: CarryUnit): EquipmentGlyph {
    return unit.item.category === "Weapon" ? "weapon" : "gear";
  }

  function openEmpty(slotNumber: number) {
    const inventory: EquipmentPickerOption[] = choices.map((unit) => ({
      id: `${unit.item.id}-${unit.index}`,
      name: unitLabel(unit, units),
      detail: `${unit.item.category} · ${unit.item.carry} · ${unit.item.weightLb} lb`,
      kind: glyph(unit),
      onChoose: () => automation.setSlotAssignment(unit.item.id, unit.index, location),
    }));
    const gameStorage: EquipmentPickerOption[] = storageChoices.map((definition) => ({
      id: definition.itemId,
      name: ITEM_BY_ID[definition.itemId]?.name ?? definition.itemId,
      detail: `Storage · opens ${definition.gives.count} slots`,
      kind: "storage",
      onChoose: () => automation.toggleStorage(definition.itemId),
    }));
    picker.openPicker({
      title: `${COPY[location].label}${baseOpen > 1 ? ` · slot ${slotNumber}` : ""}`,
      hint: COPY[location].hint,
      inventory,
      catalogue: [...gameStorage, ...catalogue.map((item) => ({
        id: item.id,
        name: item.name,
        detail: `${item.category} · ${item.carry} · ${item.weightLb} lb`,
        kind: item.category === "Weapon" ? "weapon" as const : "gear" as const,
        onChoose: () => automation.addCatalogItemToSlot(item.id, location),
      }))],
      unique: { kind: "gear", target: location, carry: location === "hand" ? "Either" : "Significant" },
    });
  }

  return <div className={`v4-carry-point v4-carry-${location}`}>
    <header><span>{COPY[location].label}</span><small>{storage ? `${storage.gives.count} slots` : COPY[location].hint}</small></header>
    {storageId && <View4EquipmentSocket name={ITEM_BY_ID[storageId]?.name ?? storageId} detail={`Opens ${storage?.gives.count ?? 0} slots`} kind="storage" disabled={readOnly} compact onClick={() => picker.openPicker({ title: COPY[location].label, current: { id: storageId, name: ITEM_BY_ID[storageId]?.name ?? storageId, detail: "Equipped storage", kind: "storage", onChoose: () => undefined }, onRemove: () => automation.toggleStorage(storageId) })} />}
    {placed.map((unit) => <View4EquipmentSocket key={`${unit.item.id}-${unit.index}`} name={unitLabel(unit, units)} detail={`${unit.item.carry} · ${unit.item.weightLb} lb`} kind={glyph(unit)} disabled={readOnly} compact onClick={() => picker.openPicker({ title: COPY[location].label, current: { id: `${unit.item.id}-${unit.index}`, name: unitLabel(unit, units), detail: unit.item.note, kind: glyph(unit), onChoose: () => undefined }, onRemove: () => automation.setSlotAssignment(unit.item.id, unit.index, null) })} />)}
    {canChoose && Array.from({ length: Math.max(1, baseOpen) }, (_, index) => <View4EquipmentSocket key={index} label={`Slot ${placed.length + index + 1}`} disabled={readOnly} compact onClick={() => openEmpty(placed.length + index + 1)} />)}
  </div>;
}
