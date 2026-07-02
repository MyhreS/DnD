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
import { getAuth, signInWithCustomToken } from "firebase/auth";
import {
  getFirestore, doc, setDoc, addDoc, updateDoc, getDoc, getDocs,
  collection, query, where, arrayUnion, serverTimestamp,
} from "firebase/firestore";

const sa = process.env.AGENT_TEST_SA;
if (!sa) throw new Error("Missing AGENT_TEST_SA (run via doppler).");
const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
if (!cfg.apiKey) throw new Error("Missing VITE_FIREBASE_* web config.");

const admin = adminInit({ credential: cert(JSON.parse(sa)) });
const aauth = adminAuth(admin);
const dmTok = await aauth.createCustomToken("agent-dm");
const plTok = await aauth.createCustomToken("agent-player");

function client(name) {
  const app = initializeApp(cfg, name);
  return { auth: getAuth(app), db: getFirestore(app) };
}
const dm = client("dm");
const pl = client("pl");
await signInWithCustomToken(dm.auth, dmTok);
await signInWithCustomToken(pl.auth, plTok);
const dmUid = dm.auth.currentUser.uid;
const plUid = pl.auth.currentUser.uid;

const results = [];
async function step(label, fn) {
  try { await fn(); results.push(`ok   ${label}`); }
  catch (e) { results.push(`FAIL ${label} — ${e.code || e.message}`); }
}

let campaignId, code = `SMOKE${Math.floor(Math.random() * 9000 + 1000)}`;
let gameId;

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
await step("DM starts a game", async () => {
  const ref = await addDoc(collection(dm.db, "games"), {
    campaignId, sessionId: null, title: "Smoke Game", dmUid, dmName: "Agent DM",
    status: "lobby", phase: "exploration", sandbox: false, createdAt: serverTimestamp(),
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

// --- Combat tracker: DM owns rows; members may kill/remove MONSTERS only ---
let monsterId, pcRowId;
await step("DM adds combatants (monster + pc)", async () => {
  const m = await addDoc(collection(dm.db, "games", gameId, "combatants"), {
    kind: "monster", name: "Smoke Beast", characterId: null, initiative: 12,
    ac: 10, maxHp: 10, currentHp: 10, conditions: [], conditionSince: {},
    note: null, createdAt: serverTimestamp(),
  });
  monsterId = m.id;
  const p = await addDoc(collection(dm.db, "games", gameId, "combatants"), {
    kind: "pc", name: "Smoke Hunter", characterId: `smoke-${dmUid}`, initiative: 15,
    ac: null, maxHp: null, currentHp: null, conditions: [], conditionSince: {},
    note: null, createdAt: serverTimestamp(),
  });
  pcRowId = p.id;
});
await step("Player marks the monster slain (update)", async () => {
  await updateDoc(doc(pl.db, "games", gameId, "combatants", monsterId), { currentHp: 0 });
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
await step("Player removes the monster from battle (delete)", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(pl.db, "games", gameId, "combatants", monsterId));
});

// Cleanup (admin bypass, best-effort).
const adb = adminGetFirestore(admin);
async function del(path) { try { await adb.doc(path).delete(); } catch { /* best-effort */ } }
await step("cleanup", async () => {
  if (gameId) {
    await del(`games/${gameId}/participants/${plUid}`);
    if (monsterId) await del(`games/${gameId}/combatants/${monsterId}`);
    if (pcRowId) await del(`games/${gameId}/combatants/${pcRowId}`);
    await del(`games/${gameId}`);
  }
  if (campaignId) {
    await del(`campaigns/${campaignId}/members/${dmUid}`);
    await del(`campaigns/${campaignId}/members/${plUid}`);
    await del(`campaigns/${campaignId}`);
  }
  await del(`characters/smoke-${dmUid}`);
});

console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL"));
console.log(`\n${failed.length ? "❌ " + failed.length + " FAILED" : "✅ all rule paths OK"}`);
process.exit(failed.length ? 1 : 0);
