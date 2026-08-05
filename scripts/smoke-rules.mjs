// Real-auth smoke test for the open-access / per-campaign Firestore rules.
// Signs in as a DM and a player with custom tokens and exercises the core rule
// paths against LIVE Firestore, asserting legitimate ops succeed.
//
//   doppler run -- bun run scripts/smoke-rules.mjs
//
// Needs AGENT_TEST_SA (to mint tokens) + VITE_FIREBASE_* (web config) in env.
import { initializeApp as adminInit, cert } from "firebase-admin/app";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { getFirestore as adminGetFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import {
  connectFirestoreEmulator, getFirestore, doc, setDoc, addDoc, updateDoc, getDoc, getDocs,
  collection, query, where, arrayUnion, serverTimestamp,
} from "firebase/firestore";

const sa = process.env.AGENT_TEST_SA;
if (!sa) throw new Error("Missing AGENT_TEST_SA (run via doppler).");
const useEmulators = process.env.USE_FIREBASE_EMULATORS === "1";
const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
if (!cfg.apiKey) throw new Error("Missing VITE_FIREBASE_* web config.");

const admin = adminInit({ credential: cert(JSON.parse(sa)) });
const aauth = adminAuth(admin);
if (useEmulators) {
  await Promise.all([
    aauth.createUser({ uid: "agent-dm", email: "agent-dm@dandd-ea955.web.app", emailVerified: true }),
    aauth.createUser({ uid: "agent-dm-2", email: "agent-dm-2@dandd-ea955.web.app", emailVerified: true }),
    aauth.createUser({ uid: "agent-player", email: "agent-player@dandd-ea955.web.app", emailVerified: true }),
  ]);
}
const dmTok = await aauth.createCustomToken("agent-dm");
const dm2Tok = await aauth.createCustomToken("agent-dm-2");
const plTok = await aauth.createCustomToken("agent-player");

function client(name) {
  const app = initializeApp(cfg, name);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "europe-west1");
  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  }
  return { auth, db, functions };
}
const dm = client("dm");
const dm2 = client("dm2");
const pl = client("pl");
await signInWithCustomToken(dm.auth, dmTok);
await signInWithCustomToken(dm2.auth, dm2Tok);
await signInWithCustomToken(pl.auth, plTok);
const dmUid = dm.auth.currentUser.uid;
const dm2Uid = dm2.auth.currentUser.uid;
const plUid = pl.auth.currentUser.uid;
const plCharId = `smoke-${plUid}`;
const createStandalone = httpsCallable(dm.functions, "createStandaloneGameSession");
const createStandaloneAsPlayer = httpsCallable(pl.functions, "createStandaloneGameSession");
const createStandaloneAsSecondDm = httpsCallable(dm2.functions, "createStandaloneGameSession");
const addStandaloneParticipant = httpsCallable(dm.functions, "addStandaloneGameParticipant");
const addStandaloneParticipantAsSecondDm = httpsCallable(dm2.functions, "addStandaloneGameParticipant");
const removeStandaloneParticipant = httpsCallable(dm.functions, "removeStandaloneGameParticipant");
const createStandaloneLoot = httpsCallable(dm.functions, "createStandaloneGameLoot");
const claimStandaloneLoot = httpsCallable(pl.functions, "claimStandaloneGameLoot");
const finishStandalone = httpsCallable(dm.functions, "finishStandaloneGameSession");
const discardStandalone = httpsCallable(dm.functions, "discardStandaloneGameSession");
const discardStandaloneAsSecondDm = httpsCallable(dm2.functions, "discardStandaloneGameSession");
const adb = adminGetFirestore(admin);

const results = [];
async function step(label, fn) {
  try { await fn(); results.push(`ok   ${label}`); }
  catch (e) { results.push(`FAIL ${label} — ${e.code || e.message}`); }
}

let campaignId, code = `SMOKE${Math.floor(Math.random() * 9000 + 1000)}`;
let gameId, standaloneGameId, standaloneMonsterId;

