import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeCard } from "@/lib/character";
import { isPreviewActive, previewCard, previewPartyCards } from "@/dev/preview";
import { isTestEmail } from "@/config";
import type { HunterCard, SheetData } from "@/types";
import { characterSheetUpdate } from "@/features/hunter/lib/sheetPersistence";

// Characters live in /characters/{id} — a user (ownerUid) can own several.
const charsCol = collection(db, "characters");
const archiveCol = collection(db, "archive");

const realCards = (cards: HunterCard[]) => cards.filter((c) => !isTestEmail(c.ownerEmail));

export async function saveCharacter(card: HunterCard): Promise<void> {
  await setDoc(doc(charsCol, card.id), card, { merge: true });
}
/** Merge a partial update into a character (owner edits own; DM edits any). */
export async function patchCharacter(id: string, partial: Partial<HunterCard>): Promise<void> {
  if (isPreviewActive()) {
    // Preview mode has no Firestore session — mock-apply the patch to the
    // in-memory store (like playerStore.save / charactersStore.dmPatch do)
    // so sheet edits respond in preview instead of erroring to the console.
    // Dynamic import: playerStore statically imports this module.
    const { usePlayerStore } = await import("@/features/hunter/store/playerStore");
    usePlayerStore.setState((s) => ({
      characters: s.characters.map((c) => (c.id === id ? normalizeCard({ ...c, ...partial }) : c)),
      card: s.card && s.card.id === id ? normalizeCard({ ...s.card, ...partial }) : s.card,
    }));
    return;
  }
  await setDoc(doc(charsCol, id), partial, { merge: true });
}

/** Per-field paper-sheet autosave: writes ONLY the changed keys, as dotted
 * `sheet.<key>` paths, so two open copies (phone + desktop, or the DM and the
 * owner) merge per field instead of last-writer-wins on the whole map.
 * `mirror` carries the denormalized name/level/background ONLY when those
 * sheet boxes were among the changed keys. Fails (rather than resurrecting)
 * if the doc was deleted meanwhile — updateDoc never creates. */
export async function patchCharacterSheet(
  id: string,
  sheet: SheetData,
  keys: string[],
  mirror: Partial<HunterCard>,
  cardPatch: Partial<HunterCard> = {},
): Promise<void> {
  if (isPreviewActive()) return patchCharacter(id, { ...cardPatch, ...mirror, sheet });
  const update = characterSheetUpdate(sheet, keys, mirror, cardPatch, deleteField(), Date.now());
  await updateDoc(doc(charsCol, id), update);
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
    (snap) => cb(snap.docs.map((d) => normalizeCard(d.data() as HunterCard))),
    (err) => {
      console.error("Characters subscription failed", err);
      onError?.(err);
    },
  );
}

/** Live-subscribe to characters. Pass a `campaignId` to stream ONLY that
 * campaign's hunters (party gallery / play + DM control board) via a
 * server-side `where`, so cost scales with the campaign — not with every
 * hunter across the whole app. Omit it for the global corpus (the main-menu
 * DM search board, ambient fighter shows). */
export function subscribeAllCharacters(
  cb: (cards: HunterCard[]) => void,
  onError?: (err: unknown) => void,
  campaignId?: string | null,
): () => void {
  // Preview: the whole sample party (incl. the sheet-only hunter), so the
  // roster / gallery / status board render every flavour of card.
  if (isPreviewActive()) {
    cb(previewPartyCards());
    return () => {};
  }
  const q = campaignId ? query(charsCol, where("campaignId", "==", campaignId)) : charsCol;
  return onSnapshot(
    q,
    (snap) => cb(realCards(snap.docs.map((d) => normalizeCard(d.data() as HunterCard)))),
    (err) => {
      console.error("Party subscription failed", err);
      onError?.(err);
    },
  );
}

// --- Recoverable character deletion record ---

export async function archiveCharacter(
  card: HunterCard,
  gameId: string | null,
): Promise<void> {
  const archiveRef = doc(archiveCol);
  const batch = writeBatch(db);
  batch.set(archiveRef, {
    originalUid: card.ownerUid,
    gameId: gameId ?? null,
    reason: "deleted",
    archivedAt: serverTimestamp(),
    card,
  });
  batch.delete(doc(charsCol, card.id));
  await batch.commit();
}
