import type { ShopLine, ShopState } from "@/types";
import { lineItem } from "@/features/play/lib/shop";

/** Read-only shop board for the big screen — the DM's open stock, priced, at
 * the same scale as the combat board so the table can read it across a room. */
export function ShopBoard({ shop }: { shop: ShopState }) {
  if (!shop.open || shop.lines.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <p className="eyebrow" style={{ fontSize: "1.05rem", marginBottom: 12 }}>
        Shop{shop.name ? ` · ${shop.name}` : ""} · {shop.lines.length} for sale
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {shop.lines.map((line) => <ShopRow key={line.id} line={line} />)}
      </div>
    </div>
  );
}

function ShopRow({ line }: { line: ShopLine }) {
  const item = lineItem(line);
  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div className="row between" style={{ gap: 12, alignItems: "baseline" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", minWidth: 0, overflowWrap: "anywhere" }}>
          {line.name}
        </div>
        <div className="gold" style={{ flex: "none", fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>
          {line.priceGp}<span className="faint" style={{ fontSize: "0.9rem" }}> GP</span>
        </div>
      </div>
      <div className="faint" style={{ fontSize: "0.95rem", marginTop: 2 }}>
        {item ? `${item.category} · ${item.carry} · ${item.weightLb} lb` : "Curiosity"}
      </div>
      {line.note && <div className="muted" style={{ fontSize: "0.9rem", marginTop: 4 }}>{line.note}</div>}
    </div>
  );
}
