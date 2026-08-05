import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

const CALLABLE_OPTIONS = { region: "europe-west1", maxInstances: 5 } as const;
const PHASES = new Set(["exploration", "combat", "short_rest", "long_rest"]);
const LOCATIONS = new Set(["lodge", "safe", "wild"]);
const LOOT_CATEGORIES = new Set(["Weapon", "Armor", "Gear"]);
const CARRY_CATEGORIES = new Set(["Insignificant", "Significant", "Oversized"]);

interface ParticipantSnapshot {
  uid: string;
  characterId: string;
  playerName: string;
  name: string;
  classId: string;
  subclassId: string | null;
  className: string | null;
  level: number;
  role: "player";
  joinedAt: number;
  lastSeen: number;
}

function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");
  return uid;
}

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanStringList(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))].slice(0, max);
}

function participantFrom(id: string, data: DocumentData): ParticipantSnapshot {
  const now = Date.now();
  const sheet = data.sheet && typeof data.sheet === "object" ? data.sheet as DocumentData : {};
  return {
    uid: String(data.ownerUid ?? ""),
    characterId: id,
    playerName: cleanString(data.ownerName || data.ownerEmail || "Player", 100),
    name: cleanString(data.name || "Hunter", 100),
    classId: cleanString(data.classId, 80),
    subclassId: cleanString(data.subclassId, 80) || null,
    className: cleanString(sheet.class, 100) || null,
    level: Math.max(1, Math.min(20, Number(data.level) || 1)),
    role: "player",
    joinedAt: now,
    lastSeen: now,
  };
}

function millis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function seatRefs(db: FirebaseFirestore.Firestore, uids: string[]): DocumentReference[] {
  return uids.map((uid) => db.doc(`activeGameSeats/${uid}`));
}

async function assertSeatsAvailable(
  tx: Transaction,
  refs: DocumentReference[],
  gameId: string,
  labels: Map<string, string>,
): Promise<void> {
  const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
  for (const snapshot of snapshots) {
    if (!snapshot.exists || snapshot.data()?.gameId === gameId) continue;
    const label = labels.get(snapshot.id) ?? "That player";
    throw new HttpsError("failed-precondition", `${label} is already in another active session.`);
  }
}

async function releaseSeats(
  tx: Transaction,
  refs: DocumentReference[],
  gameId: string,
): Promise<void> {
  const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
  for (const snapshot of snapshots) {
    if (snapshot.exists && snapshot.data()?.gameId === gameId) tx.delete(snapshot.ref);
  }
}

function activeSeatUids(game: DocumentData): string[] {
  const recorded = cleanStringList(game.seatUids);
  if (recorded.length > 0) return recorded;
  return cleanStringList([game.dmUid, ...(Array.isArray(game.participantUids) ? game.participantUids : [])]);
}

function attendeeRoster(game: DocumentData, current: ParticipantSnapshot[]): ParticipantSnapshot[] {
  const saved = Array.isArray(game.attendeeRoster) ? game.attendeeRoster as ParticipantSnapshot[] : current;
  const byUid = new Map(saved.map((participant) => [participant.uid, participant]));
  current.forEach((participant) => byUid.set(participant.uid, participant));
  return [...byUid.values()];
}

