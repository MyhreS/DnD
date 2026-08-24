import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type {
  Game,
  GameParticipant,
  EncounterState,
  HunterCard,
} from "@/types";
import { normalizeEncounterState } from "@/features/play/lib/turnTimer";

const gamesCol = collection(db, "games");
const activeSeatsCol = collection(db, "activeGameSeats");

const createStandaloneSessionFn = httpsCallable<
  { title: string; dmName: string; hunterIds: string[] },
  { gameId: string }
>(functions, "createStandaloneGameSession");
const addStandaloneParticipantFn = httpsCallable<
  { gameId: string; characterId: string },
  { ok: boolean; pending: boolean }
>(functions, "addStandaloneGameParticipant");
const respondToStandaloneInviteFn = httpsCallable<
  { gameId: string; action: "accept" | "decline" },
  { ok: boolean }
>(functions, "respondToStandaloneGameInvite");
const removeStandaloneParticipantFn = httpsCallable<
  { gameId: string; uid: string },
  { ok: boolean }
>(functions, "removeStandaloneGameParticipant");
const finishStandaloneSessionFn = httpsCallable<
  { gameId: string },
  { ok: boolean }
>(functions, "finishStandaloneGameSession");
const discardStandaloneSessionFn = httpsCallable<{ gameId: string }, { ok: boolean }>(
  functions,
  "discardStandaloneGameSession",
);

export interface ActiveGameSeat {
  uid: string;
  gameId: string;
  role: "dm" | "player";
}

function callableError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) return new Error(error.message);
  return new Error(fallback);
}

/** Coerce a Firestore Timestamp | number | undefined to ms epoch. */
function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

function toParticipant(data: Record<string, unknown>, fallbackUid = ""): GameParticipant {
  return {
    uid: (data.uid as string) ?? fallbackUid,
    characterId: (data.characterId as string | null) ?? null,
    playerName: (data.playerName as string | null) ?? null,
    name: (data.name as string) ?? "Hunter",
    classId: (data.classId as string) ?? "",
    subclassId: (data.subclassId as string | null) ?? null,
    className: (data.className as string | null) ?? null,
    level: (data.level as number) ?? 1,
    role: (data.role as GameParticipant["role"]) ?? "player",
    joinedAt: ms(data.joinedAt),
    lastSeen: ms(data.lastSeen),
  };
}

function toGame(id: string, data: Record<string, unknown>): Game {
  return {
    id,
    campaignId: (data.campaignId as string | null) ?? null,
    sessionId: (data.sessionId as string | null) ?? null,
    title: (data.title as string) ?? "Game",
    dmUid: (data.dmUid as string) ?? "",
    dmName: (data.dmName as string) ?? "DM",
    participantUids: Array.isArray(data.participantUids) ? (data.participantUids as string[]) : [],
    participantRoster: Array.isArray(data.participantRoster)
      ? (data.participantRoster as Record<string, unknown>[]).map((participant) => toParticipant(participant))
      : [],
    invitedUids: Array.isArray(data.invitedUids) ? (data.invitedUids as string[]) : [],
    inviteRoster: Array.isArray(data.inviteRoster)
      ? (data.inviteRoster as Record<string, unknown>[]).map((participant) => toParticipant(participant))
      : [],
    attendeeRoster: Array.isArray(data.attendeeRoster)
      ? (data.attendeeRoster as Record<string, unknown>[]).map((participant) => toParticipant(participant))
      : undefined,
    status: (data.status as Game["status"]) ?? "lobby",
    combat: normalizeEncounterState(data.combat),
    sandbox: (data.sandbox as boolean) ?? false,
    clockRunning: (data.clockRunning as boolean) ?? false,
    clockStartedAt: data.clockStartedAt ? ms(data.clockStartedAt) : null,
    clockElapsedMs: Math.max(0, (data.clockElapsedMs as number) ?? 0),
    createdAt: ms(data.createdAt),
    startedAt: data.startedAt ? ms(data.startedAt) : null,
    endedAt: data.endedAt ? ms(data.endedAt) : null,
  };
}

/** Sessions visible to a user: ones they run plus ones a DM invited them to.
 * Two simple queries avoid a composite index; their snapshots are merged and
 * de-duplicated on the client. */
