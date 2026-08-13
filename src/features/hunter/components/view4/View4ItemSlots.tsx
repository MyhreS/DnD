import { STORAGE_BY_ITEM_ID, STORAGE_DEFS } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";
import { availableSlotAssignmentOptions, computeSlots } from "@/lib/slots";
import type { CarrySignificance, Item, SlotAssignment } from "@/types";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

const MAX_RENDERED_UNITS = 99;
type Unit = { item: Item; index: number; assignment: SlotAssignment | null };
type Slot = { key: string; target: SlotAssignment; label: string; kind: "Significant" | "Oversized"; note?: string };
type SlotGroup = { id: string; title: string; note: string; slots: Slot[] };

const placeLabel = (location: string) => location === "chest" ? "Front" : `${location[0].toUpperCase()}${location.slice(1)}`;

function bodySlots(equipped: string[]): Slot[] {
  const defs = equipped.flatMap((id) => STORAGE_BY_ITEM_ID[id] ? [STORAGE_BY_ITEM_ID[id]] : []);
  const consumed = (location: string) => defs.some((def) => def.requires?.location === location);
  const result: Slot[] = [];
  if (!equipped.includes("sack")) {
    result.push({ key: "hand-oversized", target: "hand", label: "Hands", kind: "Oversized", note: "Alternative: 1 Oversized" });
    result.push(...[1, 2].map((number) => ({ key: `hand-${number}`, target: "hand" as const, label: `Hand ${number}`, kind: "Significant" as const, note: "2 Significant or 1 Oversized" })));
  }
  for (const location of ["chest", "back", "hip"] as const) {
    if (!consumed(location)) result.push({ key: location, target: location, label: placeLabel(location), kind: "Significant" });
  }
  return result;
}

function unitsFor(card: AppSheetModel["card"], slots: ReturnType<typeof computeSlots>): Unit[] {
  return resolveInventory(card)
    .filter(({ item }) => item.category !== "Armor" && item.carry !== "Insignificant" && !STORAGE_BY_ITEM_ID[item.id])
    .flatMap(({ item, qty }) => Array.from({ length: Math.min(qty, MAX_RENDERED_UNITS) }, (_, index) => ({
      item,
      index,
      assignment: slots.placedAssignments[item.id]?.[index] ?? null,
    })));
}

function ItemSlot({ slot, occupant, candidates, readOnly, assign }: {
  slot: Slot;
  occupant?: Unit;
  candidates: Unit[];
  readOnly: boolean;
  assign: (unit: Unit, target: SlotAssignment | null) => void;
}) {
  return <div className={`v4-item-slot${occupant ? " is-filled" : ""}`}>
    <span><b>{slot.label}</b><small>{slot.kind}{slot.note ? ` · ${slot.note}` : ""}</small></span>
    {occupant
      ? <button type="button" disabled={readOnly} onClick={() => assign(occupant, null)}><strong>{occupant.item.name}</strong><small>Return to inventory</small></button>
      : <select aria-label={`${slot.label} item`} disabled={readOnly} value="" onChange={(event) => {
        const [itemId, index] = event.target.value.split(":");
        const unit = candidates.find((candidate) => candidate.item.id === itemId && candidate.index === Number(index));
        if (unit) assign(unit, slot.target);
      }}><option value="">Choose item…</option>{candidates.map((unit) => <option key={`${unit.item.id}-${unit.index}`} value={`${unit.item.id}:${unit.index}`}>{unit.item.name}{unit.index ? ` · item ${unit.index + 1}` : ""}</option>)}</select>}
  </div>;
}

export function View4ItemSlots({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card } = automation;
  const computed = computeSlots(card);
  const units = unitsFor(card, computed);
  const groups: SlotGroup[] = [{
    id: "body", title: "Body slots", note: "Your hunter's free carrying positions", slots: bodySlots(card.equippedStorageIds ?? []),
  }, ...(card.equippedStorageIds ?? []).flatMap((id) => {
    const definition = STORAGE_DEFS.find((entry) => entry.itemId === id);
    if (!definition) return [];
    const name = id.split("-").map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");
    return [{ id, title: name, note: `${definition.gives.count} ${placeLabel(definition.gives.location)} Significant slot${definition.gives.count === 1 ? "" : "s"}${definition.gives.only ? " · Dagger or Pistol only" : ""}`, slots: Array.from({ length: definition.gives.count }, (_, index) => ({
      key: `${id}-${index + 1}`,
      target: `storage:${id}:${index + 1}` as SlotAssignment,
      label: `${placeLabel(definition.gives.location)} ${index + 1}`,
      kind: "Significant" as const,
    })) }];
  })];

  return <section className="v4-item-slots">
    <header><div><small>Item slots</small><h3>Place carried gear</h3></div></header>
    <p>Choose an empty slot to move an item from Inventory. Worn storage adds its slots here.</p>
    {groups.map((group) => <div className="v4-item-slot-group" key={group.id}>
      <header><b>{group.title}</b><small>{group.note}</small></header>
      <div>{group.slots.map((slot) => {
        const occupants = units.filter((unit) => unit.assignment === slot.target && (slot.target !== "hand" || unit.item.carry === slot.kind));
        const sameTargetIndex = group.slots.slice(0, group.slots.indexOf(slot)).filter((entry) => entry.target === slot.target && entry.kind === slot.kind).length;
        const occupant = occupants[sameTargetIndex];
        const candidates = units.filter((unit) => {
          if (unit.assignment || unit.item.carry !== slot.kind) return false;
          return availableSlotAssignmentOptions(card, unit.item.id, unit.index, unit.item.carry as CarrySignificance, unit.item.slotLocation).some((option) => option.value === slot.target);
        });
        return <ItemSlot key={slot.key} slot={slot} occupant={occupant} candidates={candidates} readOnly={model.readOnly} assign={(unit, target) => automation.setSlotAssignment(unit.item.id, unit.index, target)} />;
      })}</div>
    </div>)}
  </section>;
}
