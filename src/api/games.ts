import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Game, GameParticipant, GamePhase } from "@/types";

const gamesCol = collection(db, "games");

/** Coerce a Firestore Timestamp | number | undefined to ms epoch. */
function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

function toGame(id: string, data: Record<string, unknown>): Game {
  return {
    id,
    sessionId: (data.sessionId as string | null) ?? null,
    title: (data.title as string) ?? "Game",
    dmUid: (data.dmUid as string) ?? "",
    dmName: (data.dmName as string) ?? "DM",
    status: (data.status as Game["status"]) ?? "lobby",
    phase: (data.phase as GamePhase) ?? "exploration",
    sandbox: (data.sandbox as boolean) ?? false,
    createdAt: ms(data.createdAt),
    startedAt: data.startedAt ? ms(data.startedAt) : null,
    endedAt: data.endedAt ? ms(data.endedAt) : null,
    endedPhase: (data.endedPhase as GamePhase | null) ?? null,
  };
}

/** Live-subscribe to recent games (newest first). The store derives the
 * current game (latest non-sandbox in lobby/active) and any sandbox games. */
export function subscribeGames(
  cb: (games: Game[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(gamesCol, orderBy("createdAt", "desc"), limit(30));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toGame(d.id, d.data()))),
    (err) => {
      console.error("Games subscription failed", err);
      onError?.(err);
    },
  );
}

export interface CreateGameInput {
  sessionId: string | null;
  title: string;
  dmUid: string;
  dmName: string;
  sandbox?: boolean;
}

export async function createGame(input: CreateGameInput): Promise<string> {
  const ref = await addDoc(gamesCol, {
    sessionId: input.sessionId,
    title: input.title,
    dmUid: input.dmUid,
    dmName: input.dmName,
    status: "lobby",
    phase: "exploration",
    sandbox: input.sandbox ?? false,
    createdAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,
    endedPhase: null,
  });
  return ref.id;
}

export async function startGame(gameId: string): Promise<void> {
  await updateDoc(doc(gamesCol, gameId), { status: "active", startedAt: serverTimestamp() });
}

export async function setGamePhase(gameId: string, phase: GamePhase): Promise<void> {
  await updateDoc(doc(gamesCol, gameId), { phase });
}

export async function endGame(gameId: string, endedPhase: GamePhase): Promise<void> {
  await updateDoc(doc(gamesCol, gameId), {
    status: "ended",
    endedAt: serverTimestamp(),
    endedPhase,
  });
}

/** Delete a game and all its participants (used to clean up sandbox runs). */
export async function deleteGame(gameId: string): Promise<void> {
  const partsSnap = await getDocs(collection(db, "games", gameId, "participants"));
  await Promise.all(partsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(gamesCol, gameId));
}

// --- Participants / presence ---

function participantsCol(gameId: string) {
  return collection(db, "games", gameId, "participants");
}

export interface JoinInput {
  uid: string;
  name: string;
  classId: string;
  subclassId?: string | null;
  level: number;
  role: GameParticipant["role"];
}

export async function joinGame(gameId: string, p: JoinInput): Promise<void> {
  await setDoc(
    doc(participantsCol(gameId), p.uid),
    {
      uid: p.uid,
      name: p.name,
      classId: p.classId,
      subclassId: p.subclassId ?? null,
      level: p.level,
      role: p.role,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function pingPresence(gameId: string, uid: string): Promise<void> {
  await setDoc(doc(participantsCol(gameId), uid), { lastSeen: serverTimestamp() }, { merge: true });
}

export async function leaveGame(gameId: string, uid: string): Promise<void> {
  await deleteDoc(doc(participantsCol(gameId), uid));
}

export function subscribeParticipants(
  gameId: string,
  cb: (parts: GameParticipant[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    participantsCol(gameId),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: (data.uid as string) ?? d.id,
            name: (data.name as string) ?? "Hunter",
            classId: (data.classId as string) ?? "",
            subclassId: (data.subclassId as string | null) ?? null,
            level: (data.level as number) ?? 1,
            role: (data.role as GameParticipant["role"]) ?? "player",
            joinedAt: ms(data.joinedAt),
            lastSeen: ms(data.lastSeen),
          } satisfies GameParticipant;
        }),
      ),
    (err) => {
      console.error("Participants subscription failed", err);
      onError?.(err);
    },
  );
}
