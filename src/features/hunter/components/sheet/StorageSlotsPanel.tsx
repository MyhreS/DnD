import type { HunterCard } from "@/types";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveStorage } from "@/lib/inventory";
import { computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import { unequipStorage } from "../../lib/equipment";

/** Worn storage items + the derived item slots (wireframe middle-right):
 * which Oversized/Significant slots exist (hand/back/chest/hip/ankle), how
 * many are used and by what — all from computeSlots, the one slot source the
 * inventory table shares. Equipping happens on the inventory table's rows. */
export function StorageSlotsPanel({
  card,
  onPatch,
  onError,
}: {
  card: HunterCard;
  onPatch?: (p: Partial<HunterCard>) => void;
  onError?: (msg: string) => void;
}) {
  const worn = resolveStorage(card);
  const { rows, unstowed } = computeSlots(card);

  function takeOff(itemId: string) {
    const result = unequipStorage(card, itemId);
    if ("error" in result) onError?.(result.error);
    else onPatch?.(result.patch);
  }

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Storage items</p>
      {worn.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>
          None worn — equip a backpack, bandolier, tool belt… from the inventory for more slots.
        </p>
      ) : (
        worn.map((item) => {
          const def = STORAGE_BY_ITEM_ID[item.id];
          return (
            <div key={item.id} className="row between" style={{ padding: "6px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.name}</span>{" "}
                <span className="faint" style={{ fontSize: "0.76rem" }}>
                  +{def.gives.count} Significant ({SLOT_LOCATION_LABEL[def.gives.location].toLowerCase()}) · {item.weightLb} lb
                </span>
              </div>
              {onPatch && (
                <button type="button" className="btn btn-ghost btn-sm no-print" style={{ width: "auto", padding: "4px 8px", flex: "none" }} onClick={() => takeOff(item.id)}>
                  Take off
                </button>
              )}
            </div>
          );
        })
      )}

      <p className="eyebrow" style={{ margin: "14px 0 6px" }}>Item slots</p>
      {rows.map((row) => (
        <div key={row.key} className="row between" style={{ padding: "5px 0", borderTop: "1px solid var(--border)", gap: 10, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "0.86rem" }}>
              {row.kind === "oversized" ? "Oversized" : "Significant"}{" "}
              <span className="faint">({SLOT_LOCATION_LABEL[row.location].toLowerCase()})</span>
            </span>
            {(row.items.length > 0 || row.note) && (
              <div className="faint" style={{ fontSize: "0.74rem" }}>
                {[row.items.join(", "), row.note].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <span
            className={row.used >= row.capacity && row.capacity > 0 ? "gold" : "faint"}
            style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", flex: "none" }}
          >
            {row.used}/{row.capacity}
          </span>
        </div>
      ))}
      {unstowed.length > 0 && (
        <p className="faint" style={{ fontSize: "0.78rem", margin: "8px 0 0" }}>
          Unstowed (no free slot):{" "}
          {unstowed
            .map((u) => (u.count > 1 || u.clamped ? `${u.name} ×${u.count}${u.clamped ? "+" : ""}` : u.name))
            .join(", ")}{" "}
          — tucked
          where possible, no penalty.
        </p>
      )}
    </div>
  );
}
