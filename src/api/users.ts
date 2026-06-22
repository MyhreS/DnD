import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types";

const usersCol = "users";

/** Read a user's self-set profile (name). Null on first login. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, usersCol, uid));
  if (!snap.exists()) return null;
  const d = snap.data();
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