await step("DM creates campaign", async () => {
  const ref = await addDoc(collection(dm.db, "campaigns"), {
    name: "Smoke Test", dmUid, dmName: "Agent DM", inviteCode: code,
    memberUids: [dmUid], createdAt: serverTimestamp(),
  });
  campaignId = ref.id;
  await setDoc(doc(dm.db, "campaigns", campaignId, "members", dmUid), {
    uid: dmUid, name: "Agent DM", email: "dm@x", role: "dm", characterId: null, joinedAt: serverTimestamp(),
  });
});
await step("DM creates own character", async () => {
  await setDoc(doc(dm.db, "characters", `smoke-${dmUid}`), {
    id: `smoke-${dmUid}`, ownerUid: dmUid, ownerEmail: "dm@x", ownerName: "Agent DM",
    name: "DM Hunter", classId: "brute", background: "", level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: [], mainArmorId: null, campaignId, notes: "", createdAt: Date.now(), updatedAt: Date.now(),
  });
});
await step("Player finds campaign by code", async () => {
  const snap = await getDocs(query(collection(pl.db, "campaigns"), where("inviteCode", "==", code)));
  if (snap.empty) throw new Error("code-not-found");
});
await step("Player joins (memberUids + member doc)", async () => {
  await updateDoc(doc(pl.db, "campaigns", campaignId), { memberUids: arrayUnion(plUid) });
  await setDoc(doc(pl.db, "campaigns", campaignId, "members", plUid), {
    uid: plUid, name: "Agent Player", email: "p@x", role: "player", characterId: null, joinedAt: serverTimestamp(),
  });
});
await step("Player creates own character (with Transformation)", async () => {
  await setDoc(doc(pl.db, "characters", plCharId), {
    id: plCharId, ownerUid: plUid, ownerEmail: "p@x", ownerName: "Agent Player",
    name: "Player Hunter", classId: "stalker", background: "", level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: [], mainArmorId: null, campaignId, notes: "",
    transformationLevel: 2, activeTransformations: ["mutatedArm"],
    createdAt: Date.now(), updatedAt: Date.now(),
  });
});
await step("Legacy campaign game fixture is seeded", async () => {
  const ref = adb.collection("games").doc();
  await ref.set({
    campaignId, sessionId: null, title: "Smoke Game", dmUid, dmName: "Agent DM",
    participantUids: [], status: "lobby", phase: "exploration", sandbox: false, createdAt: Date.now(),
  });
  gameId = ref.id;
});
await step("Player reads the game (member)", async () => {
  const snap = await getDocs(query(collection(pl.db, "games"), where("campaignId", "==", campaignId)));
  if (snap.empty) throw new Error("game-not-readable");
});
await step("Player joins lobby (participant doc)", async () => {
  await setDoc(doc(pl.db, "games", gameId, "participants", plUid), {
    uid: plUid, name: "Agent Player", classId: "scout", level: 1, role: "player", joinedAt: serverTimestamp(), lastSeen: serverTimestamp(),
  });
});
await step("DM lists participants (subscription path)", async () => {
  const g = await getDoc(doc(dm.db, "games", gameId));
  if (g.data().campaignId !== campaignId) throw new Error(`game.campaignId=${g.data().campaignId}`);
  const snap = await getDocs(collection(dm.db, "games", gameId, "participants"));
  if (snap.empty) throw new Error("no participants visible");
});
await step("Outsider is blocked (negative)", async () => {
  // The player should NOT be able to read a different (nonexistent) campaign's
  // game; and a non-member read of a foreign campaign should fail. We assert the
  // member read above worked; here we confirm a write the player shouldn't do.
  let denied = false;
  try {
    await updateDoc(doc(pl.db, "games", gameId), { status: "active" }); // only DM may
  } catch { denied = true; }
  if (!denied) throw new Error("player could update the game (should be DM-only)");
});

