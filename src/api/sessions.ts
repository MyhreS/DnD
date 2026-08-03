import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logEvent } from "@/api/activity";
import type { SessionEvent } from "@/types";

/** "12 Jul 2026, 18:00" — how session dates read in the campaign log. */
function prettyDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const sessionsCol = collection(db, "sessions");

/** Live-subscribe to a campaign's schedule. Returns an unsubscribe fn. */
export function subscribeSessions(
  campaignId: string,
  cb: (sessions: SessionEvent[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    query(sessionsCol, where("campaignId", "==", campaignId)),
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          campaignId: (data.campaignId as string | null) ?? null,
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
  actor?: { uid: string; name: string },
): Promise<void> {
  await addDoc(sessionsCol, {
    ...input,
    createdBy,
    updatedAt: serverTimestamp(),
  });
  if (actor && input.campaignId) {
    await logEvent({
      campaignId: input.campaignId,
      type: "session.created",
      message: `${actor.name} scheduled a session — «${input.title}» on ${prettyDate(input.date)}.`,
      actorUid: actor.uid,
      actorName: actor.name,
    });
  }
}

export async function updateSession(
  id: string,
  input: Omit<SessionEvent, "id">,
  actor?: { uid: string; name: string },
): Promise<void> {
  await setDoc(
    doc(sessionsCol, id),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
  if (actor && input.campaignId) {
    await logEvent({
      campaignId: input.campaignId,
      type: "session.updated",
      message: `${actor.name} updated the session «${input.title}» (${prettyDate(input.date)}).`,
      actorUid: actor.uid,
      actorName: actor.name,
    });
  }
}

export async function deleteSession(id: string): Promise<void> {
  await deleteDoc(doc(sessionsCol, id));
}
