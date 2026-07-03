import type { HunterCard } from "@/types";
import { ITEM_BY_ID } from "@/data/items";
import { activeDropped, pickUpDropped, DROPPED_TTL_MS } from "@/lib/inventory";
import { useNow } from "@/hooks/common/useNow";

/** "Recently dropped" (#136): drop-confirmed lines stay within reach for 15
 * minutes — shown with a countdown and a no-questions "Pick up" that returns
 * them to the inventory. Expiry is pure client time: entries vanish from the
 * render when their window closes (useNow tick) and are physically pruned on
 * the next droppedItems write. Renders nothing while the list is empty. */
export function RecentlyDropped({
  card,
  onPatch,
}: {
  card: HunterCard;
  onPatch: (p: Partial<HunterCard>) => void;
}) {
  const now = useNow(10_000).getTime();
  const dropped = activeDropped(card.droppedItems, now);
  if (dropped.length === 0) return null;

  return (
    <>
      <hr className="divider" />
      <p className="eyebrow" style={{ margin: "0 0 2px" }}>Recently dropped</p>
      <p className="faint" style={{ fontSize: "0.78rem", margin: "0 0 6px" }}>
        Still within reach for 15 minutes — then gone for good.
      </p>
      {dropped.map((d) => {
        const item = ITEM_BY_ID[d.itemId];
        const leftMs = Math.min(DROPPED_TTL_MS, Math.max(0, DROPPED_TTL_MS - (now - d.droppedAt)));
        const leftMin = Math.max(1, Math.ceil(leftMs / 60_000));
        return (
          <div key={d.itemId} className="row between" style={{ gap: 8, padding: "4px 0" }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{item?.name ?? d.itemId}</span>
              {d.qty > 1 && <span className="faint"> ×{d.qty}</span>}
              <span className="faint" style={{ fontSize: "0.78rem" }}> · gone in {leftMin}m</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: "auto", padding: "3px 10px", flex: "none" }}
              onClick={() => onPatch(pickUpDropped(card, d.itemId, Date.now()))}
            >
              Pick up
            </button>
          </div>
        );
      })}
    </>
  );
}
