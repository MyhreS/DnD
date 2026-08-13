import { ITEM_BY_ID } from "@/data/items";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

const POSITIONS = [
  { label: "Hands", ids: ["sack"] },
  { label: "Back", ids: ["backpack", "carrying-harness"] },
  { label: "Front", ids: ["bandolier"] },
  { label: "Hip", ids: ["tool-belt"] },
  { label: "Ankle", ids: ["ankle-holster"] },
] as const;

const locationLabel = (location: string) => location === "chest" ? "Front" : `${location[0].toUpperCase()}${location.slice(1)}`;

function storageRule(id: string): string {
  const definition = STORAGE_BY_ITEM_ID[id];
  const required = definition.requires
    ? `Uses ${locationLabel(definition.requires.location)}`
    : "Uses no slot";
  const restriction = definition.gives.only ? " · Dagger or Pistol only" : "";
  return `${required} · Grants ${definition.gives.count} ${locationLabel(definition.gives.location)} slot${definition.gives.count === 1 ? "" : "s"}${restriction}`;
}

export function View4StorageEquipment({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card } = automation;
  const owned = new Set(resolveInventory(card).map(({ item }) => item.id));
  const equipped = new Set(card.equippedStorageIds ?? []);

  return <section className="v4-storage-equipment">
    <header><div><small>Storage equipment</small><h3>Wear your carrying gear</h3></div></header>
    <p>Storage uses the body position shown, then creates its own item slots below.</p>
    <div className="v4-storage-grid">
      {POSITIONS.map((position) => {
        const current = position.ids.find((id) => equipped.has(id)) ?? "";
        const choices = position.ids.filter((id) => owned.has(id) || equipped.has(id));
        return <label key={position.label}>
          <span>{position.label}</span>
          <select
            aria-label={`${position.label} storage equipment`}
            value={current}
            disabled={model.readOnly}
            onChange={(event) => {
              const next = event.target.value;
              if (next) automation.toggleStorage(next);
              else if (current) automation.toggleStorage(current);
            }}
          >
            <option value="">None</option>
            {choices.map((id) => <option key={id} value={id}>{ITEM_BY_ID[id]?.name ?? id}</option>)}
          </select>
          <small>{current ? storageRule(current) : `No ${position.label.toLowerCase()} storage equipped`}</small>
        </label>;
      })}
    </div>
  </section>;
}
