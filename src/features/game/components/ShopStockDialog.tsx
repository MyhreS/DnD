import { useMemo, useState } from "react";
import type { Item, ShopLine, ShopState } from "@/types";
import { itemPriceLabel } from "@/data/items";
import {
  MAX_SHOP_LINES,
  parsePriceInput,
  patchLine,
  removeLine,
  searchCatalog,
  stockCatalogItem,
  stockCustomItem,
} from "@/features/play/lib/shop";
import { ShopStockRow } from "./ShopStockRow";

/** The DM's stock list: pick catalog items (prices prefilled from the price
 * list), override any price, and add custom wares the catalogue doesn't sell. */
export function ShopStockDialog({
  shop,
  busy,
  onSave,
  onOpenShop,
  onClose,
}: {
  shop: ShopState;
  busy: boolean;
  onSave: (next: ShopState) => Promise<boolean>;
  onOpenShop: (next: ShopState) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState(shop.name ?? "");
  const [lines, setLines] = useState<ShopLine[]>(shop.lines);
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const stockedIds = useMemo(
    () => new Set(lines.flatMap((line) => (line.itemId ? [line.itemId] : []))),
    [lines],
  );
  const results = useMemo(() => searchCatalog(query, stockedIds), [query, stockedIds]);
  const full = lines.length >= MAX_SHOP_LINES;

  function draft(): ShopState {
    const clean = name.trim();
    return { open: shop.open, ...(clean ? { name: clean } : {}), lines };
  }

  function stock(item: Item) {
    setLines((current) => stockCatalogItem(current, item));
  }

  function addCustom() {
    if (!customName.trim()) return;
    setLines((current) => stockCustomItem(current, customName, parsePriceInput(customPrice)));
    setCustomName("");
    setCustomPrice("");
  }

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="game-dialog game-shop-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-stock-title">
        <header>
          <div><p className="eyebrow">Shop</p><h2 id="shop-stock-title">{shop.open ? "Edit the shop" : "Stock the shop"}</h2></div>
          <button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <label className="game-field">
          <span>Shop name</span>
          <input className="input" value={name} maxLength={60} placeholder="The Grey Market" onChange={(event) => setName(event.target.value)} />
        </label>

        <p className="eyebrow">Stock · {lines.length}/{MAX_SHOP_LINES}</p>
        {lines.length === 0 ? (
          <p className="game-dialog-note">Nothing stocked yet. Pick items from the catalogue below, or add your own.</p>
        ) : (
          <div className="shop-stock-list">
            {lines.map((line) => (
              <ShopStockRow
                key={line.id}
                line={line}
                onPrice={(value) => setLines((current) => patchLine(current, line.id, { priceGp: parsePriceInput(value) }))}
                onNote={(value) => setLines((current) => patchLine(current, line.id, { note: value }))}
                onRemove={() => setLines((current) => removeLine(current, line.id))}
              />
            ))}
          </div>
        )}

        <p className="eyebrow shop-section-gap">Add a custom item</p>
        <div className="shop-custom-row">
          <input className="input" value={customName} maxLength={60} placeholder="Name" aria-label="Custom item name" onChange={(event) => setCustomName(event.target.value)} />
          <input className="input" value={customPrice} inputMode="decimal" placeholder="GP" aria-label="Custom item price" onChange={(event) => setCustomPrice(event.target.value)} />
          <button className="btn btn-ghost" type="button" disabled={full || !customName.trim()} onClick={addCustom}>Add</button>
        </div>

        <p className="eyebrow shop-section-gap">Catalogue</p>
        <input className="input" type="search" value={query} placeholder="Search items…" aria-label="Search the item catalogue" onChange={(event) => setQuery(event.target.value)} />
        <div className="game-battle-picker shop-catalog">
          {results.length === 0 ? (
            <p className="game-dialog-note">No catalogue item matches that.</p>
          ) : results.map((item) => (
            <button key={item.id} className="shop-catalog-row" type="button" disabled={full} onClick={() => stock(item)}>
              <span><strong>{item.name}</strong><small>{item.category} · {item.carry} · {itemPriceLabel(item.priceGp) || "no listed price"}</small></span>
              <span className="gold" aria-hidden="true">＋</span>
            </button>
          ))}
        </div>

        <footer>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          {shop.open ? (
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void onSave(draft()).then((ok) => ok && onClose())}>Save shop</button>
          ) : (
            <button className="btn btn-primary" type="button" disabled={busy || lines.length === 0} onClick={() => void onOpenShop(draft()).then((ok) => ok && onClose())}>Open shop</button>
          )}
        </footer>
      </section>
    </div>
  );
}
