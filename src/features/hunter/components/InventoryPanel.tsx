import { useState } from "react";
import type { HunterCard, InventoryEntry, ItemCategory } from "@/types";
import { ITEMS, ITEM_CATEGORIES } from "@/data/items";
import { resolveInventory, groupByCarry, totalWeight, carryCondition } from "@/lib/inventory";
import { usePlayerStore } from "../store/playerStore";

/** A hunter's carried gear + coins. Editable on your own character (menu + in
 * play); read-only when viewing someone else. Persists on every change. */
export function InventoryPanel({ card, editable = false }: { card: HunterCard; editable?: boolean }) {
  const save = usePlayerStore((s) => s.save);
  const [adding, setAdding] = useState(false);

  const entries = resolveInventory(card);
  const groups = groupByCarry(entries);
  const weight = totalWeight(entries);
  const cond = carryCondition(card.abilities.str, weight);

  function patch(p: Partial<HunterCard>) {
    void save({ ...card, ...p });
  }
  function setQty(itemId: string, qty: number) {
    const inv = (card.inventory ?? []).filter((e) => e.itemId !== itemId);
    if (qty > 0) inv.push({ itemId, qty });
    patch({ inventory: inv });
  }
  function bump(itemId: string, delta: number) {
    const cur = card.inventory?.find((e) => e.itemId === itemId)?.qty ?? 0;
    setQty(itemId, Math.max(0, cur + delta));
  }

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Inventory</p>
        <span className="faint" style={{ fontSize: "0.78rem" }}>
          {weight} lb · {card.coins ?? 0} GP
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>Nothing carried yet.</p>
      ) : (
        groups.map((g) => (
          <div key={g.carry} style={{ marginTop: 10 }}>
            <div className="faint" style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {g.carry}
            </div>
            {g.entries.map(({ item, qty }) => (
              <div
                key={item.id}
                className="row between"
                style={{ padding: "7px 0", borderTop: "1px solid var(--border)", gap: 8 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                    {item.name}
                    {qty > 1 && <span className="faint"> ×{qty}</span>}
                  </div>
                  <div className="faint" style={{ fontSize: "0.74rem" }}>
                    {item.category} · {item.weightLb} lb{item.unique ? " · unique" : ""}
                  </div>
                </div>
                {editable && (
                  <div className="row" style={{ gap: 6, flex: "none" }}>
                    <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label={`remove one ${item.name}`} onClick={() => bump(item.id, -1)}>−</button>
                    <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label={`add one ${item.name}`} onClick={() => bump(item.id, 1)}>+</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {cond.label !== "Normal" && (
        <p className="faint" style={{ fontSize: "0.78rem", marginTop: 10, marginBottom: 0 }}>
          {cond.label}: {cond.note}
        </p>
      )}

      {editable && (
        <>
          <hr className="divider" />
          <div className="row between" style={{ alignItems: "center", gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <span className="faint" style={{ fontSize: "0.8rem" }}>Coins</span>
              <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label="remove coin" onClick={() => patch({ coins: Math.max(0, (card.coins ?? 0) - 1) })}>−</button>
              <span style={{ fontFamily: "var(--font-display)", minWidth: 44, textAlign: "center" }}>{card.coins ?? 0} GP</span>
              <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label="add coin" onClick={() => patch({ coins: (card.coins ?? 0) + 1 })}>+</button>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={() => setAdding((a) => !a)}>
              {adding ? "Done" : "Add item"}
            </button>
          </div>
          {adding && <AddItem owned={card.inventory ?? []} onAdd={(id) => bump(id, 1)} />}
        </>
      )}
    </div>
  );
}

/** Catalog picker — filter by category, search, tap to add. */
function AddItem({ owned, onAdd }: { owned: InventoryEntry[]; onAdd: (id: string) => void }) {
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
