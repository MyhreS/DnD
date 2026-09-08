import type { ShopLine } from "@/types";
import { itemPriceLabel } from "@/data/items";
import { lineItem } from "@/features/play/lib/shop";

/** One stocked line in the DM's shop editor: price override, optional note,
 * and removal. Catalog lines show what the price list asks, so an override
 * reads as a deliberate choice. */
export function ShopStockRow({
  line,
  onPrice,
  onNote,
  onRemove,
}: {
  line: ShopLine;
  onPrice: (value: string) => void;
  onNote: (value: string) => void;
  onRemove: () => void;
}) {
  const item = lineItem(line);
  const listed = item ? itemPriceLabel(item.priceGp) : "";
  const overridden = item && typeof item.priceGp === "number" && item.priceGp !== line.priceGp;

  return (
    <article className="shop-stock-row">
      <div className="shop-stock-name">
        <strong>{line.name}</strong>
        <small>
          {item ? `${item.category} · ${item.carry}` : "Custom item"}
          {listed ? ` · list ${listed}` : ""}
          {overridden ? " · price changed" : ""}
        </small>
      </div>
      <div className="shop-stock-fields">
        <label>
          <span>Price</span>
          <input
            className="input"
            inputMode="decimal"
            value={String(line.priceGp)}
            aria-label={`Price for ${line.name} in gold`}
            onChange={(event) => onPrice(event.target.value)}
          />
        </label>
        <label>
          <span>Note</span>
          <input
            className="input"
            value={line.note ?? ""}
            maxLength={80}
            placeholder="Optional"
            aria-label={`Note for ${line.name}`}
            onChange={(event) => onNote(event.target.value)}
          />
        </label>
        <button className="game-text-button" type="button" aria-label={`Remove ${line.name}`} onClick={onRemove}>Remove</button>
      </div>
    </article>
  );
}
