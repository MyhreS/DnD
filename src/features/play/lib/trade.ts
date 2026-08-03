import { ITEM_BY_ID } from "@/data/items";
import type { TradeSide, TradeStatus } from "@/types";

/** Human summary of one side of a trade, e.g. "Greataxe, 5 GP" or "nothing". */
export function summarizeSide(side: TradeSide): string {
  const parts = side.items.map((e) => {
    const it = ITEM_BY_ID[e.itemId];
    const name = it ? it.name : e.itemId;
    return e.qty > 1 ? `${name} ×${e.qty}` : name;
  });
  if (side.coins > 0) parts.push(`${side.coins} GP`);
  return parts.length ? parts.join(", ") : "nothing";
}

export const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  pending: "Pending",
  accepted: "Settling…",
  settled: "Settled",
  declined: "Declined",
  cancelled: "Cancelled",
  failed: "Failed",
};

export function isLiveTrade(status: TradeStatus): boolean {
  return status === "pending" || status === "accepted";
}
