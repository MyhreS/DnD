import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type { ShopRequest } from "@/types";

const requestFn = httpsCallable<{ gameId: string; lineId: string; characterId: string }, { requestId: string }>(functions, "requestShopPurchase");
const resolveFn = httpsCallable<{ gameId: string; requestId: string; approve: boolean }, { ok: boolean }>(functions, "resolveShopPurchase");

function ms(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as Timestamp).toMillis === "function") return (value as Timestamp).toMillis();
  return 0;
}

export function subscribeShopRequests(gameId: string, onValue: (requests: ShopRequest[]) => void): () => void {
  return onSnapshot(collection(db, "games", gameId, "shopRequests"), (snapshot) => {
    onValue(snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: String(data.uid ?? ""),
        characterId: String(data.characterId ?? ""),
        characterName: String(data.characterName ?? "Hunter"),
        lineId: String(data.lineId ?? ""),
        lineName: String(data.lineName ?? "Item"),
        itemId: typeof data.itemId === "string" ? data.itemId : null,
        priceGp: Number(data.priceGp) || 0,
        status: data.status === "approved" || data.status === "declined" ? data.status : "pending",
        createdAt: ms(data.createdAt),
        resolvedAt: data.resolvedAt ? ms(data.resolvedAt) : null,
      } satisfies ShopRequest;
    }).sort((a, b) => b.createdAt - a.createdAt));
  }, () => onValue([]));
}

/** A player asks to buy a shop line; the DM must approve it. */
export async function requestShopPurchase(gameId: string, lineId: string, characterId: string): Promise<void> {
  await requestFn({ gameId, lineId, characterId });
}

/** The DM approves (gold → item) or declines a request. */
export async function resolveShopPurchase(gameId: string, requestId: string, approve: boolean): Promise<void> {
  await resolveFn({ gameId, requestId, approve });
}
