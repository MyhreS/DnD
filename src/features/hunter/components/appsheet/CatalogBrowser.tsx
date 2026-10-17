import { useState } from "react";
import type { BloodvialPurity, Item } from "@/types";
import { itemPriceLabel } from "@/data/items";
import { BLOODVIAL_ITEM_ID, BLOODVIAL_PURITIES } from "@/data/bloodvial";
import { BloodvialIcon, CatalogCategoryIcon, type CatalogCategory } from "./CatalogIcons";
import "./catalog-browser.css";

const CATEGORIES: Array<{ id: CatalogCategory; label: string }> = [
  { id: "Weapon", label: "Weapons" },
  { id: "Ammunition", label: "Ammunition" },
  { id: "Tool", label: "Tools" },
  { id: "Gear", label: "Gear" },
  { id: "Consumable", label: "Consumables" },
  { id: "Valuable", label: "Valuables" },
];

interface CatalogEntry {
  /** The item id, or "blood-vial:<purity>" for a Bloodvial of that purity. */
  value: string;
  name: string;
  category: CatalogCategory;
  tags: string[];
  note: string;
  purity?: BloodvialPurity;
  firearm?: boolean;
  search: string;
}

function entriesFor(catalog: Item[]): CatalogEntry[] {
  return catalog.flatMap((item): CatalogEntry[] => {
    const category = item.category as CatalogCategory;
    const tags = [`${item.weightLb} lb`, item.carry, ...(item.priceGp === undefined ? [] : [itemPriceLabel(item.priceGp)])];
    if (item.id === BLOODVIAL_ITEM_ID) {
      // Each purity is its own entry and its own inventory line.
      return BLOODVIAL_PURITIES.map((purity) => ({
        value: `${item.id}:${purity.id}`,
        name: `${item.name} · ${purity.name}`,
        category,
        tags,
        note: purity.note,
        purity: purity.id,
        search: `${item.name} blood vial ${purity.name} ${category}`.toLowerCase(),
      }));
    }
    const firearm = category === "Weapon" && /rifle|pistol|gun|musket|blunderbuss|cannon|carbine/i.test(item.name);
    return [{ value: item.id, name: item.name, category, firearm, tags, note: item.note ?? "", search: `${item.name} ${category} ${item.carry} ${item.note ?? ""}`.toLowerCase() }];
  });
}

/** The game catalogue: search, filter by category, tap a card to add it. */
export function CatalogBrowser({ catalog, onAdd }: { catalog: Item[]; onAdd: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CatalogCategory | "All">("All");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = entriesFor(catalog);
  const searched = all.filter((entry) => words.every((word) => entry.search.includes(word)));
  const shown = searched.filter((entry) => category === "All" || entry.category === category);
  const count = (id: CatalogCategory | "All") => (id === "All" ? searched.length : searched.filter((entry) => entry.category === id).length);

  return (
    <div className="catalog-browser" data-testid="appsheet-catalog">
      <label className="catalog-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
        <input type="search" placeholder="Search — rope, vial, silver, pistol…" aria-label="Search the game catalogue" data-dialog-autofocus data-testid="appsheet-catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="catalog-chips" role="group" aria-label="Filter by category">
        {[{ id: "All" as const, label: "All" }, ...CATEGORIES].map((chip) => (
          <button key={chip.id} type="button" data-haptic aria-pressed={category === chip.id} disabled={chip.id !== "All" && count(chip.id) === 0} onClick={() => setCategory(chip.id)}>
            <CatalogCategoryIcon category={chip.id} />
            <span>{chip.label}</span>
            <small>{count(chip.id)}</small>
          </button>
        ))}
      </div>
      <div className="catalog-grid" data-testid="appsheet-catalog-results">
        {shown.map((entry) => (
          <button key={entry.value} type="button" className={`catalog-card is-${entry.category.toLowerCase()}`} data-haptic="success" aria-label={`Add ${entry.name}`} onClick={() => onAdd(entry.value)}>
            <span className="catalog-card-art">{entry.purity ? <BloodvialIcon purity={entry.purity} /> : <CatalogCategoryIcon category={entry.firearm ? "Firearm" : entry.category} />}</span>
            <span className="catalog-card-body">
              <b>{entry.name}</b>
              <span className="catalog-card-tags">{entry.tags.map((tag) => <em key={tag}>{tag}</em>)}</span>
              {entry.note && <small>{entry.note}</small>}
            </span>
            <span className="catalog-card-add" aria-hidden="true">+</span>
          </button>
        ))}
        {!shown.length && <p className="catalog-empty">Nothing in the catalogue matches{query.trim() ? ` “${query.trim()}”` : ""}. Use “Record a unique item” for something the GM made up.</p>}
      </div>
    </div>
  );
}
