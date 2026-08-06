import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EnemyStats, EnemyTemplate } from "@/types";

function enemiesCol(uid: string) {
  return collection(db, "users", uid, "enemies");
}

function ms(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as Timestamp).toMillis === "function") return (value as Timestamp).toMillis();
  return 0;
}

function fromDoc(id: string, data: DocumentData): EnemyTemplate {
  return {
    id,
    name: String(data.name ?? "Enemy"),
    initiative: Number(data.initiative ?? 0),
    ac: typeof data.ac === "number" ? data.ac : null,
    maxHp: Math.max(1, Number(data.maxHp ?? 1)),
    note: typeof data.note === "string" ? data.note : null,
    revealHp: data.revealHp === true,
    revealStats: data.revealStats === true,
    archived: data.archived === true,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
  };
}

export function subscribeEnemyTemplates(
  uid: string,
  onValue: (templates: EnemyTemplate[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(enemiesCol(uid), (snapshot) => {
    const templates = snapshot.docs
      .map((item) => fromDoc(item.id, item.data()))
      .sort((a, b) => a.name.localeCompare(b.name) || b.updatedAt - a.updatedAt);
    onValue(templates);
  }, onError);
}

export async function createEnemyTemplate(uid: string, stats: EnemyStats): Promise<string> {
  const created = await addDoc(enemiesCol(uid), {
    ...stats,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return created.id;
}

export async function updateEnemyTemplate(
  uid: string,
  id: string,
  patch: Partial<EnemyStats> & { archived?: boolean },
): Promise<void> {
  await updateDoc(doc(enemiesCol(uid), id), { ...patch, updatedAt: serverTimestamp() });
}