// --- Standalone session invitations (the /game page) ---
await step("Client cannot bypass the session transaction (negative)", async () => {
  let denied = false;
  try {
    await setDoc(doc(collection(dm.db, "games")), {
      campaignId: null, title: "Bypass", dmUid, participantUids: [], participantRoster: [], status: "lobby",
    });
  } catch { denied = true; }
  if (!denied) throw new Error("client created a game without reserving active seats");
});
await step("DM creates standalone session and invitation", async () => {
  const result = await createStandalone({
    title: "Standalone Smoke", dmName: "Agent DM", hunterIds: [plCharId],
  });
  standaloneGameId = result.data.gameId;
});
await step("Invited player discovers standalone session", async () => {
  const snap = await getDocs(query(collection(pl.db, "games"), where("participantUids", "array-contains", plUid)));
  const session = snap.docs.find((item) => item.id === standaloneGameId);
  if (!session) throw new Error("standalone-session-not-visible");
  if (session.data().participantRoster?.[0]?.name !== "Player Hunter") throw new Error("standalone-roster-not-visible");
  if (session.data().combat?.round !== 0) throw new Error("new-session-looks-like-a-resumable-battle");
});
await step("DM publishes a sanitized enemy and private stats stay private", async () => {
  const monster = doc(collection(dm.db, "games", standaloneGameId, "combatants"));
  await setDoc(monster, {
    kind: "monster", name: "Standalone Beast", characterId: null, initiative: 14,
    ac: 12, maxHp: 20, currentHp: 15, conditions: [], note: "Secret attack", revealHp: false, revealStats: false, createdAt: serverTimestamp(),
  });
  await setDoc(doc(dm.db, "games", standaloneGameId, "battleView", monster.id), {
    kind: "monster", name: "Standalone Beast", characterId: null, initiative: 14,
    ac: null, maxHp: null, currentHp: null, conditions: [], note: null, revealHp: false, revealStats: false, createdAt: serverTimestamp(),
  });
  standaloneMonsterId = monster.id;
  let privateDenied = false;
  try { await getDoc(doc(pl.db, "games", standaloneGameId, "combatants", monster.id)); }
  catch { privateDenied = true; }
  if (!privateDenied) throw new Error("player-read-private-monster-stats");
  const snap = await getDoc(doc(pl.db, "games", standaloneGameId, "battleView", monster.id));
  if (!snap.exists() || snap.data().maxHp !== null || snap.data().ac !== null || snap.data().note !== null) throw new Error("battle-projection-leaked-stats");
});
await step("Invited player cannot control standalone session (negative)", async () => {
  let denied = false;
  try { await updateDoc(doc(pl.db, "games", standaloneGameId), { clockRunning: true }); }
  catch { denied = true; }
  if (!denied) throw new Error("invited player could control the session");
});
await step("DM and invited player cannot open second sessions (negative)", async () => {
  for (const create of [createStandalone, createStandaloneAsPlayer]) {
    let denied = false;
    try { await create({ title: "Second Session", dmName: "Busy", hunterIds: [] }); }
    catch { denied = true; }
    if (!denied) throw new Error("busy user created a second active session");
  }
});
await step("Another DM cannot invite a player who is already in session (negative)", async () => {
  const created = await createStandaloneAsSecondDm({ title: "Other Table", dmName: "Agent DM 2", hunterIds: [] });
  const otherGameId = created.data.gameId;
  let denied = false;
  try { await addStandaloneParticipantAsSecondDm({ gameId: otherGameId, characterId: plCharId }); }
  catch { denied = true; }
  await discardStandaloneAsSecondDm({ gameId: otherGameId });
  if (!denied) throw new Error("busy player was invited to another DM's active session");
});
await step("Session creator cannot add themselves as a player (negative)", async () => {
  let denied = false;
  try { await addStandaloneParticipant({ gameId: standaloneGameId, characterId: `smoke-${dmUid}` }); }
  catch { denied = true; }
  if (!denied) throw new Error("session creator could add themselves as a player");
});
await step("DM starts the standalone session", async () => {
  await updateDoc(doc(dm.db, "games", standaloneGameId), {
    status: "active", startedAt: serverTimestamp(), clockRunning: true, clockStartedAt: Date.now(),
    combat: {
      active: false, round: 1, turnId: null, designatedWardenId: null,
      timerPhase: "idle", timerEndsAt: null, pausedRemainingMs: null,
    },
  });
});
await step("DM manages players during active exploration and attendance is retained", async () => {
  await removeStandaloneParticipant({ gameId: standaloneGameId, uid: plUid });
  await addStandaloneParticipant({ gameId: standaloneGameId, characterId: plCharId });
  const game = await getDoc(doc(dm.db, "games", standaloneGameId));
  if (!game.data()?.attendeeRoster?.some((entry) => entry.uid === plUid)) throw new Error("attendance-was-lost");
});
await step("DM creates a unique item and the invited Hunter claims it once", async () => {
  const created = await createStandaloneLoot({ gameId: standaloneGameId, item: {
    name: "Smoke Blade", category: "Weapon", carry: "Significant", weightLb: 3,
    attackBonus: "+1", damage: "1d8", note: "Emulator treasure",
  } });
  await claimStandaloneLoot({ gameId: standaloneGameId, lootId: created.data.lootId, characterId: plCharId });
  const [loot, hunter] = await Promise.all([
    getDoc(doc(pl.db, "games", standaloneGameId, "loot", created.data.lootId)),
    getDoc(doc(pl.db, "characters", plCharId)),
  ]);
  if (loot.data()?.status !== "claimed") throw new Error("loot-was-not-claimed");
  if (!hunter.data()?.customItems?.some((item) => item.name === "Smoke Blade")) throw new Error("custom-item-not-added");
  if (!hunter.data()?.inventory?.some((item) => item.itemId === loot.data()?.item?.id)) throw new Error("claimed-item-not-in-inventory");
  let duplicateDenied = false;
  try { await claimStandaloneLoot({ gameId: standaloneGameId, lootId: created.data.lootId, characterId: plCharId }); }
  catch { duplicateDenied = true; }
  if (!duplicateDenied) throw new Error("loot-was-claimed-twice");
});
await step("A fought enemy cannot be removed from future history (negative)", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await updateDoc(doc(dm.db, "games", standaloneGameId), { combat: {
    active: true, round: 1, turnId: standaloneMonsterId, designatedWardenId: null,
    timerPhase: "untimed", timerEndsAt: null, pausedRemainingMs: null,
  } });
  let denied = false;
  try { await deleteDoc(doc(dm.db, "games", standaloneGameId, "combatants", standaloneMonsterId)); }
  catch { denied = true; }
  if (!denied) throw new Error("active-session enemy could be removed from history");
});
await step("Ending saves history, preserves enemies, and releases every seat", async () => {
  await finishStandalone({ gameId: standaloneGameId, endedPhase: "combat", endedLocation: "wild" });
  const game = await getDoc(doc(pl.db, "games", standaloneGameId));
  if (game.data()?.status !== "ended" || !game.data()?.historySavedAt) throw new Error("history-not-saved");
  if (game.data()?.combat?.active !== false || game.data()?.combat?.timerPhase !== "idle") {
    throw new Error("ended history kept a live combat timer");
  }
  const enemy = await getDoc(doc(pl.db, "games", standaloneGameId, "battleView", standaloneMonsterId));
  if (!enemy.exists()) throw new Error("history-enemy-missing");
  const [dmSeat, playerSeat] = await Promise.all([
    getDoc(doc(dm.db, "activeGameSeats", dmUid)),
    getDoc(doc(dm.db, "activeGameSeats", plUid)),
  ]);
  if (dmSeat.exists() || playerSeat.exists()) throw new Error("active seats were not released");
});
await step("Ended history is read-only (negative)", async () => {
  let enemyDenied = false;
  try { await updateDoc(doc(dm.db, "games", standaloneGameId, "combatants", standaloneMonsterId), { currentHp: 1 }); }
  catch { enemyDenied = true; }
  if (!enemyDenied) throw new Error("ended session enemy remained editable");

  let gameDenied = false;
  try { await updateDoc(doc(dm.db, "games", standaloneGameId), { title: "Rewritten history" }); }
  catch { gameDenied = true; }
  if (!gameDenied) throw new Error("ended session metadata remained editable");
});
await step("A new lobby can be created after finish and discarded without history", async () => {
  const created = await createStandalone({ title: "Discard Smoke", dmName: "Agent DM", hunterIds: [plCharId] });
  const discardedId = created.data.gameId;
  await discardStandalone({ gameId: discardedId });
  const discarded = await adb.doc(`games/${discardedId}`).get();
  if (discarded.exists) throw new Error("discarded lobby still exists");
});

