import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isPreviewActive, previewCard, previewArchive } from "@/dev/preview";
import { isTestEmail } from "@/config";
import type { ArchivedCharacter, HunterCard } from "@/types";

// Characters live in /characters/{id} — a user (ownerUid) can own several.
const charsCol = collection(db, "characters");
const archiveCol = collection(db, "archive");

const realCards = (cards: HunterCard[]) => cards.filter((c) => !isTestEmail(c.ownerEmail));

function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return Date.now();
}

export async function saveCharacter(card: HunterCard): Promise<void> {
  await setDoc(doc(charsCol, card.id), card, { merge: true });
}

/** Merge a partial update into a character (owner edits own; DM edits any). */
export async function patchCharacter(id: string, partial: Partial<HunterCard>): Promise<void> {
  await setDoc(doc(charsCol, id), partial, { merge: true });
}

/** Live-subscribe to all characters a user owns. */
export function subscribeMyCharacters(
  ownerUid: string,
  cb: (cards: HunterCard[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  if (isPreviewActive()) {
    cb([previewCard("preview-uid")]);
    return () => {};
  }
  return onSnapshot(
    query(charsCol, where("ownerUid", "==", ownerUid)),
    (snap) => cb(snap.docs.map((d) => d.data() as HunterCard)),
    (err) => {
      console.error("Characters subscription failed", err);
      onError?.(err);
    },
  );
}

/** Live-subscribe to every character (party gallery / DM board). */
export function subscribeAllCharacters(
  cb: (cards: HunterCard[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  if (isPreviewActive()) {
    cb([previewCard("preview-uid")]);
    return () => {};
  }
  return onSnapshot(
    charsCol,
    (snap) => cb(realCards(snap.docs.map((d) => d.data() as HunterCard))),
    (err) => {
      console.error("Party subscription failed", err);
      onError?.(err);
    },
  );
}

// --- Archive (dead/deleted, recoverable until the game ends) ---

export async function archiveCharacter(
  card: HunterCard,
  reason: ArchivedCharacter["reason"],
  gameId: string | null,
): Promise<void> {
  await addDoc(archiveCol, {
    originalUid: card.ownerUid,
    gameId: gameId ?? null,
    reason,
    archivedAt: serverTimestamp(),
    card,
  });
  await deleteDoc(doc(charsCol, card.id));
}

export async function recoverCharacter(a: ArchivedCharacter): Promise<void> {
  await setDoc(doc(charsCol, a.card.id), { ...a.card, deathPending: false });
  await deleteDoc(doc(archiveCol, a.id));
}

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
