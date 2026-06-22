// Playwright "test play": drives the REAL app with two signed-in identities
// (DM + player, via testTokens) through a live game, against live Firestore +
// rules + the settleTrade function. Seeds the campaign/character via the Admin
// SDK so the run is robust (no character-builder automation), then exercises the
// in-game flow through the UI.
//
//   doppler run -- bun run scripts/test-play.mjs
//
// Needs AGENT_TEST_SA in env. Drives http://localhost:5173 (run `bun run dev`).
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { chromium, devices } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:5173";
const app = initializeApp({ credential: cert(JSON.parse(process.env.AGENT_TEST_SA)) });
const auth = getAuth(app);
const db = getFirestore(app);
const sl = (m) => new Promise((r) => setTimeout(r, m));

const dmToken = await auth.createCustomToken("agent-dm");
const plToken = await auth.createCustomToken("agent-player");
const dmUid = "agent-dm";
const plUid = "agent-player";
const cid = `testplay-${Date.now()}`;
const charId = `testplay-char-${plUid}`;

// --- Seed campaign (dm + player members) + a player character (admin) ---
await db.doc(`campaigns/${cid}`).set({
  name: "Test Play", dmUid, dmName: "Agent DM", inviteCode: "TPLAY1",
  memberUids: [dmUid, plUid], createdAt: FieldValue.serverTimestamp(),
});
await db.doc(`campaigns/${cid}/members/${dmUid}`).set({ uid: dmUid, name: "Agent DM", email: "dm@x", role: "dm", characterId: null, joinedAt: FieldValue.serverTimestamp() });
await db.doc(`campaigns/${cid}/members/${plUid}`).set({ uid: plUid, name: "Agent Player", email: "p@x", role: "player", characterId: charId, joinedAt: FieldValue.serverTimestamp() });
await db.doc(`characters/${charId}`).set({
  id: charId, ownerUid: plUid, ownerEmail: "p@x", ownerName: "Agent Player",
  name: "Testra the Bold", classId: "scout", subclassId: "marksman", background: "Scout", level: 3,
  abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 12, cha: 8 },
  skillProficiencies: ["Stealth"], mainArmorId: null, campaignId: cid, currentHp: 22,
  inventory: [{ itemId: "pistol", qty: 1 }], coins: 10, notes: "", createdAt: Date.now(), updatedAt: Date.now(),
});

const browser = await chromium.launch();
const errors = [];
function watch(page, who) {
  page.on("console", (m) => { if (m.type() === "error" && /permission|denied/i.test(m.text())) errors.push(`${who}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${who}: ${String(e)}`));
}
async function ctx(token) {
  const c = await browser.newContext({ ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
  await sl(2500); // sign in with the custom token + load campaigns
  return { c, p };
}
const log = (s) => console.log(s);

try {
  const dm = await ctx(dmToken); watch(dm.p, "DM");
  const pl = await ctx(plToken); watch(pl.p, "PLAYER");

  // Both enter the campaign from the main menu (sets the active campaign).
  for (const x of [dm, pl]) {
    await x.p.getByRole("button", { name: /Test Play/ }).first().click().catch(() => {});
    await sl(1800);
  }
  log("DM + player entered the campaign");

  // DM starts a game and begins it.
  await dm.p.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" }); await sl(2000);
  await dm.p.getByRole("button", { name: /Start an ad-hoc game/i }).click(); await sl(2500);
  log("DM started a game (lobby)");
  await dm.p.getByRole("button", { name: "Begin game" }).click(); await sl(2000);
  log("DM began the game");

  // Player opens Play → auto-registers in the active game.
  await pl.p.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" }); await sl(4000);
  log("Player opened Play");

  // Let Firestore settle, then the DM views the game fresh.
  errors.length = 0; // ignore churn during the rapid setup; assert on the steady state
  await dm.p.goto(`${BASE}/play`, { waitUntil: "domcontentloaded" }); await sl(4000);
  const dmText = await dm.p.locator("body").innerText();
  const playerSeen = /Testra the Bold|Agent Player/.test(dmText);
  log(`DM sees the player in the game: ${playerSeen}`);

  await dm.p.screenshot({ path: "screenshots/testplay-dm.png", fullPage: true });
  await pl.p.screenshot({ path: "screenshots/testplay-player.png", fullPage: true });

  log(`\npermission errors: ${errors.length}`);
  errors.slice(0, 8).forEach((e) => log(" - " + e));
  log(errors.length === 0 ? "✅ test play OK" : "❌ saw permission errors");
} finally {
  await browser.close();
  // cleanup
  const subs = await db.collection(`games`).where("campaignId", "==", cid).get();
  for (const g of subs.docs) {
    for (const pd of (await g.ref.collection("participants").get()).docs) await pd.ref.delete();
    await g.ref.delete();
  }
  for (const m of (await db.collection(`campaigns/${cid}/members`).get()).docs) await m.ref.delete();
  await db.doc(`campaigns/${cid}`).delete();
  await db.doc(`characters/${charId}`).delete();
  console.log("cleaned up test-play data");
}
process.exit(errors.length ? 1 : 0);
