import { useState } from "react";
import type { InventoryEntry, ItemCategory } from "@/types";
import { ITEMS, ITEM_CATEGORIES } from "@/data/items";

/** DM-only catalog picker — filter by category, search, tap to add (#135:
 * players never see this; items reach them through the shop, trades, loot
 * and DM grants). */
export function AddItemPicker({ owned, onAdd }: { owned: InventoryEntry[]; onAdd: (id: string) => void }) {
  const [cat, setCat] = useState<ItemCategory | "all">("all");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = ITEMS.filter(
    (i) => (cat === "all" || i.category === cat) && (!query || i.name.toLowerCase().includes(query)),
  ).slice(0, 80);
  const ownedQty = (id: string) => owned.find((e) => e.itemId === id)?.qty ?? 0;

  return (
    <div style={{ marginTop: 10 }}>
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
            onClick={() => onAdd(i.id)}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{i.name}</span>{" "}
              <span className="faint" style={{ fontSize: "0.74rem" }}>{i.category} · {i.carry}</span>
            </span>
            <span className="gold" style={{ flex: "none", fontSize: "0.82rem" }}>{ownedQty(i.id) ? `×${ownedQty(i.id)} +` : "+ Add"}</span>
          </button>
        ))}
        {list.length === 0 && <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>No items match.</p>}
      </div>
    </div>
  );
}