export function subscribeUserGames(
  uid: string,
  cb: (games: Game[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  let owned: Game[] = [];
  let invited: Game[] = [];
  let pending: Game[] = [];
  const emit = () => {
    const merged = new Map<string, Game>();
    [...owned, ...invited, ...pending].forEach((game) => merged.set(game.id, game));
    cb([...merged.values()].sort((a, b) => b.createdAt - a.createdAt));
  };
  const fail = (err: unknown) => {
    console.error("User games subscription failed", err);
    onError?.(err);
  };
  const unsubs = [
    onSnapshot(query(gamesCol, where("dmUid", "==", uid), limit(50)), (snap) => {
      owned = snap.docs.map((item) => toGame(item.id, item.data()));
      emit();
    }, fail),
    onSnapshot(query(gamesCol, where("participantUids", "array-contains", uid), limit(50)), (snap) => {
      invited = snap.docs.map((item) => toGame(item.id, item.data()));
      emit();
    }, fail),
    onSnapshot(query(gamesCol, where("invitedUids", "array-contains", uid), limit(50)), (snap) => {
      pending = snap.docs.map((item) => toGame(item.id, item.data()));
      emit();
    }, fail),
  ];
  return () => unsubs.forEach((unsubscribe) => unsubscribe());
}

/** Availability index maintained atomically by the session Cloud Functions. */
export function subscribeActiveGameSeats(
  cb: (seats: Map<string, ActiveGameSeat>) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    activeSeatsCol,
    (snapshot) => cb(new Map(snapshot.docs.map((item) => {
      const data = item.data();
      const seat: ActiveGameSeat = {
        uid: item.id,
        gameId: String(data.gameId ?? ""),
        role: data.role === "dm" ? "dm" : "player",
      };
      return [item.id, seat];
    }))),
    (error) => {
      console.error("Active game seats subscription failed", error);
      onError?.(error);
    },
  );
}

/** Live-subscribe to a campaign's games (newest first, sorted client-side to
 * avoid a composite index). The store derives the current/last game. */
export function subscribeGames(
  campaignId: string,
  cb: (games: Game[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(gamesCol, where("campaignId", "==", campaignId), limit(50));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toGame(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)),
    (err) => {
      console.error("Games subscription failed", err);
      onError?.(err);
    },
  );
}

export interface CreateGameInput {
  campaignId: string | null;
  sessionId: string | null;
  title: string;
  dmUid: string;
  dmName: string;
  sandbox?: boolean;
}

/** Atomically creates a standalone session and its selected Hunter roster. */
export async function createGameSession(input: CreateGameInput, hunters: HunterCard[]): Promise<string> {
  if (input.campaignId !== null) throw new Error("Campaign sessions are not created from the Game page.");
  const invited = hunters.filter((hunter) => hunter.ownerUid !== input.dmUid);
  const unique = [...new Map(invited.map((hunter) => [hunter.ownerUid, hunter])).values()];
  try {
    const result = await createStandaloneSessionFn({
      title: input.title.trim().slice(0, 80),
      dmName: input.dmName,
      hunterIds: unique.map((hunter) => hunter.id),
    });
    return result.data.gameId;
  } catch (error) {
    throw callableError(error, "Could not create the session.");
  }
}

export async function addGameParticipant(game: Game, card: HunterCard): Promise<boolean> {
  if (card.ownerUid === game.dmUid) {
    throw new Error("The session creator cannot also join as a player.");
  }
  try {
    const result = await addStandaloneParticipantFn({ gameId: game.id, characterId: card.id });
    return result.data.pending;
  } catch (error) {
    throw callableError(error, "Could not add that player.");
  }
}

export async function respondToGameInvite(gameId: string, action: "accept" | "decline"): Promise<void> {
  try {
    await respondToStandaloneInviteFn({ gameId, action });
  } catch (error) {
    throw callableError(error, `Could not ${action} that session request.`);
  }
}

export async function removeGameParticipant(game: Game, uid: string): Promise<void> {
  try {
    await removeStandaloneParticipantFn({ gameId: game.id, uid });
  } catch (error) {
    throw callableError(error, "Could not remove that player.");
  }
}

export async function finishGameSession(game: Game): Promise<void> {
  try {
    await finishStandaloneSessionFn({ gameId: game.id });
  } catch (error) {
    throw callableError(error, "Could not end the session.");
  }
}

export async function discardGameSession(gameId: string): Promise<void> {
  try {
    await discardStandaloneSessionFn({ gameId });
  } catch (error) {
    throw callableError(error, "Could not discard the session.");
  }
}

export async function startGame(gameId: string): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(gamesCol, gameId), {
    status: "active",
    startedAt: serverTimestamp(),
    clockRunning: true,
    clockStartedAt: now,
  });
}

/** Set the live combat encounter state (round / whose turn / active). */
export async function setGameCombat(gameId: string, combat: EncounterState): Promise<void> {
  await updateDoc(doc(gamesCol, gameId), { combat });
}

// --- Participants / presence ---

function participantsCol(gameId: string) {
  return collection(db, "games", gameId, "participants");
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
        snap.docs.map((d) => toParticipant(d.data(), d.id)),
      ),
    (err) => {
      console.error("Participants subscription failed", err);
      onError?.(err);
    },
  );
}
