import { useState } from "react";
import type { HunterCard, InventoryEntry } from "@/types";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory, carryCondition, totalCarriedWeight } from "@/lib/inventory";
import { computeSlots } from "@/lib/slots";
import { wearArmor, equipStorage } from "../../lib/equipment";
import { AsyncButton } from "@/components/AsyncButton";
import { AddItemPicker } from "./AddItemPicker";

/** The inventory table (wireframe page 3): everything NOT worn — equipment |
 * carrying category | item slot used (from computeSlots, shared with the
 * storage panel) | weight — with Wear/Equip actions for armor and storage
 * items. "Add item" and the gold stepper are DM-only (#135); a player's only
 * outflows are using items (−), trades, and in-game drops. All removals route
 * through ONE seam (`onRemove`, falling back to an inventory patch) so #136
 * can add its drop-confirm without touching the table. */
export function InventorySection({
  card,
  onPatch,
  dmMode = false,
  onDrop,
  onRemove,
}: {
  card: HunterCard;
  onPatch?: (p: Partial<HunterCard>) => void;
  /** DM contexts only: shows the gold stepper + the Add item catalog. */
  dmMode?: boolean;
  /** In-game: pushes the stack to the shared loot pile. */
  onDrop?: (entry: InventoryEntry) => Promise<unknown> | void;
  /** #136 seam — when set, REPLACES the default remove-one inventory patch. */
  onRemove?: (entry: InventoryEntry) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = resolveInventory(card);
  const slots = computeSlots(card);
  const weight = totalCarriedWeight(card);
  const cond = carryCondition(card.abilities.str, weight);
  const interactive = !!onPatch || !!onDrop;

  function patch(p: Partial<HunterCard>) {
    setError(null);
    onPatch?.(p);
  }
  function bump(itemId: string, delta: number) {
    const cur = card.inventory?.find((e) => e.itemId === itemId)?.qty ?? 0;
    const inv = (card.inventory ?? []).filter((e) => e.itemId !== itemId);
    const qty = Math.max(0, cur + delta);
    if (qty > 0) inv.push({ itemId, qty });
    patch({ inventory: inv });
  }
  function removeOne(itemId: string, qty: number) {
    if (onRemove) onRemove({ itemId, qty });
    else bump(itemId, -1);
  }
  function runEquip(result: ReturnType<typeof wearArmor>) {
    if ("error" in result) setError(result.error);
    else patch(result.patch);
  }

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 4, gap: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Inventory</p>
        <span className="faint" style={{ fontSize: "0.78rem" }}>
          {weight} lb carried · {card.coins ?? 0} GP
        </span>
      </div>
      <p className="faint" style={{ fontSize: "0.78rem", margin: "0 0 8px" }}>
        <span className="gold" style={{ fontWeight: 600 }}>{cond.label}</span> — {cond.note}
      </p>

      {error && (
        <div className="banner banner-error" role="alert" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>Nothing carried — worn armor and storage live on the sheet above.</p>
      ) : (
        <div className="table-scroll">
          <table className="level-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Carrying</th>
                <th>Item slot</th>
                <th>Weight</th>
                {interactive && <th aria-label="actions" />}
              </tr>
            </thead>
            <tbody>
              {entries.map(({ item, qty }) => {
                const wearable = item.category === "Armor";
                const storable = !!STORAGE_BY_ITEM_ID[item.id];
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      {qty > 1 && <span className="faint"> ×{qty}</span>}
                      {item.unique && <span className="faint" style={{ fontSize: "0.7rem" }}> · unique</span>}
                    </td>
                    <td className="faint">{item.carry}</td>
                    <td className="faint">
                      {item.carry === "Insignificant" ? "—" : slots.byItem[item.id] ?? "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{Math.round(item.weightLb * qty * 10) / 10} lb</td>
                    {interactive && (
                      <td>
                        <div className="row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          {onPatch && wearable && (
                            <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", padding: "3px 8px" }} onClick={() => runEquip(wearArmor(card, item.id))}>
                              Wear
                            </button>
                          )}
                          {onPatch && storable && (
                            <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", padding: "3px 8px" }} onClick={() => runEquip(equipStorage(card, item.id))}>
                              Equip
                            </button>
                          )}
                          {onPatch && (
                            <button type="button" className="btn btn-ghost btn-sm" style={{ width: 28, padding: 3 }} aria-label={`remove one ${item.name}`} onClick={() => removeOne(item.id, qty)}>
                              −
                            </button>
                          )}
                          {onPatch && dmMode && (
                            <button type="button" className="btn btn-ghost btn-sm" style={{ width: 28, padding: 3 }} aria-label={`add one ${item.name}`} onClick={() => bump(item.id, 1)}>
                              +
                            </button>
                          )}
                          {onDrop && (
                            <AsyncButton className="btn btn-ghost btn-sm" style={{ width: "auto", padding: "3px 8px" }} pendingText="…" showDone={false} onClick={() => onDrop({ itemId: item.id, qty })}>
                              Drop
                            </AsyncButton>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {onPatch && (
        <>
          <hr className="divider" />
          <div className="row between" style={{ alignItems: "center", gap: 10 }}>
            {dmMode ? (
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <span className="faint" style={{ fontSize: "0.8rem" }}>Coins</span>
                <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label="remove coin" onClick={() => patch({ coins: Math.max(0, (card.coins ?? 0) - 1) })}>−</button>
                <span style={{ fontFamily: "var(--font-display)", minWidth: 44, textAlign: "center" }}>{card.coins ?? 0} GP</span>
                <button className="btn btn-ghost btn-sm" style={{ width: 30, padding: 4 }} aria-label="add coin" onClick={() => patch({ coins: (card.coins ?? 0) + 1 })}>+</button>
              </div>
            ) : (
              <span className="faint" style={{ fontSize: "0.8rem" }}>
                {card.coins ?? 0} GP — items and gold arrive through the shop, trades and the DM
              </span>
            )}
            {dmMode && (
              <button className="btn btn-ghost btn-sm" style={{ width: "auto", flex: "none" }} onClick={() => setAdding((a) => !a)}>
                {adding ? "Done" : "Add item"}
              </button>
            )}
          </div>
          {dmMode && adding && <AddItemPicker owned={card.inventory ?? []} onAdd={(id) => bump(id, 1)} />}
        </>
      )}
    </div>
  );
}
