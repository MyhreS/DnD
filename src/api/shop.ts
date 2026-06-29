import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { patchCharacter } from "@/api/players";
import type { HunterCard, InventoryEntry, ShopListing, SellRequest } from "@/types";

// The DM's storefront + players' sell requests. Buying mutates the buyer's own
// /characters doc (covered by the owner-write rule); selling is gated on the DM
// pricing + approving (which credits the seller's character). No Cloud Function
// — v1 has infinite stock and settles client-side.
const listingsCol = collection(db, "shopListings");
const sellRequestsCol = collection(db, "sellRequests");

/** Coerce a Firestore Timestamp | number | undefined to ms epoch. */
function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

/** Merge bought items into an inventory (sum quantities, drop empties). */
function mergeInventory(inv: InventoryEntry[], add: InventoryEntry[]): InventoryEntry[] {
  const map = new Map(inv.map((e) => [e.itemId, e.qty]));
  for (const e of add) map.set(e.itemId, (map.get(e.itemId) ?? 0) + e.qty);
  return [...map].map(([itemId, qty]) => ({ itemId, qty })).filter((e) => e.qty > 0);
}

/** Remove `qty` of one item from an inventory (drop the line when it empties). */
function removeFromInventory(inv: InventoryEntry[], itemId: string, qty: number): InventoryEntry[] {
  return inv
    .map((e) => (e.itemId === itemId ? { itemId, qty: e.qty - qty } : e))
    .filter((e) => e.qty > 0);
}

// --- Listings (the storefront) ---

function toListing(id: string, data: Record<string, unknown>): ShopListing {
  return {
    id,
    campaignId: (data.campaignId as string) ?? "",
    itemId: (data.itemId as string) ?? "",
    priceGp: (data.priceGp as number) ?? 0,
    createdBy: (data.createdBy as string) ?? "",
    createdAt: ms(data.createdAt),
  };
}

/** Live-subscribe to a campaign's storefront (newest first, sorted client-side
 * to match the member-scoped rules without a composite index). */
export function subscribeListings(
  campaignId: string,
  cb: (listings: ShopListing[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(listingsCol, where("campaignId", "==", campaignId), limit(100));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toListing(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)),
    (err) => {
      console.error("Shop listings subscription failed", err);
      onError?.(err);
    },
  );
}

export async function addListing(
  campaignId: string,
  input: { itemId: string; priceGp: number; createdBy: string },
): Promise<string> {
  const ref = await addDoc(listingsCol, {
    campaignId,
    itemId: input.itemId,
    priceGp: input.priceGp,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeListing(id: string): Promise<void> {
  await deleteDoc(doc(listingsCol, id));
}

/** The BUYER spends their own coins on a listing: debit gold, add the item to
 * their inventory. Mutates the buyer's own /characters doc. Throws if broke. */
export async function buyListing(listing: ShopListing, card: HunterCard): Promise<void> {
  const coins = card.coins ?? 0;
  if (coins < listing.priceGp) throw new Error("Not enough gold");
  await patchCharacter(card.id, {
    coins: coins - listing.priceGp,
    inventory: mergeInventory(card.inventory ?? [], [{ itemId: listing.itemId, qty: 1 }]),
  });
}

// --- Sell requests (player-raised, DM-gated) ---

function toSellRequest(id: string, data: Record<string, unknown>): SellRequest {
  return {
    id,
    campaignId: (data.campaignId as string) ?? "",
    sellerUid: (data.sellerUid as string) ?? "",
    sellerName: (data.sellerName as string) ?? "Hunter",
    characterId: (data.characterId as string) ?? "",
    itemId: (data.itemId as string) ?? "",
    qty: (data.qty as number) ?? 1,
    priceGp: typeof data.priceGp === "number" ? data.priceGp : null,
    status: (data.status as SellRequest["status"]) ?? "requested",
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
    settledAt: data.settledAt ? ms(data.settledAt) : null,
  };
}

/** Live-subscribe to a campaign's sell requests (newest first). */
export function subscribeSellRequests(
  campaignId: string,
  cb: (requests: SellRequest[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(sellRequestsCol, where("campaignId", "==", campaignId), limit(100));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toSellRequest(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)),
    (err) => {
      console.error("Sell requests subscription failed", err);
      onError?.(err);
    },
  );
}

export async function createSellRequest(
  campaignId: string,
  input: { sellerUid: string; sellerName: string; characterId: string; itemId: string; qty: number },
): Promise<string> {
  const ref = await addDoc(sellRequestsCol, {
    campaignId,
    sellerUid: input.sellerUid,
    sellerName: input.sellerName,
    characterId: input.characterId,
    itemId: input.itemId,
    qty: input.qty,
    priceGp: null, // explicit null (never undefined) — the rules require it
    status: "requested",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settledAt: null,
  });
  return ref.id;
}

/** DM: set a price on a request (unblocks approval). */
export async function priceSellRequest(id: string, priceGp: number): Promise<void> {
  await updateDoc(doc(sellRequestsCol, id), { priceGp, status: "priced", updatedAt: serverTimestamp() });
}

/** DM: reject a request (no gold changes hands). */
export async function declineSellRequest(id: string): Promise<void> {
  await updateDoc(doc(sellRequestsCol, id), { status: "declined", updatedAt: serverTimestamp() });
}

/** DM: approve a priced request — credit the seller's gold, remove the sold
 * item from their inventory, and settle the request. */
export async function approveSellRequest(req: SellRequest, sellerCard: HunterCard): Promise<void> {
  if (req.priceGp == null) throw new Error("Set a price first");
  await patchCharacter(sellerCard.id, {
    coins: (sellerCard.coins ?? 0) + req.priceGp * req.qty,
    inventory: removeFromInventory(sellerCard.inventory ?? [], req.itemId, req.qty),
  });
  await updateDoc(doc(sellRequestsCol, req.id), {
    status: "approved",
    updatedAt: serverTimestamp(),
    settledAt: serverTimestamp(),
  });
}
