import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { initializeApp as initializeAdmin, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { chromium } from "playwright";

const PORT = 5201;
const BASE = `http://127.0.0.1:${PORT}`;
const serviceAccount = process.env.AGENT_TEST_SA;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? "dandd-ea955";

const admin = initializeAdmin(serviceAccount
  ? { credential: cert(JSON.parse(serviceAccount)), projectId }
  : { projectId }, "battle-e2e");
const auth = getAdminAuth(admin);
const db = getAdminFirestore(admin);
const dmUid = "battle-e2e-dm";
const playerUid = "battle-e2e-player";
const gameId = "battle-e2e-game";
const characterId = "battle-e2e-warden";
const enemyId = "moon-beast";

async function ensureUser(uid, email, displayName) {
  try { await auth.deleteUser(uid); } catch { /* absent */ }
  await auth.createUser({ uid, email, emailVerified: true, displayName });
  await db.doc(`users/${uid}`).set({ uid, email, firstName: displayName.split(" ")[0], lastName: displayName.split(" ").slice(1).join(" ") });
}

function unsignedCustomToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: "emulator-test@dandd-ea955.iam.gserviceaccount.com",
    sub: "emulator-test@dandd-ea955.iam.gserviceaccount.com",
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
  })}.emulator-signature`;
}

await ensureUser(dmUid, "battle-dm@example.test", "Battle DM");
await ensureUser(playerUid, "battle-player@example.test", "Battle Player");
await db.doc(`characters/${characterId}`).set({
  id: characterId,
  ownerUid: playerUid,
  ownerEmail: "battle-player@example.test",
  ownerName: "Battle Player",
  campaignId: null,
  name: "Lady Maria",
  classId: "warden",
  subclassId: null,
  background: "Old Hunter",
  level: 3,
  abilities: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 10 },
  baseAbilities: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 10 },
  skillProficiencies: [],
  mainArmorId: null,
  addonArmorIds: [],
  studdedAddonIds: [],
  extraArmorIds: [],
  currentHp: 24,
  notes: "",
  sheet: { name: "Lady Maria", class: "Hunter Warden", level: "3", initiative: "+3", hpCur: "24", hpMax: "28", ac: "15" },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
const participant = {
  uid: playerUid,
  characterId,
  playerName: "Battle Player",
  name: "Lady Maria",
  classId: "warden",
  subclassId: null,
  className: "Hunter Warden",
  level: 3,
  role: "player",
  joinedAt: Date.now(),
  lastSeen: Date.now(),
};
await db.doc(`games/${gameId}`).set({
  campaignId: null,
  sessionId: null,
  title: "The Ashen Hunt",
  dmUid,
  dmName: "Battle DM",
  participantUids: [playerUid],
  participantRoster: [participant],
  attendeeRoster: [participant],
  seatUids: [dmUid, playerUid],
  status: "active",
  phase: "combat",
  location: "wild",
  combat: { active: false, round: 0, turnId: null, designatedWardenId: null, timerPhase: "idle", timerEndsAt: null, pausedRemainingMs: null },
  sandbox: false,
  clockRunning: true,
  clockStartedAt: Date.now(),
  clockElapsedMs: 0,
  createdAt: Date.now(),
  startedAt: Date.now(),
  endedAt: null,
  endedPhase: null,
  endedLocation: null,
});
await db.doc(`games/${gameId}/combatants/${enemyId}`).set({
  kind: "monster",
  name: "Moon Beast",
  characterId: null,
  initiative: -99,
  ac: 14,
  maxHp: 30,
  currentHp: 30,
  conditions: [],
  conditionSince: {},
  note: "Howls when bloodied.",
  revealHp: false,
  revealStats: false,
  enemyTemplateId: "moon-beast-template",
  baseStats: { name: "Moon Beast", initiative: -99, ac: 14, maxHp: 30, note: "Howls when bloodied.", revealHp: false, revealStats: false },
  isWarden: false,
  createdAt: Date.now(),
});
await Promise.all([
  db.doc(`users/${dmUid}/enemies/moon-beast-template`).set({ name: "Moon Beast", initiative: -99, ac: 14, maxHp: 30, note: "Howls when bloodied.", revealHp: false, revealStats: false, archived: false, createdAt: Date.now(), updatedAt: Date.now() }),
  db.doc(`users/${dmUid}/enemies/grave-hound-template`).set({ name: "Grave Hound", initiative: -99, ac: 12, maxHp: 18, note: "Fast and territorial.", revealHp: false, revealStats: false, archived: false, createdAt: Date.now(), updatedAt: Date.now() }),
]);
await db.doc(`games/${gameId}/battleView/${enemyId}`).set({
  kind: "monster",
  name: "Moon Beast",
  characterId: null,
  initiative: -99,
  ac: null,
  maxHp: null,
  currentHp: null,
  conditions: [],
  conditionSince: {},
  note: null,
  revealHp: false,
  revealStats: false,
  isWarden: false,
  createdAt: Date.now(),
});
await Promise.all([
  db.doc(`activeGameSeats/${dmUid}`).set({ uid: dmUid, gameId, role: "dm", reservedAt: Date.now() }),
  db.doc(`activeGameSeats/${playerUid}`).set({ uid: playerUid, gameId, role: "player", reservedAt: Date.now() }),
]);
const [dmToken, playerToken] = serviceAccount ? await Promise.all([
  auth.createCustomToken(dmUid),
  auth.createCustomToken(playerUid),
]) : [unsignedCustomToken(dmUid), unsignedCustomToken(playerUid)];

async function idTokenFor(customToken) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=emulator-api-key", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Auth emulator sign-in failed: ${response.status}`);
  return (await response.json()).idToken;
}

