import { ITEMS } from "@/data/items";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";
import { availableSlotAssignmentOptions, computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import type { SlotAssignment } from "@/types";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

const MAX_RENDERED_UNITS = 99;

export function View4CarryingSlots({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card } = automation;
  const slots = computeSlots(card);
  const assignable = resolveInventory(card).filter(({ item }) => item.category !== "Armor" && item.carry !== "Insignificant");
  const wornStorage = (card.equippedStorageIds ?? []).flatMap((id) => {
    const item = ITEMS.find((entry) => entry.id === id);
    return item ? [item] : [];
  });
  const placedCount = Object.values(slots.placedAssignments).reduce(
    (total, assignments) => total + assignments.filter(Boolean).length,
    0,
  );

  return <section className="v4-carrying-slots">
    <header><div><small>Equipment slots</small><h3>Weapons & carried gear</h3></div><strong>{placedCount} equipped</strong></header>
    <p>Choose a slot here to equip an item. Choose Inventory to return it to the Inventory drawer.</p>
    <div className="v4-carrying-capacity">
      {slots.rows.map((row) => <span key={row.key}><b>{SLOT_LOCATION_LABEL[row.location]}</b><small>{row.kind} · {row.used}/{row.capacity}</small></span>)}
    </div>
    {wornStorage.length > 0 && <div className="v4-worn-storage">
      {wornStorage.map((item) => <div key={item.id}><span><b>{item.name}</b><small>Worn storage</small></span><button type="button" disabled={model.readOnly} onClick={() => automation.toggleStorage(item.id)}>Return to inventory</button></div>)}
    </div>}
    <div className="v4-carrying-items">
      {assignable.map(({ item, qty }) => {
        const storage = STORAGE_BY_ITEM_ID[item.id];
        if (storage) return <div key={item.id} className="v4-carrying-storage"><span><b>{item.name}</b><small>{qty > 1 ? `${qty} available · ` : ""}Adds {storage.gives.count} {SLOT_LOCATION_LABEL[storage.gives.location].toLowerCase()} slots</small></span><button type="button" disabled={model.readOnly} onClick={() => automation.toggleStorage(item.id)}>Wear</button></div>;
        const assignments = card.slotAssignments?.[item.id] ?? [];
        return Array.from({ length: Math.min(qty, MAX_RENDERED_UNITS) }, (_, index) => <label key={`${item.id}-${index}`}>
          <span><b>{item.name}</b><small>{qty > 1 ? `Item ${index + 1} of ${qty}` : item.carry}</small></span>
          <select
            aria-label={`${item.name} item ${index + 1} equipment slot`}
            disabled={model.readOnly}
            value={assignments[index] ?? ""}
            onChange={(event) => automation.setSlotAssignment(item.id, index, event.target.value as SlotAssignment || null)}
          >
            <option value="">Inventory</option>
            {availableSlotAssignmentOptions(card, item.id, index, item.carry, item.slotLocation).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>);
      })}
      {!assignable.length && !wornStorage.length && <p className="v4-carrying-empty">Add significant gear to Inventory, then equip it here.</p>}
    </div>
  </section>;
}
