import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_DEFS } from "@/data/storage";
import type { SlotLocation } from "@/types";
import { useCharacterAutomation, type SlotReplacement } from "../papersheet/characterAutomationContext";
import { availableUnitsFor, catalogueItemsForTarget, type CarryUnit, unitLabel } from "./characterSheetCarrying";
import { useEquipmentPicker, type EquipmentPickerOption } from "./characterSheetEquipmentPickerContext";
import { CharacterSheetEquipmentSocket, type EquipmentGlyph } from "./CharacterSheetEquipmentSocket";

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

export function CharacterSheetCarryPoint({ location, units, readOnly }: { location: SlotLocation; units: CarryUnit[]; readOnly: boolean }) {
  const automation = useCharacterAutomation();
  const picker = useEquipmentPicker();
  const equipped = automation.card.equippedStorageIds ?? [];
  const storageId = storageAt(location, equipped);
  const storage = storageId ? STORAGE_DEFS.find((entry) => entry.itemId === storageId) : undefined;
  const placed = units.filter((unit) => unit.assignment === location);
  const storageChoices = STORAGE_DEFS.filter((definition) => (
    definition.requires?.location === location || (!definition.requires && definition.gives.location === location)
  ) && !equipped.includes(definition.itemId));
  const significantUsed = placed.filter((unit) => unit.item.carry === "Significant").length;
  const oversizedUsed = placed.some((unit) => unit.item.carry === "Oversized");
  const baseOpen = location === "hand" ? (oversizedUsed ? 0 : 2 - significantUsed) : location === "ankle" ? 0 : 1 - placed.length;
  const canChoose = !storage && (baseOpen > 0 || storageChoices.length > 0);

  function glyph(unit: CarryUnit): EquipmentGlyph {
    return unit.item.category === "Weapon" ? "weapon" : "gear";
  }

  function openSlot(slotNumber: number, current?: CarryUnit, currentStorageId?: string) {
    const replace: SlotReplacement | undefined = current
      ? { id: current.item.id, index: current.index }
      : currentStorageId ? { id: currentStorageId, storage: true } : undefined;
    let candidateCard = currentStorageId
      ? { ...automation.card, equippedStorageIds: equipped.filter((id) => id !== currentStorageId) }
      : automation.card;
    if (current) {
      const assignments = [...(automation.card.slotAssignments?.[current.item.id] ?? [])];
      assignments[current.index] = null;
      candidateCard = { ...candidateCard, slotAssignments: { ...(candidateCard.slotAssignments ?? {}), [current.item.id]: assignments } };
    }
    const candidateUnits = units.map((unit) => unit === current ? { ...unit, assignment: null } : unit);
    const choices = availableUnitsFor(candidateCard, candidateUnits, location).filter((unit) => unit !== current);
    const catalogue = catalogueItemsForTarget(candidateCard, location);
    const compatibleStorage = STORAGE_DEFS.filter((definition) => (
      definition.requires?.location === location || (!definition.requires && definition.gives.location === location)
    ) && definition.itemId !== currentStorageId);
    const ownedStorage = new Set((automation.card.inventory ?? []).filter((entry) => entry.qty > 0).map((entry) => entry.itemId));
    const storageOption = (definition: (typeof STORAGE_DEFS)[number]): EquipmentPickerOption => ({
      id: definition.itemId,
      name: ITEM_BY_ID[definition.itemId]?.name ?? definition.itemId,
      detail: `Storage · opens ${definition.gives.count} slots`,
      kind: "storage",
      onChoose: () => automation.toggleStorage(definition.itemId, replace),
    });
    picker.openPicker({
      title: `${COPY[location].label}${baseOpen > 1 ? ` · slot ${slotNumber}` : ""}`,
      hint: COPY[location].hint,
      current: current ? {
        id: `${current.item.id}-${current.index}`,
        name: unitLabel(current, units),
        detail: current.item.note,
        kind: glyph(current),
        onChoose: () => undefined,
      } : currentStorageId ? {
        id: currentStorageId,
        name: ITEM_BY_ID[currentStorageId]?.name ?? currentStorageId,
        detail: "Equipped storage",
        kind: "storage",
        onChoose: () => undefined,
      } : undefined,
      onRemove: current
        ? () => automation.setSlotAssignment(current.item.id, current.index, null)
        : currentStorageId ? () => automation.toggleStorage(currentStorageId) : undefined,
      inventory: [
        ...compatibleStorage.filter((definition) => ownedStorage.has(definition.itemId)).map(storageOption),
        ...choices.map((unit) => ({
          id: `${unit.item.id}-${unit.index}`,
          name: unitLabel(unit, units),
          detail: `${unit.item.category} · ${unit.item.carry} · ${unit.item.weightLb} lb`,
          kind: glyph(unit),
          onChoose: () => automation.setSlotAssignment(unit.item.id, unit.index, location, replace),
        })),
      ],
      catalogue: [
        ...compatibleStorage.map(storageOption),
        ...catalogue.map((item) => ({
          id: item.id,
          name: item.name,
          detail: `${item.category} · ${item.carry} · ${item.weightLb} lb`,
          kind: item.category === "Weapon" ? "weapon" as const : "gear" as const,
          onChoose: () => automation.addCatalogItemToSlot(item.id, location, replace),
        })),
      ],
      unique: { kind: "gear", target: location, carry: location === "hand" ? "Either" : "Significant", replace },
    });
  }

  return <div className={`character-sheet-carry-point character-sheet-carry-${location}`}>
    <header><span>{COPY[location].label}</span><small>{storage ? `${storage.gives.count} slots` : COPY[location].hint}</small></header>
    {storageId && <CharacterSheetEquipmentSocket name={ITEM_BY_ID[storageId]?.name ?? storageId} detail={`Opens ${storage?.gives.count ?? 0} slots`} kind="storage" disabled={readOnly} compact onClick={() => openSlot(1, undefined, storageId)} />}
    {placed.map((unit, index) => <CharacterSheetEquipmentSocket key={`${unit.item.id}-${unit.index}`} name={unitLabel(unit, units)} detail={`${unit.item.carry} · ${unit.item.weightLb} lb`} kind={glyph(unit)} disabled={readOnly} compact onClick={() => openSlot(index + 1, unit)} />)}
    {canChoose && Array.from({ length: Math.max(1, baseOpen) }, (_, index) => <CharacterSheetEquipmentSocket key={index} label={`Slot ${placed.length + index + 1}`} disabled={readOnly} compact onClick={() => openSlot(placed.length + index + 1)} />)}
  </div>;
}
