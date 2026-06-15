import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SessionEvent } from "@/types";

const sessionsCol = collection(db, "sessions");

/** Live-subscribe to the schedule. Returns an unsubscribe fn. */
export function subscribeSessions(
  cb: (sessions: SessionEvent[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    sessionsCol,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          date: data.date as string,
          title: (data.title as string) ?? "Session",
          location: (data.location as string) ?? "",
          notes: (data.notes as string) ?? "",
          createdBy: data.createdBy as string | undefined,
        } satisfies SessionEvent;
      });
      cb(list);
    },
    (err) => {
      console.error("Sessions subscription failed", err);
      onError?.(err);
    },
  );
}

export async function createSession(
  input: Omit<SessionEvent, "id">,
  createdBy: string,
): Promise<void> {
  await addDoc(sessionsCol, {
    ...input,
    createdBy,
    updatedAt: serverTimestamp(),
  });
}

export async function updateSession(
  id: string,
  input: Omit<SessionEvent, "id">,
): Promise<void> {
  await setDoc(
    doc(sessionsCol, id),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function deleteSession(id: string): Promise<void> {
  await deleteDoc(doc(sessionsCol, id));
}