function finiteNumber(value: unknown, min: number, max: number, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sessionItem(raw: unknown, id: string): DocumentData {
  const input = raw && typeof raw === "object" ? raw as DocumentData : {};
  const name = cleanString(input.name, 100);
  const category = cleanString(input.category, 20);
  const carry = cleanString(input.carry, 20);
  if (!name || !LOOT_CATEGORIES.has(category) || !CARRY_CATEGORIES.has(carry)) {
    throw new HttpsError("invalid-argument", "The item name, type, and carrying category are required.");
  }
  const item: DocumentData = {
    id: `session-${id}`,
    name,
    category,
    carry,
    weightLb: finiteNumber(input.weightLb, 0, 999, 0),
    source: "found",
    unique: true,
  };
  const note = cleanString(input.note, 1000);
  if (note) item.note = note;
  if (category === "Armor") {
    const armorCategory = cleanString(input.armorCategory, 30);
    if (!(armorCategory === "Main Armor" || armorCategory === "Add-on Armor")) {
      throw new HttpsError("invalid-argument", "Choose a valid armor type.");
    }
    item.armorCategory = armorCategory;
    item.acValue = Math.floor(finiteNumber(input.acValue, 0, 30, armorCategory === "Main Armor" ? 10 : 0));
  }
  if (category === "Weapon") {
    const attackBonus = cleanString(input.attackBonus, 80);
    const damage = cleanString(input.damage, 120);
    const weaponNotes = cleanString(input.weaponNotes || input.note, 1000);
    if (attackBonus) item.attackBonus = attackBonus;
    if (damage) item.damage = damage;
    if (weaponNotes) item.weaponNotes = weaponNotes;
  }
  return item;
}

export const createStandaloneGameSession = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const title = cleanString(request.data?.title, 80);
  const dmName = cleanString(request.data?.dmName, 100) || "DM";
  const hunterIds = cleanStringList(request.data?.hunterIds);
  if (!title) throw new HttpsError("invalid-argument", "A session name is required.");

  const db = getFirestore();
  const gameRef = db.collection("games").doc();
  await db.runTransaction(async (tx) => {
    const hunterRefs = hunterIds.map((id) => db.doc(`characters/${id}`));
    const hunterSnapshots = await Promise.all(hunterRefs.map((ref) => tx.get(ref)));
    const participants = new Map<string, ParticipantSnapshot>();
    for (const snapshot of hunterSnapshots) {
      if (!snapshot.exists) throw new HttpsError("not-found", "One of the selected Hunters no longer exists.");
      const participant = participantFrom(snapshot.id, snapshot.data()!);
      if (!participant.uid) throw new HttpsError("failed-precondition", "A selected Hunter has no owner.");
      if (participant.uid === uid) {
        throw new HttpsError("failed-precondition", "The session creator cannot also join as a player.");
      }
      participants.set(participant.uid, participant);
    }

    const roster = [...participants.values()];
    const uids = [uid, ...roster.map((participant) => participant.uid)];
    const labels = new Map<string, string>([[uid, "You"], ...roster.map((participant) => [participant.uid, participant.playerName] as const)]);
    const refs = seatRefs(db, uids);
    await assertSeatsAvailable(tx, refs, gameRef.id, labels);

    tx.create(gameRef, {
      campaignId: null,
      sessionId: null,
      title,
      dmUid: uid,
      dmName,
      participantUids: roster.map((participant) => participant.uid),
      participantRoster: roster,
      attendeeRoster: roster,
      seatUids: uids,
      status: "lobby",
      phase: "exploration",
      location: "wild",
      combat: {
        active: false,
        round: 0,
        turnId: null,
        designatedWardenId: null,
        timerPhase: "idle",
        timerEndsAt: null,
        pausedRemainingMs: null,
      },
      sandbox: false,
      clockRunning: false,
      clockStartedAt: null,
      clockElapsedMs: 0,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      endedAt: null,
      endedPhase: null,
      endedLocation: null,
    });
    refs.forEach((ref, index) => tx.create(ref, {
      uid: ref.id,
      gameId: gameRef.id,
      role: index === 0 ? "dm" : "player",
      reservedAt: FieldValue.serverTimestamp(),
    }));
  });
  return { gameId: gameRef.id };
});

export const addStandaloneGameParticipant = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const gameId = cleanString(request.data?.gameId, 120);
  const characterId = cleanString(request.data?.characterId, 120);
  if (!gameId || !characterId) throw new HttpsError("invalid-argument", "gameId and characterId are required.");

  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const gameRef = db.doc(`games/${gameId}`);
    const characterRef = db.doc(`characters/${characterId}`);
    const [gameSnapshot, characterSnapshot] = await Promise.all([tx.get(gameRef), tx.get(characterRef)]);
    if (!gameSnapshot.exists) throw new HttpsError("not-found", "Session not found.");
    if (!characterSnapshot.exists) throw new HttpsError("not-found", "Hunter not found.");
    const game = gameSnapshot.data()!;
    if (game.campaignId != null) throw new HttpsError("failed-precondition", "This is not a standalone session.");
    if (game.dmUid !== uid) throw new HttpsError("permission-denied", "Only the session creator can add players.");
    if (game.status === "ended") throw new HttpsError("failed-precondition", "This session has ended.");
    if (game.combat?.active === true) throw new HttpsError("failed-precondition", "End the current battle before changing players.");

    const participant = participantFrom(characterSnapshot.id, characterSnapshot.data()!);
    if (!participant.uid || participant.uid === uid) {
      throw new HttpsError("failed-precondition", "The session creator cannot also join as a player.");
    }
    const seatRef = db.doc(`activeGameSeats/${participant.uid}`);
    await assertSeatsAvailable(tx, [seatRef], gameId, new Map([[participant.uid, participant.playerName]]));

    const current = Array.isArray(game.participantRoster) ? game.participantRoster as ParticipantSnapshot[] : [];
    const roster = [...current.filter((item) => item.uid !== participant.uid), participant];
    const seats = cleanStringList([...(Array.isArray(game.seatUids) ? game.seatUids : [uid]), participant.uid]);
    tx.update(gameRef, {
      participantUids: roster.map((item) => item.uid),
      participantRoster: roster,
      attendeeRoster: attendeeRoster(game, roster),
      seatUids: seats,
    });
    tx.set(seatRef, {
      uid: participant.uid,
      gameId,
      role: "player",
      reservedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

export const removeStandaloneGameParticipant = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const gameId = cleanString(request.data?.gameId, 120);
  const participantUid = cleanString(request.data?.uid, 128);
  if (!gameId || !participantUid) throw new HttpsError("invalid-argument", "gameId and uid are required.");

  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const gameRef = db.doc(`games/${gameId}`);
    const gameSnapshot = await tx.get(gameRef);
    if (!gameSnapshot.exists) throw new HttpsError("not-found", "Session not found.");
    const game = gameSnapshot.data()!;
    if (game.campaignId != null) throw new HttpsError("failed-precondition", "This is not a standalone session.");
    if (game.dmUid !== uid) throw new HttpsError("permission-denied", "Only the session creator can remove players.");
    if (game.status === "ended") throw new HttpsError("failed-precondition", "This session has ended.");
    if (game.combat?.active === true) throw new HttpsError("failed-precondition", "End the current battle before changing players.");
    if (participantUid === uid) throw new HttpsError("failed-precondition", "The session creator is not a player seat.");

    const seatRef = db.doc(`activeGameSeats/${participantUid}`);
    const seatSnapshot = await tx.get(seatRef);
    const current = Array.isArray(game.participantRoster) ? game.participantRoster as ParticipantSnapshot[] : [];
    const roster = current.filter((item) => item.uid !== participantUid);
    tx.update(gameRef, {
      participantUids: roster.map((item) => item.uid),
      participantRoster: roster,
      seatUids: activeSeatUids(game).filter((seatUid) => seatUid !== participantUid),
    });
    if (seatSnapshot.exists && seatSnapshot.data()?.gameId === gameId) tx.delete(seatRef);
  });
  return { ok: true };
});

