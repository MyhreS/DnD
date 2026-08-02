import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { decodeCombatSession } from "@/features/combat/lib/combatSessionCodec";
import type { CombatSession } from "@/features/combat/types";

const activeCombatRef = doc(db, "combat", "active");

export interface CombatSnapshot {
  session: CombatSession | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/** Live active encounter. Reads are allowed for every allowlisted member. */
export function subscribeCombatSession(
  callback: (snapshot: CombatSnapshot) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    activeCombatRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      const session = snapshot.exists() ? decodeCombatSession(snapshot.data()) : null;
      if (snapshot.exists() && !session) {
        onError?.(new Error("The active combat document is invalid."));
        return;
      }
      callback({
        session,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      });
    },
    (error) => {
      console.error("Combat subscription failed", error);
      onError?.(error);
    },
  );
}

/** Staff-only write, enforced again by Firestore security rules. */
export async function saveCombatSession(session: CombatSession): Promise<void> {
  await setDoc(activeCombatRef, session);
}
