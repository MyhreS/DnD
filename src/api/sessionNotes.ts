import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SessionNote } from "@/types";

function notesCol(gameId: string) {
  return collection(db, "games", gameId, "notes");
}

function millis(value: unknown): number {
  return value && typeof (value as { toMillis?: unknown }).toMillis === "function"
    ? (value as { toMillis: () => number }).toMillis()
    : 0;
}

export function subscribeSessionNotes(
  gameId: string,
  onChange: (notes: SessionNote[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(notesCol(gameId), orderBy("createdAt", "desc"), limit(100)),
    (snapshot) => onChange(snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        authorUid: String(data.authorUid ?? ""),
        authorName: String(data.authorName ?? "Someone"),
        body: String(data.body ?? ""),
        createdAt: millis(data.createdAt),
      };
    })),
    onError,
  );
}

export async function addSessionNote(gameId: string, authorUid: string, authorName: string, body: string): Promise<void> {
  await addDoc(notesCol(gameId), {
    authorUid,
    authorName: authorName.trim().slice(0, 80) || "Someone",
    body: body.trim().slice(0, 2000),
    createdAt: serverTimestamp(),
  });
}
