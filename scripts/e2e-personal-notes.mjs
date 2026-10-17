// Personal notes save on their own as the player types: no "Review changes"
// bar, nothing to press, and a staged edit elsewhere on the sheet can never
// write an older copy of the notes back. Runs against the emulators.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { initializeApp as initializeAdmin, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { chromium } from "playwright";

const PORT = 5202;
const BASE = `http://127.0.0.1:${PORT}`;
const serviceAccount = process.env.AGENT_TEST_SA;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? "dandd-ea955";
const admin = initializeAdmin(serviceAccount ? { credential: cert(JSON.parse(serviceAccount)), projectId } : { projectId }, "notes-e2e");
const auth = getAdminAuth(admin);
const db = getAdminFirestore(admin);
const playerUid = "notes-e2e-player";
const characterId = "notes-e2e-hunter";

function unsignedCustomToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: "emulator-test@dandd-ea955.iam.gserviceaccount.com",
    sub: "emulator-test@dandd-ea955.iam.gserviceaccount.com",
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now, exp: now + 3600, uid,
  })}.emulator-signature`;
}

try { await auth.deleteUser(playerUid); } catch { /* absent */ }
await auth.createUser({ uid: playerUid, email: "notes-player@example.test", emailVerified: true, displayName: "Notes Player" });
await db.doc(`users/${playerUid}`).set({ uid: playerUid, email: "notes-player@example.test", firstName: "Notes", lastName: "Player" });
await db.doc(`characters/${characterId}`).set({
  id: characterId, ownerUid: playerUid, ownerEmail: "notes-player@example.test", ownerName: "Notes Player", campaignId: null,
  name: "Journal Keeper", classId: "warden", subclassId: null, background: "Old Hunter", level: 2, lastSeenLevel: 2,
  abilities: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 10 }, baseAbilities: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 10 },
  skillProficiencies: [], mainArmorId: null, addonArmorIds: [], studdedAddonIds: [], extraArmorIds: [], currentHp: 10, notes: "",
  // Existing notes matter: the bug only showed when the sheet already held some.
  sheet: { name: "Journal Keeper", class: "Hunter Warden", level: "2", hpCur: "10", pageNotes: "Old note." }, createdAt: Date.now(), updatedAt: Date.now(),
});

const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env, VITE_FIREBASE_EMULATORS: "1",
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY ?? "emulator-api-key", VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID ?? "1:123:web:emulator",
  },
});
const savedNotes = async () => (await db.doc(`characters/${characterId}`).get()).data();
async function waitFor(check, label) {
  for (let attempt = 0; attempt < 40; attempt += 1) { if (await check()) return; await sleep(250); }
  throw new Error(label);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ } await sleep(250); }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });
  const token = serviceAccount ? await auth.createCustomToken(playerUid) : unsignedCustomToken(playerUid);
  await page.goto(`${BASE}/?testToken=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("navigation", { name: "Primary" }).waitFor();
  const openNotes = async () => {
    await page.goto(`${BASE}/character`); await page.getByText("Journal Keeper").first().waitFor();
    await page.getByRole("button", { name: /View character|Open character/ }).first().click();
    await page.getByRole("button", { name: /^Notes/i }).first().click();
    return page.getByTestId("appsheet-notes");
  };
  const tray = page.getByText("Review changes");

  // 1. Typing saves on its own; no review bar appears.
  let notes = await openNotes();
  if (await notes.inputValue() !== "Old note.") throw new Error(`Existing notes did not load: ${await notes.inputValue()}`);
  await notes.fill("");
  await notes.click();
  await page.keyboard.type("The bell tolls at midnight.", { delay: 15 });
  if (await notes.inputValue() !== "The bell tolls at midnight.") throw new Error(`Typing did not show in the notes: ${await notes.inputValue()}`);
  await page.getByText("Saving…").or(page.getByText("Saves automatically")).first().waitFor();
  if (await tray.count()) throw new Error("Typing personal notes opened the Review changes bar.");
  await waitFor(async () => (await savedNotes())?.sheet?.pageNotes === "The bell tolls at midnight.", "Personal notes were not saved automatically.");
  if (await tray.count()) throw new Error("The Review changes bar appeared after notes saved.");

  // 2. A staged edit elsewhere never writes older notes back when applied.
  await page.locator(".character-sheet-page-stack").last().getByRole("button", { name: /back/i }).first().click();
  await page.getByRole("button", { name: /^Resources/i }).first().click();
  await page.getByRole("button", { name: "Increase Favors" }).click();
  await waitFor(async () => (await savedNotes())?.favors === 1, "A Favor change did not save on its own.");
  if (await tray.count()) throw new Error("A sheet edit opened the Review changes bar.");
  await page.locator(".character-sheet-page-stack").last().getByRole("button", { name: /back/i }).first().click();
  await page.getByRole("button", { name: /^Notes/i }).first().click();
  notes = page.getByTestId("appsheet-notes");
  await notes.click(); await page.keyboard.press("End");
  await page.keyboard.type(" Bring silver.", { delay: 15 });
  await waitFor(async () => (await savedNotes())?.sheet?.pageNotes === "The bell tolls at midnight. Bring silver.", "Notes typed during a review were not saved.");
  await sleep(1500);
  const after = await savedNotes();
  if (after?.sheet?.pageNotes !== "The bell tolls at midnight. Bring silver.") throw new Error(`Applying another change overwrote the notes: ${after?.sheet?.pageNotes}`);
  if ((after?.favors ?? 0) !== 1) throw new Error("The staged Favor was not applied.");

  // 3. The notes are there after reopening.
  notes = await openNotes();
  if (await notes.inputValue() !== "The bell tolls at midnight. Bring silver.") throw new Error("Notes did not survive reopening the sheet.");

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Personal notes E2E passed: autosave while typing, no review bar, never overwritten by another sheet edit, persists.");
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await Promise.allSettled([db.doc(`characters/${characterId}`).delete(), db.recursiveDelete(db.doc(`users/${playerUid}`)), auth.deleteUser(playerUid)]);
}