export const createStandaloneGameLoot = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const gameId = cleanString(request.data?.gameId, 120);
  if (!gameId) throw new HttpsError("invalid-argument", "gameId is required.");
  const db = getFirestore();
  const gameRef = db.doc(`games/${gameId}`);
  const lootRef = gameRef.collection("loot").doc();
  const item = sessionItem(request.data?.item, lootRef.id);
  await db.runTransaction(async (tx) => {
    const gameSnapshot = await tx.get(gameRef);
    if (!gameSnapshot.exists) throw new HttpsError("not-found", "Session not found.");
    const game = gameSnapshot.data()!;
    if (game.campaignId != null) throw new HttpsError("failed-precondition", "Session items are available in standalone games.");
    if (game.dmUid !== uid) throw new HttpsError("permission-denied", "Only the session DM can create items.");
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Start the session before creating loot.");
    tx.create(lootRef, {
      item,
      status: "available",
      createdAt: FieldValue.serverTimestamp(),
      claimedAt: null,
      claimedByUid: null,
      claimedByCharacterId: null,
      claimedByName: null,
    });
  });
  return { lootId: lootRef.id };
});

export const claimStandaloneGameLoot = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const gameId = cleanString(request.data?.gameId, 120);
  const lootId = cleanString(request.data?.lootId, 120);
  const characterId = cleanString(request.data?.characterId, 120);
  if (!gameId || !lootId || !characterId) throw new HttpsError("invalid-argument", "gameId, lootId, and characterId are required.");

  const db = getFirestore();
  const gameRef = db.doc(`games/${gameId}`);
  const lootRef = db.doc(`games/${gameId}/loot/${lootId}`);
  const characterRef = db.doc(`characters/${characterId}`);
  await db.runTransaction(async (tx) => {
    const [gameSnapshot, lootSnapshot, characterSnapshot] = await Promise.all([
      tx.get(gameRef), tx.get(lootRef), tx.get(characterRef),
    ]);
    if (!gameSnapshot.exists || !lootSnapshot.exists) throw new HttpsError("not-found", "That item is no longer available.");
    if (!characterSnapshot.exists) throw new HttpsError("not-found", "Your Hunter no longer exists.");
    const game = gameSnapshot.data()!;
    const loot = lootSnapshot.data()!;
    const character = characterSnapshot.data()!;
    if (game.campaignId != null) throw new HttpsError("failed-precondition", "Session items are available in standalone games.");
    if (game.status !== "active") throw new HttpsError("failed-precondition", "Items can only be taken during an active session.");
    if (!Array.isArray(game.participantUids) || !game.participantUids.includes(uid)) {
      throw new HttpsError("permission-denied", "You are not a player in this session.");
    }
    const roster = Array.isArray(game.participantRoster) ? game.participantRoster as ParticipantSnapshot[] : [];
    if (!roster.some((participant) => participant.uid === uid && participant.characterId === characterId)) {
      throw new HttpsError("permission-denied", "That Hunter is not your active session character.");
    }
    if (character.ownerUid !== uid) throw new HttpsError("permission-denied", "You do not own that Hunter.");
    if (loot.status !== "available") throw new HttpsError("already-exists", "Another Hunter already took that item.");
    const item = loot.item && typeof loot.item === "object" ? loot.item as DocumentData : null;
    if (!item?.id || !item?.name) throw new HttpsError("data-loss", "The item definition is incomplete.");

    const customItems = Array.isArray(character.customItems) ? character.customItems as DocumentData[] : [];
    const nextCustomItems = [...customItems.filter((entry) => entry.id !== item.id), item];
    const patch: DocumentData = { customItems: nextCustomItems };
    if (item.category !== "Armor") {
      const inventory = Array.isArray(character.inventory) ? character.inventory as DocumentData[] : [];
      const quantities = new Map<string, number>();
      inventory.forEach((entry) => quantities.set(String(entry.itemId), Math.max(0, Number(entry.qty) || 0)));
      quantities.set(String(item.id), (quantities.get(String(item.id)) ?? 0) + 1);
      patch.inventory = [...quantities].filter(([, qty]) => qty > 0).map(([itemId, qty]) => ({ itemId, qty }));
    }
    tx.update(characterRef, patch);
    tx.update(lootRef, {
      status: "claimed",
      claimedAt: FieldValue.serverTimestamp(),
      claimedByUid: uid,
      claimedByCharacterId: characterId,
      claimedByName: cleanString(character.name, 100) || "Hunter",
    });
  });
  return { ok: true };
});

