import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isPreviewActive } from "@/dev/preview";
import type { UserProfile } from "@/types";

const usersCol = "users";

/** Read a user's self-set profile (name). Null on first login — including
 * when the doc exists but holds no name yet (e.g. only `dmPicks`), so a
 * picks-only doc never skips onboarding with an empty display name. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, usersCol, uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (!d.firstName && !d.lastName) return null;
  return {
    uid,
    firstName: (d.firstName as string) ?? "",
    lastName: (d.lastName as string) ?? "",
    email: (d.email as string) ?? "",
  };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(
    doc(db, usersCol, profile.uid),
    {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// --- DM board picks (the `dmPicks` field of /users/{uid}) ---

// Preview mode has no real user doc — picks live in memory so the seeded DM
// board still demos add/remove within the session.
let previewPicks: string[] = [];
let previewNotify: ((ids: string[] | null) => void) | null = null;

/** Live-subscribe to the signed-in user's DM board picks (character ids on
 * `/users/{uid}.dmPicks`, owner-only per the rules). Emits `null` when the
 * field has never been written — distinct from an explicitly empty board —
 * so callers can decide whether to migrate legacy local picks. */
export function subscribeDmPicks(
  uid: string,
  cb: (ids: string[] | null) => void,
): () => void {
  if (isPreviewActive()) {
    previewNotify = cb;
    cb([...previewPicks]);
    return () => {
      if (previewNotify === cb) previewNotify = null;
    };
  }
  return onSnapshot(
    doc(db, usersCol, uid),
    (snap) => {
      const raw: unknown = snap.exists() ? snap.data().dmPicks : undefined;
      if (!Array.isArray(raw)) {
        cb(null);
        return;
      }
      cb(raw.filter((x): x is string => typeof x === "string"));
    },
    (err) => {
      console.error("DM picks subscription failed", err);
      cb([]);
    },
  );
}

/** Persist the DM board wholesale (add/remove/prune all funnel through here). */
export async function saveDmPicks(uid: string, ids: string[]): Promise<void> {
  if (isPreviewActive()) {
    previewPicks = ids;
    previewNotify?.([...ids]);
    return;
  }
  await setDoc(doc(db, usersCol, uid), { dmPicks: ids }, { merge: true });
}