// --- Combat tracker: private rows are DM-only; members consume battleView. ---
let monsterId, pcRowId;
await step("DM adds combatants (monster + pc)", async () => {
  const m = await addDoc(collection(dm.db, "games", gameId, "combatants"), {
    kind: "monster", name: "Smoke Beast", characterId: null, initiative: 12,
    ac: 10, maxHp: 10, currentHp: 10, conditions: [], conditionSince: {},
    note: null, createdAt: serverTimestamp(),
  });
  monsterId = m.id;
  await setDoc(doc(dm.db, "games", gameId, "battleView", m.id), {
    kind: "monster", name: "Smoke Beast", characterId: null, initiative: 12,
    ac: null, maxHp: null, currentHp: null, conditions: [], conditionSince: {},
    note: null, revealHp: false, revealStats: false, createdAt: serverTimestamp(),
  });
  const p = await addDoc(collection(dm.db, "games", gameId, "combatants"), {
    kind: "pc", name: "Smoke Hunter", characterId: `smoke-${dmUid}`, initiative: 15,
    ac: null, maxHp: null, currentHp: null, conditions: [], conditionSince: {},
    note: null, createdAt: serverTimestamp(),
  });
  pcRowId = p.id;
  await setDoc(doc(dm.db, "games", gameId, "battleView", p.id), {
    kind: "pc", name: "Smoke Hunter", characterId: `smoke-${dmUid}`, initiative: 15,
    ac: null, maxHp: null, currentHp: null, conditions: [], conditionSince: {},
    note: null, createdAt: serverTimestamp(),
  });
});
await step("Player reads sanitized battle row but cannot read private combatant", async () => {
  const visible = await getDoc(doc(pl.db, "games", gameId, "battleView", monsterId));
  if (!visible.exists() || visible.data().maxHp !== null) throw new Error("sanitized-row-missing");
  let denied = false;
  try { await getDoc(doc(pl.db, "games", gameId, "combatants", monsterId)); }
  catch { denied = true; }
  if (!denied) throw new Error("private-row-readable");
});
await step("Player cannot edit a PC combatant (negative)", async () => {
  let denied = false;
  try {
    await updateDoc(doc(pl.db, "games", gameId, "combatants", pcRowId), { initiative: 1 });
  } catch { denied = true; }
  if (!denied) throw new Error("player could edit a PC combatant (should be DM-only)");
});
await step("Player cannot turn a monster into a pc (negative)", async () => {
  let denied = false;
  try {
    await updateDoc(doc(pl.db, "games", gameId, "combatants", monsterId), { kind: "pc" });
  } catch { denied = true; }
  if (!denied) throw new Error("player could rewrite a monster's kind");
});
await step("Player cannot heal/buff/rewrite a monster (negative)", async () => {
  for (const bad of [{ initiative: 20 }, { note: "hax" }, { currentHp: 10, maxHp: 99 }]) {
    let denied = false;
    try {
      await updateDoc(doc(pl.db, "games", gameId, "combatants", monsterId), bad);
    } catch { denied = true; }
    if (!denied) throw new Error(`player could write ${JSON.stringify(bad)} on a monster (currentHp-only allowed)`);
  }
});
await step("Player cannot remove the monster from battle (negative)", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  let denied = false;
  try { await deleteDoc(doc(pl.db, "games", gameId, "combatants", monsterId)); }
  catch { denied = true; }
  if (!denied) throw new Error("player deleted private monster");
});