export const finishStandaloneGameSession = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const gameId = cleanString(request.data?.gameId, 120);
  const endedPhase = cleanString(request.data?.endedPhase, 30);
  const endedLocation = cleanString(request.data?.endedLocation, 30);
  if (!gameId) throw new HttpsError("invalid-argument", "gameId is required.");
  if (!PHASES.has(endedPhase)) throw new HttpsError("invalid-argument", "Invalid game phase.");
  if (!LOCATIONS.has(endedLocation)) throw new HttpsError("invalid-argument", "Invalid game location.");

  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const gameRef = db.doc(`games/${gameId}`);
    const gameSnapshot = await tx.get(gameRef);
    if (!gameSnapshot.exists) throw new HttpsError("not-found", "Session not found.");
    const game = gameSnapshot.data()!;
    if (game.campaignId != null) throw new HttpsError("failed-precondition", "This is not a standalone session.");
    if (game.dmUid !== uid) throw new HttpsError("permission-denied", "Only the session creator can end it.");
    if (game.status === "ended") return;
    if (game.status !== "active") {
      throw new HttpsError("failed-precondition", "An unstarted session should be discarded instead.");
    }

    const uids = activeSeatUids(game);
    const refs = seatRefs(db, uids);
    await releaseSeats(tx, refs, gameId);
    const elapsed = Math.max(0, Number(game.clockElapsedMs) || 0)
      + (game.clockRunning && game.clockStartedAt ? Math.max(0, Date.now() - millis(game.clockStartedAt)) : 0);
    const combat = game.combat && typeof game.combat === "object" ? game.combat as DocumentData : {};
    tx.update(gameRef, {
      status: "ended",
      endedAt: FieldValue.serverTimestamp(),
      endedPhase,
      endedLocation,
      clockRunning: false,
      clockStartedAt: null,
      clockElapsedMs: elapsed,
      combat: {
        ...combat,
        active: false,
        timerPhase: "idle",
        timerEndsAt: null,
        pausedRemainingMs: null,
      },
      historySavedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});

export const discardStandaloneGameSession = onCall(CALLABLE_OPTIONS, async (request) => {
  const uid = requireUid(request);
  const gameId = cleanString(request.data?.gameId, 120);
  if (!gameId) throw new HttpsError("invalid-argument", "gameId is required.");

  const db = getFirestore();
  const gameRef = db.doc(`games/${gameId}`);
  await db.runTransaction(async (tx) => {
    const gameSnapshot = await tx.get(gameRef);
    if (!gameSnapshot.exists) return;
    const game = gameSnapshot.data()!;
    if (game.campaignId != null) throw new HttpsError("failed-precondition", "This is not a standalone session.");
    if (game.dmUid !== uid) throw new HttpsError("permission-denied", "Only the session creator can discard it.");
    if (game.status !== "lobby" || game.startedAt) {
      throw new HttpsError("failed-precondition", "A started session must be ended and kept in history.");
    }
    const refs = seatRefs(db, activeSeatUids(game));
    await releaseSeats(tx, refs, gameId);
    tx.delete(gameRef);
  });
  try {
    await db.recursiveDelete(gameRef);
  } catch (error) {
    logger.warn("Session parent was discarded but child cleanup failed", { gameId, error: String(error) });
  }
  return { ok: true };
});
