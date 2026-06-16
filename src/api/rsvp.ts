import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isTestEmail } from "@/config";
import type { Rsvp, RsvpStatus } from "@/types";

function rsvpsCol(sessionId: string) {
  return collection(db, "sessions", sessionId, "rsvps");
}

/**
 * Live-subscribe to everyone's attendance for a session. Agent test accounts
 * are filtered out (same as players/allowlist) so their e2e RSVPs don't inflate
 * the "X in" count on Sessions vs the Party roster.
 */
export function subscribeRsvps(
  sessionId: string,
  cb: (rsvps: Rsvp[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    rsvpsCol(sessionId),
    (snap) => cb(snap.docs.map((d) => d.data() as Rsvp).filter((r) => !isTestEmail(r.email))),
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
