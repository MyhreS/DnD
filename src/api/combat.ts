import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Combatant } from "@/types";

/** Combatants live at /games/{gameId}/combatants/{id}. */
function combatantsCol(gameId: string) {
  return collection(db, "games", gameId, "combatants");
}

function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

export type NewCombatant = Omit<Combatant, "id" | "createdAt">;

export async function addCombatant(gameId: string, data: NewCombatant): Promise<void> {
  await addDoc(combatantsCol(gameId), { ...data, createdAt: serverTimestamp() });
}

export async function patchCombatant(
  gameId: string,
  id: string,
  partial: Partial<Combatant>,
): Promise<void> {
  await setDoc(doc(combatantsCol(gameId), id), partial, { merge: true });
}

export async function removeCombatant(gameId: string, id: string): Promise<void> {
  await deleteDoc(doc(combatantsCol(gameId), id));
}

export async function clearCombatants(gameId: string): Promise<void> {
  const snap = await getDocs(combatantsCol(gameId));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export function subscribeCombatants(
  gameId: string,
  cb: (combatants: Combatant[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    combatantsCol(gameId),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            kind: (data.kind as Combatant["kind"]) ?? "monster",
            name: (data.name as string) ?? "Combatant",
            characterId: (data.characterId as string | null) ?? null,
            initiative: (data.initiative as number) ?? 0,
            ac: (data.ac as number | null) ?? null,
            maxHp: (data.maxHp as number | null) ?? null,
            currentHp: (data.currentHp as number | null) ?? null,
            conditions: (data.conditions as string[]) ?? [],
            createdAt: ms(data.createdAt),
          } satisfies Combatant;
        }),
      ),
    (err) => {
      console.error("Combatants subscription failed", err);
      onError?.(err);
    },
  );
}