// --- Transformation: DM-recorded; owners may only REDUCE the level / CLEAR the
// list (rests). The NEGATIVE cases assert the owner-write constraints in the
// DEPLOYED rules — live since the Transformation feature merged — so they
// always run.
await step("Player cannot raise own Transformation Level (negative)", async () => {
  let denied = false;
  try {
    await updateDoc(doc(pl.db, "characters", plCharId), { transformationLevel: 3 });
  } catch { denied = true; }
  if (!denied) throw new Error("player could raise their own transformationLevel (DM-only)");
});
await step("Player cannot add a Transformation result (negative)", async () => {
  let denied = false;
  try {
    await updateDoc(doc(pl.db, "characters", plCharId), { activeTransformations: ["mutatedArm", "bloodFangs"] });
  } catch { denied = true; }
  if (!denied) throw new Error("player could add to activeTransformations (DM-only)");
});
await step("Player rest-reduces own Transformation (allowed)", async () => {
  await updateDoc(doc(pl.db, "characters", plCharId), { transformationLevel: 1, activeTransformations: [] });
});
await step("DM records Transformation on the player's card (allowed)", async () => {
  await updateDoc(doc(dm.db, "characters", plCharId), {
    transformationLevel: 4, activeTransformations: ["mutatedArm", "lost"],
  });
});
await step("Player full-card save with unchanged Transformation (allowed)", async () => {
  // Mirrors playerStore.save: a full-card setDoc-merge where the transformation
  // fields carry the SAME values must stay writable for the owner.
  await setDoc(doc(pl.db, "characters", plCharId), {
    notes: "smoke full save", transformationLevel: 4, activeTransformations: ["mutatedArm", "lost"],
    updatedAt: Date.now(),
  }, { merge: true });
});

