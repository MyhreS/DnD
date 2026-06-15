import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Rsvp, RsvpStatus } from "@/types";

function rsvpsCol(sessionId: string) {
  return collection(db, "sessions", sessionId, "rsvps");
}

/** Live-subscribe to everyone's attendance for a session. */
export function subscribeRsvps(
  sessionId: string,
  cb: (rsvps: Rsvp[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    rsvpsCol(sessionId),
    (snap) => cb(snap.docs.map((d) => d.data() as Rsvp)),
    (err) => {
      console.error("RSVP subscription failed", err);
      onError?.(err);
    },
  );
}

export async function setRsvp(
  sessionId: string,
  rsvp: { uid: string; name: string; email: string; status: RsvpStatus },
): Promise<void> {
  await setDoc(doc(rsvpsCol(sessionId), rsvp.uid), {
    ...rsvp,
    at: Date.now(),
  } satisfies Rsvp);
}
