import type { Dispatch, SetStateAction } from "react";
import type { CarrySignificance, Item } from "@/types";
import { AppSelect, DecisionField } from "./appSheetShared";

export interface FoundItemDraft {
  name: string;
  category: "Weapon" | "Gear";
  carry: CarrySignificance;
  weightLb: number;
  note: string;
  attackBonus: string;
  damage: string;
  weaponNotes: string;
}

export function CatalogItemForm({
  catalog,
  catalogId,
  setCatalogId,
  onAdd,
}: {
  catalog: Item[];
  catalogId: string;
  setCatalogId: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="appsheet-catalog-add">
      <AppSelect label="Catalog item" value={catalogId} data-dialog-autofocus data-testid="appsheet-catalog-item" onChange={(event) => setCatalogId(event.target.value)}>
        <option value="">Choose an item…</option>
        {["Weapon", "Ammunition", "Tool", "Gear", "Consumable", "Valuable"].map((category) => (
          <optgroup key={category} label={category}>
            {catalog.filter((item) => item.category === category).map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.carry} · {item.weightLb} lb</option>
            ))}
          </optgroup>
        ))}
      </AppSelect>
      <button type="button" data-testid="appsheet-add-catalog-item" disabled={!catalogId} onClick={onAdd}>Add</button>
    </div>
  );
}

export function UniqueItemForm({
  found,
  setFound,
  onCancel,
  onAdd,
}: {
  found: FoundItemDraft;
  setFound: Dispatch<SetStateAction<FoundItemDraft>>;
  onCancel: () => void;
  onAdd: () => void;
}) {
  return (
    <form onSubmit={(event) => { event.preventDefault(); onAdd(); }}>
      <p className="appsheet-form-intro">This is the manual exception: record the mechanical facts supplied by the DM because the item has no catalog entry.</p>
      <div className="appsheet-form-grid">
        <DecisionField label="Unique item name"><input required data-dialog-autofocus value={found.name} onChange={(event) => setFound({ ...found, name: event.target.value })} /></DecisionField>
        <AppSelect label="Type" value={found.category} onChange={(event) => setFound({ ...found, category: event.target.value as FoundItemDraft["category"] })}><option>Weapon</option><option>Gear</option></AppSelect>
        <AppSelect label="Carrying category" value={found.carry} onChange={(event) => setFound({ ...found, carry: event.target.value as CarrySignificance })}><option>Insignificant</option><option>Significant</option><option>Oversized</option></AppSelect>
        <DecisionField label="Weight (lb)"><input type="number" min="0" step="0.1" required value={found.weightLb} onChange={(event) => setFound({ ...found, weightLb: Number(event.target.value) })} /></DecisionField>
      </div>
      {found.category === "Weapon" && <div className="appsheet-form-grid">
        <DecisionField label="Attack bonus"><input value={found.attackBonus} placeholder="e.g. +5" onChange={(event) => setFound({ ...found, attackBonus: event.target.value })} /></DecisionField>
        <DecisionField label="Damage"><input value={found.damage} placeholder="e.g. 1d8 Piercing" onChange={(event) => setFound({ ...found, damage: event.target.value })} /></DecisionField>
      </div>}
      <DecisionField label={found.category === "Weapon" ? "Properties and special rule" : "Special rule or note"}>
        <textarea value={found.category === "Weapon" ? found.weaponNotes : found.note} onChange={(event) => setFound(found.category === "Weapon" ? { ...found, weaponNotes: event.target.value } : { ...found, note: event.target.value })} />
      </DecisionField>
      <div className="appsheet-form-actions"><button type="button" onClick={onCancel}>Cancel</button><button type="submit">Add to inventory</button></div>
    </form>
  );
}
