import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_DEFS } from "@/data/storage";
import type { SlotLocation } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { availableUnitsFor, parseUnitValue, type CarryUnit, unitLabel, unitValue } from "./view4Carrying";

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

  function choose(value: string) {
    if (value.startsWith("storage:")) automation.toggleStorage(value.slice(8));
    else {
      const unit = parseUnitValue(value);
      if (unit) automation.setSlotAssignment(unit.itemId, unit.index, location);
    }
  }

  return <div className={`v4-carry-point v4-carry-${location}`}>
    <header><span>{COPY[location].label}</span><small>{storage ? `${storage.gives.count} slots` : COPY[location].hint}</small></header>
    {storageId && <div className="v4-carry-equipped is-storage"><strong>{ITEM_BY_ID[storageId]?.name ?? storageId}</strong><button type="button" disabled={readOnly} onClick={() => automation.toggleStorage(storageId)}>Remove</button></div>}
    {placed.map((unit) => <div className="v4-carry-equipped" key={`${unit.item.id}-${unit.index}`}><strong>{unitLabel(unit, units)}</strong><button type="button" disabled={readOnly} onClick={() => automation.setSlotAssignment(unit.item.id, unit.index, null)}>Return</button></div>)}
    {canChoose && <select aria-label={`Choose ${COPY[location].label.toLowerCase()}`} disabled={readOnly} value="" onChange={(event) => choose(event.target.value)}>
      <option value="">+ Add gear</option>
      {storageChoices.length > 0 && <optgroup label="Storage equipment">{storageChoices.map((definition) => <option key={definition.itemId} value={`storage:${definition.itemId}`}>{ITEM_BY_ID[definition.itemId]?.name} · adds {definition.gives.count}</option>)}</optgroup>}
      {choices.length > 0 && <optgroup label="From inventory">{choices.map((unit) => <option key={unitValue(unit)} value={unitValue(unit)}>{unitLabel(unit, units)}</option>)}</optgroup>}
    </select>}
  </div>;
}
