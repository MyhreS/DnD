import { useState, type Dispatch, type SetStateAction } from "react";
import type { CarrySignificance, Item } from "@/types";
import { itemPriceLabel } from "@/data/items";
import { BLOODVIAL_ITEM_ID, BLOODVIAL_PURITIES } from "@/data/bloodvial";
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

const CATALOG_CATEGORIES = ["Weapon", "Ammunition", "Tool", "Gear", "Consumable", "Valuable"] as const;

interface CatalogChoice {
  /** The item id, or "blood-vial:<purity>" for a Bloodvial of that purity. */
  value: string;
  name: string;
  category: string;
  detail: string;
  search: string;
}

function catalogChoices(catalog: Item[]): CatalogChoice[] {
  return catalog.flatMap((item) => {
    const price = item.priceGp === undefined ? "" : ` · ${itemPriceLabel(item.priceGp)}`;
    if (item.id === BLOODVIAL_ITEM_ID) {
      // Each purity is its own choice and its own inventory line.
      return BLOODVIAL_PURITIES.map((purity) => ({
        value: `${item.id}:${purity.id}`,
        name: `${item.name} · ${purity.name}`,
        category: item.category,
        detail: `${item.carry} · ${item.weightLb} lb`,
        search: `${item.name} blood vial ${purity.name} ${item.category}`.toLowerCase(),
      }));
    }
    return [{
      value: item.id,
      name: item.name,
      category: item.category,
      detail: `${item.carry} · ${item.weightLb} lb${price}`,
      search: `${item.name} ${item.category} ${item.carry}`.toLowerCase(),
    }];
  });
}

/** The game catalogue as a searchable list: type to filter, tap to add. */
export function CatalogItemForm({ catalog, onAdd }: { catalog: Item[]; onAdd: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = catalogChoices(catalog).filter((choice) => words.every((word) => choice.search.includes(word)));

  return (
    <div className="appsheet-catalog-search">
      <input
        type="search"
        className="appsheet-catalog-search-input"
        placeholder="Search the catalogue — e.g. rope, vial, pistol"
        aria-label="Search the game catalogue"
        data-dialog-autofocus
        data-testid="appsheet-catalog-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="appsheet-catalog-results" data-testid="appsheet-catalog-results">
        {CATALOG_CATEGORIES.map((category) => {
          const inCategory = matches.filter((choice) => choice.category === category);
          if (!inCategory.length) return null;
          return <section key={category} aria-label={category}>
            <h4>{category}</h4>
            {inCategory.map((choice) => (
              <button key={choice.value} type="button" data-haptic="success" aria-label={`Add ${choice.name}`} onClick={() => onAdd(choice.value)}>
                <b>{choice.name}</b>
                <small>{choice.detail}</small>
                <span aria-hidden="true">＋</span>
              </button>
            ))}
          </section>;
        })}
        {!matches.length && <p className="appsheet-empty-copy">Nothing in the catalogue matches “{query.trim()}”. Use “Unique item” for something the GM made up.</p>}
      </div>
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
