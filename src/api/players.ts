import { doc, setDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { HunterCard } from "@/types";

const playersCol = collection(db, "players");

export async function saveHunterCard(card: HunterCard): Promise<void> {
  await setDoc(doc(playersCol, card.uid), card, { merge: true });
}

/** Live-subscribe to your own hunter card. Returns an unsubscribe fn. */
export function subscribeHunterCard(
  uid: string,
  cb: (card: HunterCard | null) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    doc(playersCol, uid),
    (snap) => cb(snap.exists() ? (snap.data() as HunterCard) : null),
    (err) => {
      console.error("Hunter card subscription failed", err);
      onError?.(err);
    },
  );
}

/** Live-subscribe to every party member's card. */
export function subscribeParty(
  cb: (cards: HunterCard[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    playersCol,
    (snap) => cb(snap.docs.map((d) => d.data() as HunterCard)),
    (err) => {
      console.error("Party subscription failed", err);
      onError?.(err);
    },
  );
}