// Regression: a signed-in client can still read /characters (open-access read).
await step("Client can still read /characters (regression)", async () => {
  await getDoc(doc(pl.db, "characters", `smoke-${dmUid}`));
});

// Cleanup (admin bypass, best-effort).
async function del(path) { try { await adb.doc(path).delete(); } catch { /* best-effort */ } }
await step("cleanup", async () => {
  if (gameId) {
    await del(`games/${gameId}/participants/${plUid}`);
    if (monsterId) await del(`games/${gameId}/combatants/${monsterId}`);
    if (monsterId) await del(`games/${gameId}/battleView/${monsterId}`);
    if (pcRowId) await del(`games/${gameId}/combatants/${pcRowId}`);
    if (pcRowId) await del(`games/${gameId}/battleView/${pcRowId}`);
    await del(`games/${gameId}`);
  }
  if (standaloneGameId) {
    await del(`games/${standaloneGameId}/participants/${plUid}`);
    if (standaloneMonsterId) await del(`games/${standaloneGameId}/combatants/${standaloneMonsterId}`);
    if (standaloneMonsterId) await del(`games/${standaloneGameId}/battleView/${standaloneMonsterId}`);
    await del(`games/${standaloneGameId}`);
  }
  if (campaignId) {
    await del(`campaigns/${campaignId}/members/${dmUid}`);
    await del(`campaigns/${campaignId}/members/${plUid}`);
    await del(`campaigns/${campaignId}`);
  }
  await del(`characters/smoke-${dmUid}`);
  await del(`characters/smoke-${plUid}`);
  await del(`activeGameSeats/${dmUid}`);
  await del(`activeGameSeats/${dm2Uid}`);
  await del(`activeGameSeats/${plUid}`);
});

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL"));
console.log(`\n${failed.length ? "❌ " + failed.length + " FAILED" : "✅ all rule paths OK"}`);
process.exit(failed.length ? 1 : 0);