async function verifyEnemyLibraryRules() {
  const [dmIdToken, playerIdToken] = await Promise.all([idTokenFor(dmToken), idTokenFor(playerToken)]);
  const url = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${dmUid}/enemies/moon-beast-template`;
  const [ownerRead, playerRead] = await Promise.all([
    fetch(url, { headers: { authorization: `Bearer ${dmIdToken}` } }),
    fetch(url, { headers: { authorization: `Bearer ${playerIdToken}` } }),
  ]);
  if (!ownerRead.ok) throw new Error(`The DM cannot read their enemy library: ${ownerRead.status}`);
  if (playerRead.status !== 403) throw new Error(`Another player can read the DM enemy library: ${playerRead.status}`);
}

await verifyEnemyLibraryRules();

const server = spawn("bunx", ["vite", "--host", "127.0.0.1", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    VITE_FIREBASE_EMULATORS: "1",
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY ?? "emulator-api-key",
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID ?? "1:123:web:emulator",
  },
});

async function ready() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* starting */ }
    await sleep(250);
  }
  throw new Error("Vite did not start.");
}

async function signIn(page, token) {
  await page.goto(`${BASE}/?testToken=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("navigation", { name: "Primary" }).waitFor();
}

function watch(page, errors) {
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });
}

async function noHorizontalOverflow(page, label) {
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (width.scroll > width.client) throw new Error(`${label} overflows horizontally: ${JSON.stringify(width)}`);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  await ready();
  const dmContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const dmPage = await dmContext.newPage();
  watch(dmPage, errors);
  await signIn(dmPage, dmToken);
  await dmPage.goto(`${BASE}/game`, { waitUntil: "domcontentloaded" });
  await dmPage.getByRole("heading", { name: "The Ashen Hunt" }).waitFor();

  const playerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const playerPage = await playerContext.newPage();
  watch(playerPage, errors);
  await signIn(playerPage, playerToken);
  await playerPage.goto(`${BASE}/game`, { waitUntil: "domcontentloaded" });
  await playerPage.getByRole("heading", { name: "The Ashen Hunt" }).waitFor();

  await dmPage.getByRole("button", { name: "Start battle screen" }).click();
  const battlePicker = dmPage.getByRole("dialog", { name: "Choose enemies" });
  await battlePicker.getByLabel(/Grave Hound/).check();
  await battlePicker.getByRole("button", { name: "Start battle", exact: true }).click();
  await Promise.all([
    dmPage.getByTestId("session-battle-screen").waitFor(),
    playerPage.getByTestId("session-battle-screen").waitFor(),
  ]);
  await playerPage.getByText("Round 1", { exact: true }).waitFor();
  await playerPage.locator(".battle-name").getByText("Lady Maria", { exact: true }).waitFor();
  await playerPage.locator(".battle-name").getByText("Grave Hound", { exact: true }).waitFor();
  if (await playerPage.getByTestId("battle-turn-timer").count()) throw new Error("Player can still see the turn timer.");
  if (await dmPage.getByRole("button", { name: /timer|90 seconds/i }).count()) throw new Error("DM can still see turn-timer controls.");
  if (await playerPage.getByRole("button", { name: "Next turn" }).count()) throw new Error("Player received DM battle controls.");
  if (await playerPage.getByRole("button", { name: "End battle" }).count()) throw new Error("Player can end battle mode.");
  if (await playerPage.getByRole("button", { name: "+ Add enemy" }).count()) throw new Error("Player can add enemies.");
  if (await playerPage.locator(".game-battle-toolbar").count()) throw new Error("Player can see the DM control bar.");
  if (await dmPage.getByRole("button", { name: "Manage battle" }).count()) throw new Error("Manage battle should not be needed during a battle.");
  if (await dmPage.locator(".battle-row-controls").count() < 2) throw new Error("DM combatant controls are not available in the battle screen.");
  if (await dmPage.locator(".battle-name").filter({ hasText: "Lady Maria" }).count() !== 1) throw new Error("The Hunter is duplicated in the default battle view.");
  if (await dmPage.locator(".game-battle-toolbar button").count() < 3) throw new Error("The DM battle actions are not available directly.");

  const enemyControl = dmPage.getByTestId(`battle-combatant-${enemyId}`);
  await enemyControl.getByLabel("Add condition to Moon Beast").selectOption("poisoned");
  const enemyDisplay = playerPage.getByTestId(`battle-combatant-${enemyId}`);
  await enemyDisplay.getByText(/Poisoned/).waitFor();

  const playerEnemyText = await enemyDisplay.innerText();
  if (playerEnemyText.includes("30") || playerEnemyText.includes("14") || playerEnemyText.includes("Howls")) {
    throw new Error(`Hidden monster data leaked to the player: ${playerEnemyText}`);
  }

  const enemyCard = dmPage.locator(".game-enemy").filter({ hasText: "Moon Beast" });
  await enemyCard.getByRole("button", { name: "+5", exact: true }).click();
  if ((await enemyDisplay.innerText()).includes("5")) throw new Error("Player saw exact damage before the DM revealed HP.");
  await enemyCard.getByLabel("HP visible").check();
  await enemyDisplay.getByText("5", { exact: true }).waitFor();
  await enemyDisplay.getByText("taken", { exact: true }).waitFor();
  await enemyCard.getByLabel("Stats visible").check();
  await enemyDisplay.locator(".battle-ac").getByText("14", { exact: true }).waitFor();
  await enemyCard.getByRole("button", { name: "Reset stats", exact: true }).click();
  await enemyCard.getByText("0 damage", { exact: false }).waitFor();
  await enemyControl.locator(".battle-condition-controls").getByRole("button", { name: /Poisoned/ }).waitFor({ state: "detached" });
  await enemyDisplay.getByText(/Poisoned/).waitFor({ state: "detached" });
  await enemyDisplay.locator(".battle-ac").getByText("14", { exact: true }).waitFor({ state: "detached" });
  const resetPlayerText = await enemyDisplay.innerText();
  if (resetPlayerText.includes("30") || resetPlayerText.includes("14")) {
    throw new Error(`Reset stats did not restore the enemy visibility defaults: ${resetPlayerText}`);
  }

  await dmPage.getByRole("button", { name: "Add enemy", exact: true }).click();
  const enemyLibrary = dmPage.getByRole("dialog", { name: "Manage enemies" });
  await enemyLibrary.getByText("Moon Beast", { exact: true }).waitFor();
  await enemyLibrary.getByText("Grave Hound", { exact: true }).waitFor();
  await noHorizontalOverflow(dmPage, "Enemy library desktop");
  await dmPage.screenshot({ path: "screenshots/game-enemy-library-desktop.png", fullPage: true });
  await enemyLibrary.getByRole("button", { name: "Done", exact: true }).click();

  await dmPage.getByRole("button", { name: "Create item", exact: true }).click();
  const itemDialog = dmPage.getByRole("dialog", { name: "Create an item" });
  await itemDialog.getByLabel("Name").fill("Ashen Spear");
  await itemDialog.getByLabel("Damage").fill("1d8 piercing");
  await itemDialog.getByRole("button", { name: "Create item" }).click();

  const hunterControl = dmPage.locator(".battle-row").filter({ hasText: "Lady Maria" });
  await hunterControl.getByLabel("Lady Maria damage taken").fill("7");
  await hunterControl.getByLabel("Lady Maria damage taken").blur();
  await playerPage.locator(".battle-row").filter({ hasText: "Lady Maria" }).getByText("7", { exact: true }).waitFor();
  const damagedHunter = await db.doc(`characters/${characterId}`).get();
  const pcCombatants = await db.collection(`games/${gameId}/combatants`).where("characterId", "==", characterId).get();
  if (pcCombatants.empty || pcCombatants.docs[0].data().currentHp !== 21) throw new Error("Direct Hunter damage did not update the battle record.");
  if (damagedHunter.data()?.currentHp !== 24 || damagedHunter.data()?.sheet?.hpCur !== "24") throw new Error("Battle damage should not overwrite the Hunter sheet.");

  await noHorizontalOverflow(dmPage, "Clean DM battle view");
  await dmPage.screenshot({ path: "screenshots/game-battle-mode-dm.png", fullPage: true });
  await noHorizontalOverflow(playerPage, "Player battle mode desktop");
  await playerPage.screenshot({ path: "screenshots/game-battle-mode-player.png", fullPage: true });

  await dmPage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(dmPage, "Clean DM battle view mobile");
  await dmPage.screenshot({ path: "screenshots/game-battle-mode-dm-mobile.png", fullPage: true });

  await dmPage.getByRole("button", { name: "Next turn" }).click();
  await playerPage.locator(".battle-live-status").getByText("Grave Hound", { exact: true }).waitFor();

  await playerPage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(playerPage, "Player battle mode mobile");
  await playerPage.screenshot({ path: "screenshots/game-battle-mode-mobile.png", fullPage: true });

  dmPage.once("dialog", (dialog) => dialog.accept());
  await dmPage.getByRole("button", { name: "End battle" }).click();
  await Promise.all([
    dmPage.getByTestId("session-battle-screen").waitFor({ state: "detached" }),
    playerPage.getByTestId("session-battle-screen").waitFor({ state: "detached" }),
  ]);
  await playerPage.getByText("Your Hunter", { exact: true }).waitFor();
  await playerPage.getByRole("heading", { name: "Something was found" }).waitFor();
  await playerPage.getByText("Ashen Spear", { exact: true }).waitFor();
  await playerPage.getByRole("button", { name: "Take", exact: true }).click();
  await playerPage.getByText("Ashen Spear was added to your Hunter.", { exact: true }).waitFor();
  await sleep(250);
  const claimedHunter = await db.doc(`characters/${characterId}`).get();
  if (!claimedHunter.data()?.customItems?.some((item) => item.name === "Ashen Spear")) throw new Error("Claimed session weapon did not reach the Hunter sheet.");
  if (!claimedHunter.data()?.inventory?.some((item) => String(item.itemId).startsWith("session-"))) throw new Error("Claimed session weapon did not reach inventory.");

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Battle mode E2E passed: direct DM controls, private enemy library, synced damage, stat reset, visibility, and responsive layout.");
  await dmContext.close();
  await playerContext.close();
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await Promise.allSettled([
    db.recursiveDelete(db.doc(`games/${gameId}`)),
    db.doc(`characters/${characterId}`).delete(),
    db.doc(`activeGameSeats/${dmUid}`).delete(),
    db.doc(`activeGameSeats/${playerUid}`).delete(),
    db.recursiveDelete(db.doc(`users/${dmUid}`)),
    db.recursiveDelete(db.doc(`users/${playerUid}`)),
    auth.deleteUser(dmUid),
    auth.deleteUser(playerUid),
  ]);
}
