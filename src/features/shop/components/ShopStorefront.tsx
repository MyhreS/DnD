import { useState } from "react";
import type { HunterCard, ItemCategory } from "@/types";
import { ITEMS, ITEM_BY_ID, ITEM_CATEGORIES } from "@/data/items";
import { AsyncButton } from "@/components/AsyncButton";
import { useShopStore } from "../store/shopStore";

/** The storefront: the DM's listed items. Players buy with their hunter's
 * coins; the DM stocks items (catalog picker + price) and pulls them. */
export function ShopStorefront({
  isDM,
  card,
  campaignId,
}: {
  isDM: boolean;
  card: HunterCard | null;
  campaignId: string | null;
}) {
  const listings = useShopStore((s) => s.listings);
  const buy = useShopStore((s) => s.buy);
  const removeListing = useShopStore((s) => s.removeListing);
  const [adding, setAdding] = useState(false);

  const coins = card?.coins ?? 0;
  const sorted = [...listings].sort((a, b) =>
    (ITEM_BY_ID[a.itemId]?.name ?? a.itemId).localeCompare(ITEM_BY_ID[b.itemId]?.name ?? b.itemId),
  );

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Storefront</p>
        {isDM ? (
          <button className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={() => setAdding((a) => !a)}>
            {adding ? "Done" : "Add item"}
          </button>
        ) : (
          <span className="faint" style={{ fontSize: "0.78rem" }}>{coins} GP</span>
        )}
      </div>

      {isDM && adding && campaignId && <AddListing campaignId={campaignId} />}

      {sorted.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>
          {isDM ? "Nothing stocked yet — add items above." : "The shop is empty. Check back when your DM stocks it."}
        </p>
      ) : (
        sorted.map((l) => {
          const item = ITEM_BY_ID[l.itemId];
          if (!item) return null;
          return (
            <div key={l.id} className="row between" style={{ padding: "8px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{item.name}</div>
                <div className="faint" style={{ fontSize: "0.74rem" }}>{item.category} · {item.carry}</div>
              </div>
              <div className="row" style={{ gap: 8, flex: "none", alignItems: "center" }}>
                <span className="gold" style={{ fontSize: "0.86rem" }}>{l.priceGp} GP</span>
                {isDM ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: 30, padding: 4 }}
                    aria-label={`remove ${item.name}`}
                    onClick={() => void removeListing(l.id)}
                  >
                    ×
                  </button>
                ) : (
                  <AsyncButton
                    className="btn btn-ghost btn-sm"
                    style={{ width: "auto" }}
                    pendingText="Buying…"
                    showDone={false}
                    disabled={!card || coins < l.priceGp}
                    onClick={() => (card ? buy(l, card) : undefined)}
                  >
                    Buy
                  </AsyncButton>
                )}
              </div>
            </div>
          );
        })
      )}

      {!isDM && !card && sorted.length > 0 && (
        <p className="faint" style={{ fontSize: "0.78rem", marginTop: 10, marginBottom: 0 }}>
          Bring a hunter into this campaign to buy.
        </p>
      )}
    </div>
  );
}

/** Catalog picker for the DM: set a price, then tap an item to stock it. */
function AddListing({ campaignId }: { campaignId: string }) {
  const addListing = useShopStore((s) => s.addListing);
  const [cat, setCat] = useState<ItemCategory | "all">("all");
  const [q, setQ] = useState("");
  const [price, setPrice] = useState(10);
  const query = q.trim().toLowerCase();
  const list = ITEMS.filter(
    (i) => (cat === "all" || i.category === cat) && (!query || i.name.toLowerCase().includes(query)),
  ).slice(0, 80);

  return (
    <div style={{ marginBottom: 10 }}>
      <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span className="faint" style={{ fontSize: "0.8rem" }}>Price</span>
        <input
          className="input"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
          style={{ width: 90 }}
        />
        <span className="faint" style={{ fontSize: "0.8rem" }}>GP — tap an item to stock it</span>
      </div>
      <input className="input" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
      <div className="chip-row" style={{ marginBottom: 8 }}>
        <button type="button" className={`chip selectable${cat === "all" ? " selected" : ""}`} onClick={() => setCat("all")}>All</button>
        {ITEM_CATEGORIES.map((c) => (
          <button key={c} type="button" className={`chip selectable${cat === c ? " selected" : ""}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="stack" style={{ gap: 4, maxHeight: 300, overflowY: "auto" }}>
        {list.map((i) => (
          <button
            key={i.id}
            type="button"
            className="row between card-hover"
            style={{ background: "var(--bg-elev-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 10px", gap: 8, textAlign: "left" }}
            onClick={() => void addListing(campaignId, i.id, price)}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{i.name}</span>{" "}
              <span className="faint" style={{ fontSize: "0.74rem" }}>{i.category} · {i.carry}</span>
            </span>
            <span className="gold" style={{ flex: "none", fontSize: "0.82rem" }}>+ {price} GP</span>
          </button>
        ))}
        {list.length === 0 && <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>No items match.</p>}
      </div>
    </div>
  );
}
