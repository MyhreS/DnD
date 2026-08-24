import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

// ---------------------------------------------------------------------------
// Settle player-to-player trades atomically.
//
// A trade lives at /trades/{tradeId}. When its status TRANSITIONS to
// "accepted", we run a Firestore transaction that moves the offered/requested
// items and coins between the two players' /players/{uid} cards, then marks the
// trade "settled". If the goods don't add up (or a player is missing) the trade
// is marked "failed" with a human-readable reason.
// ---------------------------------------------------------------------------

type TradeStatus =
  | "pending"
  | "accepted"
  | "settled"
  | "declined"
  | "cancelled"
  | "failed";

interface InventoryEntry {
  itemId: string;
  qty: number;
}

interface TradeSide {
  items: InventoryEntry[];
  coins: number;
}

interface Trade {
  fromUid: string;
  fromName?: string;
  toUid: string;
  toName?: string;
  offer: TradeSide; // what fromUid GIVES
  request: TradeSide; // what fromUid WANTS from toUid
  status: TradeStatus;
}

// --- Pure inventory helpers -------------------------------------------------

/** Return a new inventory with `items` added (merged by itemId, summing qty). */
export function addItems(
  inv: InventoryEntry[],
  items: InventoryEntry[],
): InventoryEntry[] {
  const byId = new Map<string, number>();
  for (const e of inv) byId.set(e.itemId, (byId.get(e.itemId) ?? 0) + e.qty);
  for (const e of items) byId.set(e.itemId, (byId.get(e.itemId) ?? 0) + e.qty);
  return Array.from(byId, ([itemId, qty]) => ({ itemId, qty })).filter(
    (e) => e.qty > 0,
  );
}

/** Return a new inventory with `items` removed (merged by itemId). */
export function removeItems(
  inv: InventoryEntry[],
  items: InventoryEntry[],
): InventoryEntry[] {
  const byId = new Map<string, number>();
  for (const e of inv) byId.set(e.itemId, (byId.get(e.itemId) ?? 0) + e.qty);
  for (const e of items) byId.set(e.itemId, (byId.get(e.itemId) ?? 0) - e.qty);
  return Array.from(byId, ([itemId, qty]) => ({ itemId, qty })).filter(
    (e) => e.qty > 0,
  );
}

// --- Validation helpers -----------------------------------------------------

function qtyOf(inv: InventoryEntry[], itemId: string): number {
  let total = 0;
  for (const e of inv) if (e.itemId === itemId) total += e.qty;
  return total;
}

/** Does `inv` (+ `coins`) cover everything on `side`? Returns a reason if not. */
function shortfall(
  who: string,
  inv: InventoryEntry[],
  coins: number,
  side: TradeSide,
): string | null {
  for (const need of side.items) {
    if (qtyOf(inv, need.itemId) < need.qty) {
      return `${who} lacks item ${need.itemId} (has ${qtyOf(inv, need.itemId)}, needs ${need.qty}).`;
    }
  }
  if (coins < side.coins) {
    return `${who} lacks coins (has ${coins}, needs ${side.coins}).`;
  }
  return null;
}

function readSide(side: TradeSide | undefined): TradeSide {
  return {
    items: Array.isArray(side?.items) ? side!.items : [],
    coins: typeof side?.coins === "number" ? side!.coins : 0,
  };
}

// --- Trigger ----------------------------------------------------------------

export const settleTrade = onDocumentUpdated(
  // The global region is set in index.ts *after* imports, so it doesn't apply
  // to this trigger — pin europe-west1 explicitly here.
  { document: "trades/{tradeId}", region: "europe-west1" },
  async (event) => {
    const before = event.data?.before.data() as Trade | undefined;
    const after = event.data?.after.data() as Trade | undefined;
    if (!after) return;

    // Only act on the transition *into* "accepted".
    if (before?.status === "accepted" || after.status !== "accepted") return;

    const tradeId = event.params.tradeId;
    const tradeRef = event.data!.after.ref;
    const db = getFirestore();

    try {
      await db.runTransaction(async (tx) => {
        const fromRef = db.doc(`players/${after.fromUid}`);
        const toRef = db.doc(`players/${after.toUid}`);
        const [fromSnap, toSnap] = await Promise.all([
          tx.get(fromRef),
          tx.get(toRef),
        ]);

        const fail = (reason: string) => {
          tx.update(tradeRef, {
            status: "failed",
            error: reason,
            updatedAt: FieldValue.serverTimestamp(),
          });
        };

        if (!fromSnap.exists || !toSnap.exists) {
          const missing = !fromSnap.exists ? after.fromName ?? after.fromUid : after.toName ?? after.toUid;
          fail(`Player card not found for ${missing}.`);
          return;
        }

        const offer = readSide(after.offer);
        const request = readSide(after.request);

        const fromData = fromSnap.data() ?? {};
        const toData = toSnap.data() ?? {};
        const fromInv: InventoryEntry[] = Array.isArray(fromData.inventory)
          ? fromData.inventory
          : [];
        const toInv: InventoryEntry[] = Array.isArray(toData.inventory)
          ? toData.inventory
          : [];
        const fromCoins = typeof fromData.coins === "number" ? fromData.coins : 0;
        const toCoins = typeof toData.coins === "number" ? toData.coins : 0;

        // Validate both sides can cover what they've promised.
        const offerShort = shortfall(
          after.fromName ?? "Offerer",
          fromInv,
          fromCoins,
          offer,
        );
        if (offerShort) return fail(offerShort);
        const requestShort = shortfall(
          after.toName ?? "Counterparty",
          toInv,
          toCoins,
          request,
        );
        if (requestShort) return fail(requestShort);

        // Move the goods. from gives offer, gains request; to gives request,
        // gains offer.
        const newFromInv = addItems(removeItems(fromInv, offer.items), request.items);
        const newToInv = addItems(removeItems(toInv, request.items), offer.items);
        const newFromCoins = fromCoins - offer.coins + request.coins;
        const newToCoins = toCoins - request.coins + offer.coins;

        tx.update(fromRef, { inventory: newFromInv, coins: newFromCoins });
        tx.update(toRef, { inventory: newToInv, coins: newToCoins });
        tx.update(tradeRef, {
          status: "settled",
          error: null,
          settledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (err) {
      logger.error("Trade settlement failed", { tradeId, err: String(err) });
      try {
        await tradeRef.update({
          status: "failed",
          error: "Unexpected error while settling the trade.",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (markErr) {
        logger.error("Could not mark trade failed", {
          tradeId,
          err: String(markErr),
        });
      }
    }
  },
);
