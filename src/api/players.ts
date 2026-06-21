import {
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  getDocs,
  collection,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isPreviewActive, previewCard, previewArchive } from "@/dev/preview";
import { isTestEmail } from "@/config";
import type { ArchivedCharacter, HunterCard } from "@/types";

const realCards = (cards: HunterCard[]) => cards.filter((c) => !isTestEmail(c.ownerEmail));

const playersCol = collection(db, "players");
const archiveCol = collection(db, "archive");

function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return Date.now();
}

export async function saveHunterCard(card: HunterCard): Promise<void> {
  await setDoc(doc(playersCol, card.uid), card, { merge: true });
}

/** Merge a partial update into a player's card (player edits own; DM edits any). */
export async function patchHunterCard(uid: string, partial: Partial<HunterCard>): Promise<void> {
  await setDoc(doc(playersCol, uid), partial, { merge: true });
}

/** Move a character into the archive (dead/deleted), then remove the live card.
 * Keeps it recoverable until the game ends. */
export async function archiveCharacter(
  card: HunterCard,
  reason: ArchivedCharacter["reason"],
  gameId: string | null,
): Promise<void> {
  await addDoc(archiveCol, {
    originalUid: card.uid,
    gameId: gameId ?? null,
    reason,
    archivedAt: serverTimestamp(),
    card,
  });
  await deleteDoc(doc(playersCol, card.uid));
}

/** Recover an archived character back into play (DM only). */
export async function recoverCharacter(a: ArchivedCharacter): Promise<void> {
  await setDoc(doc(playersCol, a.originalUid), { ...a.card, deathPending: false });
  await deleteDoc(doc(archiveCol, a.id));
}

/** Remove every archived character (called when the game ends). */
export async function purgeArchive(): Promise<void> {
  const snap = await getDocs(archiveCol);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export function subscribeArchive(
  cb: (chars: ArchivedCharacter[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  if (isPreviewActive()) {
    cb(previewArchive());
    return () => {};
  }
  return onSnapshot(
    archiveCol,
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            originalUid: (data.originalUid as string) ?? "",
            gameId: (data.gameId as string | null) ?? null,
            reason: (data.reason as ArchivedCharacter["reason"]) ?? "deleted",
            archivedAt: ms(data.archivedAt),
            card: data.card as HunterCard,
          } satisfies ArchivedCharacter;
        }),
      ),
    (err) => {
      console.error("Archive subscription failed", err);
      onError?.(err);
    },
  );
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
  if (isPreviewActive()) {
    cb([previewCard("preview-uid")]);
    return () => {};
  }
  return onSnapshot(
    playersCol,
    (snap) => cb(realCards(snap.docs.map((d) => d.data() as HunterCard))),
    (err) => {
      console.error("Party subscription failed", err);
      onError?.(err);
    },
  );
}
