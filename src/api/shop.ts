import { collection, doc, updateDoc, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ShopState } from "@/types";

const gamesCol = collection(db, "games");

/** Firestore rejects `undefined`, so optional fields are written only when set. */
function toShopDoc(shop: ShopState): DocumentData {
  return {
    open: shop.open,
    ...(shop.name ? { name: shop.name } : {}),
    lines: shop.lines.map((line) => ({
      id: line.id,
      ...(line.itemId ? { itemId: line.itemId } : {}),
      name: line.name,
      priceGp: line.priceGp,
      ...(line.note ? { note: line.note } : {}),
    })),
  };
}

/** Set the session shop (stock + open/closed) on the game doc. The game's DM
 * is the only writer; every member reads it, so no rules change is needed. */
export async function setGameShop(gameId: string, shop: ShopState): Promise<void> {
  await updateDoc(doc(gamesCol, gameId), { shop: toShopDoc(shop) });
}
