import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Combatant } from "@/types";

function combatantsCol(gameId: string) {
  return collection(db, "games", gameId, "combatants");
}

function battleViewCol(gameId: string) {
  return collection(db, "games", gameId, "battleView");
}

function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

function playerProjection(combatant: Omit<Combatant, "id"> | Combatant): DocumentData {
  const revealHp = combatant.kind !== "monster" || combatant.revealHp === true;
  const revealStats = combatant.kind !== "monster" || combatant.revealStats === true;
  return {
    kind: combatant.kind,
    name: combatant.name,
    characterId: combatant.characterId ?? null,
    initiative: combatant.initiative,
    ac: revealStats ? combatant.ac ?? null : null,
    maxHp: revealHp ? combatant.maxHp ?? null : null,
    currentHp: revealHp ? combatant.currentHp ?? null : null,
    defeated: combatant.kind === "monster" && combatant.defeated === true,
    conditions: combatant.conditions ?? [],
    conditionSince: combatant.conditionSince ?? {},
    note: revealStats ? combatant.note ?? null : null,
    revealHp: combatant.revealHp === true,
    revealStats: combatant.revealStats === true,
    isWarden: combatant.isWarden === true,
    createdAt: combatant.createdAt || serverTimestamp(),
  };
}

function fromDoc(id: string, data: DocumentData): Combatant {
  return {
    id,
    kind: (data.kind as Combatant["kind"]) ?? "monster",
    name: (data.name as string) ?? "Combatant",
    characterId: (data.characterId as string | null) ?? null,
    initiative: (data.initiative as number) ?? 0,
    ac: (data.ac as number | null) ?? null,
    maxHp: (data.maxHp as number | null) ?? null,
    currentHp: (data.currentHp as number | null) ?? null,
    defeated: data.defeated === true,
    conditions: (data.conditions as string[]) ?? [],
    conditionSince: (data.conditionSince as Record<string, number>) ?? {},
    note: (data.note as string | null) ?? null,
    revealHp: data.revealHp === true,
    revealStats: data.revealStats === true,
    enemyTemplateId: (data.enemyTemplateId as string | null) ?? null,
    baseStats: data.baseStats ? {
      name: String(data.baseStats.name ?? data.name ?? "Enemy"),
      initiative: Number(data.baseStats.initiative ?? data.initiative ?? 0),
      ac: typeof data.baseStats.ac === "number" ? data.baseStats.ac : null,
      maxHp: Math.max(1, Number(data.baseStats.maxHp ?? data.maxHp ?? 1)),
      note: typeof data.baseStats.note === "string" ? data.baseStats.note : null,
      revealHp: data.baseStats.revealHp === true,
      revealStats: data.baseStats.revealStats === true,
    } : null,
    isWarden: data.isWarden === true,
    createdAt: ms(data.createdAt),
  };
}

export type NewCombatant = Omit<Combatant, "id" | "createdAt">;

export async function addCombatant(gameId: string, data: NewCombatant): Promise<string> {
  const privateRef = doc(combatantsCol(gameId));
  const battleRef = doc(battleViewCol(gameId), privateRef.id);
  const createdAt = serverTimestamp();
  const batch = writeBatch(db);
  batch.set(privateRef, { ...data, createdAt });
  batch.set(battleRef, playerProjection({ ...data, createdAt: Date.now() }));
  await batch.commit();
  return privateRef.id;
}

export async function addCombatants(gameId: string, combatants: NewCombatant[]): Promise<Combatant[]> {
  if (combatants.length === 0) return [];
  const batch = writeBatch(db);
  const now = Date.now();
  const rows = combatants.map((combatant) => {
    const privateRef = doc(combatantsCol(gameId));
    batch.set(privateRef, { ...combatant, createdAt: serverTimestamp() });
    batch.set(doc(battleViewCol(gameId), privateRef.id), playerProjection({ ...combatant, createdAt: now }));
    return { ...combatant, id: privateRef.id, createdAt: now };
  });
  await batch.commit();
  return rows;
}

export async function patchCombatant(
  gameId: string,
  id: string,
  partial: Partial<Combatant>,
  next: Combatant,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(combatantsCol(gameId), id), partial);
  batch.set(doc(battleViewCol(gameId), id), playerProjection(next));
  await batch.commit();
}

export async function removeCombatant(gameId: string, id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(combatantsCol(gameId), id));
  batch.delete(doc(battleViewCol(gameId), id));
  await batch.commit();
}

export async function clearCombatants(gameId: string): Promise<void> {
  const [privateSnap, publicSnap] = await Promise.all([
    getDocs(combatantsCol(gameId)),
    getDocs(battleViewCol(gameId)),
  ]);
  const batch = writeBatch(db);
  privateSnap.docs.forEach((row) => batch.delete(row.ref));
  publicSnap.docs.forEach((row) => batch.delete(row.ref));
  await batch.commit();
}

export function subscribeCombatants(
  gameId: string,
  publicView: boolean,
  cb: (combatants: Combatant[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    publicView ? battleViewCol(gameId) : combatantsCol(gameId),
    (snap) => {
      const combatants = snap.docs.map((row) => fromDoc(row.id, row.data()));
      cb(combatants);
    },
    (err) => {
      console.error("Combatants subscription failed", err);
      onError?.(err);
    },
  );
}
