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
  notTonight: true,
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
  combat: { active: false, round: 0, turnId: null, timerPhase: "idle", timerEndsAt: null, pausedRemainingMs: null },
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

const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(PORT)], {
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

async function openCombatantOptions(card, combatantName, visibleAction) {
  const action = card.getByRole("button", { name: visibleAction, exact: true });
  if (!await action.isVisible()) await card.getByLabel(`More options for ${combatantName}`).click();
  await action.waitFor();
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
  await dmPage.getByRole("button", { name: /The Ashen Hunt/ }).click();
  await dmPage.getByRole("heading", { name: "The Ashen Hunt" }).waitFor();

  const playerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const playerPage = await playerContext.newPage();
  watch(playerPage, errors);
  await signIn(playerPage, playerToken);
  await playerPage.goto(`${BASE}/game`, { waitUntil: "domcontentloaded" });
  await playerPage.getByRole("button", { name: /The Ashen Hunt/ }).click();
  await playerPage.getByRole("heading", { name: "The Ashen Hunt" }).waitFor();

  await dmPage.getByRole("button", { name: "Start battle" }).click();
  const battlePicker = dmPage.getByRole("dialog", { name: "Choose enemies" });
  await battlePicker.getByLabel(/Grave Hound/).check();
  await battlePicker.getByRole("button", { name: "Start battle", exact: true }).click();
  await Promise.all([
    dmPage.getByTestId("session-battle-screen").waitFor(),
    playerPage.getByTestId("session-battle-screen").waitFor(),
  ]);
  await playerPage.getByLabel("Round 1", { exact: true }).waitFor();
  await playerPage.locator(".battle-name").getByText("Lady Maria", { exact: true }).waitFor();
  await playerPage.locator(".battle-name").getByText("Grave Hound", { exact: true }).waitFor();
  if (await playerPage.getByTestId("battle-turn-timer").count()) throw new Error("Player can still see the turn timer.");
  if (await dmPage.getByRole("button", { name: /timer|90 seconds/i }).count()) throw new Error("DM can still see turn-timer controls.");
  if (await playerPage.getByRole("button", { name: "Next turn" }).count()) throw new Error("Player received DM battle controls.");
  if (await playerPage.getByLabel("Battle options").count()) throw new Error("Player can open DM battle options.");
  if (await playerPage.locator(".game-battle-toolbar").count()) throw new Error("Player can see the DM control bar.");
  if (await dmPage.getByRole("button", { name: "Manage battle" }).count()) throw new Error("Manage battle should not be needed during a battle.");
  if (await dmPage.getByRole("button", { name: /Decrease .* initiative/ }).count() < 2) throw new Error("Compact DM initiative controls are not available in the battle screen.");
  if (await dmPage.locator(".battle-name").filter({ hasText: "Lady Maria" }).count() !== 1) throw new Error("The Hunter is duplicated in the default battle view.");
  await dmPage.getByLabel("Battle options").click();
  if (await dmPage.locator(".battle-tools-menu button").count() < 3) throw new Error("The DM battle options are incomplete.");
  await noHorizontalOverflow(dmPage, "Desktop battle options");
  await dmPage.screenshot({ path: "screenshots/game-battle-options-desktop.png", fullPage: true });
  await dmPage.getByLabel("Battle options").click();

  await noHorizontalOverflow(dmPage, "Initial DM battle view");
  await noHorizontalOverflow(playerPage, "Initial player battle view");
  await dmPage.screenshot({ path: "screenshots/game-battle-layout-desktop.png", fullPage: true });
  await playerPage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(playerPage, "Initial player battle view mobile");
  await playerPage.screenshot({ path: "screenshots/game-battle-layout-mobile.png", fullPage: true });
  await playerPage.setViewportSize({ width: 1440, height: 900 });

  const enemyControl = dmPage.getByTestId(`battle-combatant-${enemyId}`);
  const enemyDisplay = playerPage.getByTestId(`battle-combatant-${enemyId}`);
  await openCombatantOptions(enemyControl, "Moon Beast", "Remove enemy");
  await enemyControl.getByLabel("More options for Moon Beast").click();
  await openCombatantOptions(enemyControl, "Moon Beast", "Kill Moon Beast");
  await enemyControl.getByRole("button", { name: "Kill Moon Beast" }).click();
  await enemyControl.getByText("Enemy · dead", { exact: true }).waitFor();
  await enemyDisplay.getByText("Enemy · dead", { exact: true }).waitFor();
  await openCombatantOptions(enemyControl, "Moon Beast", "Revive Moon Beast");
  await enemyControl.getByRole("button", { name: "Revive Moon Beast" }).click();
  await enemyControl.getByText("Enemy", { exact: true }).waitFor();
  await enemyDisplay.getByText("Enemy", { exact: true }).waitFor();
  await openCombatantOptions(enemyControl, "Moon Beast", "Reset stats");
  await enemyControl.getByRole("button", { name: "Reset stats", exact: true }).click();
  await enemyControl.getByRole("button", { name: "Increase Moon Beast initiative" }).click();
  await enemyControl.getByRole("button", { name: "Decrease Moon Beast initiative" }).click();
  await enemyControl.getByLabel("Set Moon Beast initiative").fill("12");
  await enemyControl.getByLabel("Set Moon Beast initiative").press("Enter");
  await playerPage.getByLabel("Moon Beast initiative 12").waitFor();
  const directInitiativeEnemy = await db.doc(`games/${gameId}/combatants/${enemyId}`).get();
  if (directInitiativeEnemy.data()?.initiative !== 12) throw new Error("Direct initiative edit did not update the battle record.");
  await enemyControl.getByLabel("Add condition to Moon Beast").selectOption("poisoned");
  await enemyDisplay.getByText(/Poisoned/).waitFor();
  // The GM can name a condition of their own; players see it too.
  await enemyControl.getByLabel("Add condition to Moon Beast").selectOption("__custom");
  await enemyControl.getByLabel("Custom condition for Moon Beast").fill("Marked by the Moon");
  await enemyControl.getByRole("button", { name: "Add", exact: true }).click();
  await enemyControl.getByRole("button", { name: "Remove Marked by the Moon from Moon Beast" }).waitFor();
  await enemyDisplay.getByText(/Marked by the Moon/).waitFor();

  const playerEnemyText = await enemyDisplay.innerText();
  if (playerEnemyText.includes("30") || playerEnemyText.includes("14") || playerEnemyText.includes("Howls")) {
    throw new Error(`Hidden monster data leaked to the player: ${playerEnemyText}`);
  }

  await openCombatantOptions(enemyControl, "Moon Beast", "Add 5 damage");
  await enemyControl.getByRole("button", { name: "Add 5 damage" }).click();
  if ((await enemyDisplay.innerText()).includes("5")) throw new Error("Player saw exact damage before the DM revealed HP.");
  await openCombatantOptions(enemyControl, "Moon Beast", "Show HP");
  await enemyControl.getByRole("button", { name: "Show HP" }).click();
  await enemyDisplay.getByText("5", { exact: true }).waitFor();
  await enemyDisplay.getByText("damage", { exact: true }).waitFor();
  await openCombatantOptions(enemyControl, "Moon Beast", "Show stats");
  await enemyControl.getByRole("button", { name: "Show stats" }).click();
  await enemyDisplay.locator(".battle-ac").getByText("14", { exact: true }).waitFor();
  await openCombatantOptions(enemyControl, "Moon Beast", "Reset stats");
  await enemyControl.getByRole("button", { name: "Reset stats", exact: true }).click();
  await enemyControl.getByLabel("Moon Beast damage taken 0").waitFor();
  await enemyControl.getByRole("button", { name: "Remove Poisoned from Moon Beast" }).waitFor({ state: "detached" });
  await enemyDisplay.getByText(/Poisoned/).waitFor({ state: "detached" });
  await enemyDisplay.locator(".battle-ac").getByText("14", { exact: true }).waitFor({ state: "detached" });
  const resetPlayerText = await enemyDisplay.innerText();
  if (resetPlayerText.includes("30") || resetPlayerText.includes("14")) {
    throw new Error(`Reset stats did not restore the enemy visibility defaults: ${resetPlayerText}`);
  }

  await dmPage.getByLabel("Battle options").click();
  await dmPage.getByRole("button", { name: "Add enemy", exact: true }).click();
  const enemyLibrary = dmPage.getByRole("dialog", { name: "Manage enemies" });
  await enemyLibrary.getByText("Moon Beast", { exact: true }).waitFor();
  await enemyLibrary.getByText("Grave Hound", { exact: true }).waitFor();
  await noHorizontalOverflow(dmPage, "Enemy library desktop");
  await dmPage.screenshot({ path: "screenshots/game-enemy-library-desktop.png", fullPage: true });
  await enemyLibrary.getByRole("button", { name: "Done", exact: true }).click();

  await dmPage.getByLabel("Battle options").click();
  await dmPage.getByRole("button", { name: "Create item", exact: true }).click();
  const itemDialog = dmPage.getByRole("dialog", { name: "Create an item" });
  await itemDialog.getByLabel("Name").fill("Ashen Spear");
  await itemDialog.getByLabel("Damage").fill("1d8 piercing");
  await itemDialog.getByRole("button", { name: "Create item" }).click();
  await itemDialog.waitFor({ state: "detached" });

  const hunterControl = dmPage.locator(".battle-row").filter({ hasText: "Lady Maria" });
  await openCombatantOptions(hunterControl, "Lady Maria", "Remove Hunter");
  await hunterControl.getByLabel("More options for Lady Maria").click();
  // The starting AC is derived from the current rules, so read it rather than
  // hard-coding it; the test is that two increases land on both screens.
  const startingAc = Number((await hunterControl.getByLabel(/^Lady Maria armor class \d+$/).getAttribute("aria-label")).split(" ").at(-1));
  await hunterControl.getByRole("button", { name: "Increase Lady Maria armor class" }).click();
  await hunterControl.locator(".battle-ac").getByText(String(startingAc + 1), { exact: true }).waitFor();
  await hunterControl.getByRole("button", { name: "Increase Lady Maria armor class" }).click();
  await playerPage.locator(".battle-row").filter({ hasText: "Lady Maria" }).locator(".battle-ac").getByText(String(startingAc + 2), { exact: true }).waitFor();
  const armoredHunter = await db.collection(`games/${gameId}/combatants`).where("characterId", "==", characterId).get();
  if (armoredHunter.empty || armoredHunter.docs[0].data().ac !== startingAc + 2) throw new Error("Direct Hunter AC did not update the battle record.");

  // --- Hunters keep their own HP: the DM gets no Damage / Heal / Temp HP on them ---
  for (const action of ["Damage", "Heal", "Give"]) {
    if (await hunterControl.getByRole("button", { name: new RegExp(`^${action} Lady Maria`) }).count()) throw new Error(`The DM must not have ${action} on a Hunter.`);
  }
  // What the player keeps on their sheet shows on both screens: HP, Temporary
  // HP (extra HP on the bar), Madness against Max Sanity, Insane, Not Tonight!.
  const playerHunter = playerPage.locator(".battle-row").filter({ hasText: "Lady Maria" });
  await playerHunter.getByText(/Not Tonight! ready/i).waitFor();
  await db.doc(`characters/${characterId}`).update({ currentHp: 20, "sheet.hpCur": "20", "sheet.hpTemp": "4", madness: 3, notTonight: false });
  await hunterControl.getByLabel("Lady Maria hit points 20 of 28").waitFor();
  await hunterControl.getByLabel("Lady Maria temporary hit points 4").waitFor();
  await playerHunter.getByLabel("Lady Maria temporary hit points 4").waitFor();
  await hunterControl.locator(".battle-health-temp").waitFor();
  await hunterControl.getByText(/Not Tonight! used/i).waitFor();
  await playerHunter.getByLabel(/^Madness 3 of \d+$/).waitFor();
  const sanityMax = Number((await playerHunter.getByLabel(/^Madness 3 of \d+$/).getAttribute("aria-label")).split(" ").at(-1));
  await db.doc(`characters/${characterId}`).update({ madness: sanityMax });
  await playerHunter.locator(".battle-state-chip.is-insane").waitFor();
  await hunterControl.locator(".battle-state-chip.is-insane").waitFor();
  await db.doc(`characters/${characterId}`).update({ madness: 0, notTonight: true, "sheet.hpTemp": "0" });
  await hunterControl.locator(".battle-temp-hp").waitFor({ state: "detached" });
  await dmPage.screenshot({ path: "screenshots/game-battle-hunter-state.png", fullPage: true });

  // --- Enemy Temporary HP: extra HP lost before its HP ([page 10]) ---
  {
    const hound = dmPage.locator(".battle-row").filter({ hasText: "Grave Hound" });
    await hound.getByLabel("Amount for Grave Hound").fill("5");
    await hound.getByRole("button", { name: "Give Grave Hound temporary hit points", exact: true }).click();
    await hound.getByLabel("Grave Hound temporary hit points 5").waitFor();
    await hound.getByLabel("Amount for Grave Hound").fill("3");
    await hound.getByRole("button", { name: "Damage Grave Hound", exact: true }).click();
    await hound.getByLabel("Grave Hound temporary hit points 2").waitFor();
    await hound.getByLabel("Grave Hound damage taken 0").waitFor();
    await hound.getByRole("button", { name: "Clear Grave Hound temporary hit points", exact: true }).click();
    await hound.locator(".battle-temp-hp").waitFor({ state: "detached" });
  }

  // --- Enemy killed by damage, then revived ---
  const houndControl = dmPage.locator(".battle-row").filter({ hasText: "Grave Hound" });
  const damageHound = houndControl.getByRole("button", { name: "Damage Grave Hound", exact: true });
  for (let tap = 0; tap < 4; tap += 1) await damageHound.click({ delay: 0 });
  await houndControl.getByLabel("Grave Hound damage taken 4").waitFor();
  await houndControl.getByLabel("Amount for Grave Hound").fill("99");
  await houndControl.getByRole("button", { name: "Damage Grave Hound", exact: true }).click();
  await houndControl.getByText("Enemy · dead", { exact: true }).waitFor();
  await playerPage.locator(".battle-row").filter({ hasText: "Grave Hound" }).getByText("Enemy · dead", { exact: true }).waitFor();
  await openCombatantOptions(houndControl, "Grave Hound", "Revive Grave Hound");
  await houndControl.getByRole("button", { name: "Revive Grave Hound" }).click();
  await houndControl.getByText("Enemy", { exact: true }).waitFor();

  // --- An enemy with unknown HP, added to this battle only ---
  await dmPage.getByLabel("Battle options").click();
  await dmPage.getByRole("button", { name: "Add enemy", exact: true }).click();
  await dmPage.getByRole("dialog", { name: "Manage enemies" }).getByRole("button", { name: "New enemy" }).click();
  const newEnemy = dmPage.getByRole("dialog", { name: "New enemy" });
  await newEnemy.getByLabel("Name").fill("Shade of Yharnam");
  await newEnemy.getByLabel("Initiative").fill("4");
  await newEnemy.getByRole("button", { name: "Add to battle only" }).click();
  const library = dmPage.getByRole("dialog", { name: "Manage enemies" });
  await library.waitFor();
  if (await library.getByText("Shade of Yharnam").count()) throw new Error("A battle-only enemy was saved to the library.");
  await library.getByRole("button", { name: "Done", exact: true }).click();
  const shade = dmPage.locator(".battle-row").filter({ hasText: "Shade of Yharnam" });
  await shade.getByText("HP unknown", { exact: true }).waitFor();
  await shade.getByLabel("Amount for Shade of Yharnam").fill("7");
  await shade.getByRole("button", { name: "Damage Shade of Yharnam", exact: true }).click();
  await shade.getByLabel("Shade of Yharnam damage taken 7").waitFor();
  await openCombatantOptions(shade, "Shade of Yharnam", "Remove enemy");
  await shade.getByLabel("Max HP for Shade of Yharnam").fill("20");
  await shade.getByRole("button", { name: "Set", exact: true }).click();
  await shade.getByLabel("Shade of Yharnam hit points 13 of 20").waitFor();
  await openCombatantOptions(shade, "Shade of Yharnam", "Remove enemy");
  await shade.getByRole("button", { name: "Remove enemy", exact: true }).click();
  await shade.waitFor({ state: "detached" });

  // --- Kill an enemy from its menu ---
  await openCombatantOptions(houndControl, "Grave Hound", "Kill Grave Hound");
  await houndControl.getByRole("button", { name: "Kill Grave Hound" }).click();
  await houndControl.getByText("Enemy · dead", { exact: true }).waitFor();
  await sleep(1500);
  await houndControl.getByText("Enemy · dead", { exact: true }).waitFor();

  // --- Mark a Hunter dead from the menu and confirm ---
  await openCombatantOptions(hunterControl, "Lady Maria", "Mark Lady Maria dead");
  await hunterControl.getByRole("button", { name: "Mark Lady Maria dead" }).click();
  const markDead = dmPage.getByRole("dialog", { name: "Lady Maria dies" });
  await markDead.waitFor();
  await markDead.getByRole("button", { name: /Confirm death|Expend a Favor/ }).click();
  await markDead.waitFor({ state: "detached" });
  await hunterControl.getByText("Hunter · fallen", { exact: true }).waitFor();
  await sleep(1500);
  await hunterControl.getByText("Hunter · fallen", { exact: true }).waitFor();
  if ((await db.doc(`characters/${characterId}`).get()).exists) throw new Error("A confirmed death did not move the Hunter to the fallen.");
  const fallenEntry = (await db.collection("archive").where("gameId", "==", gameId).get()).docs.find((entry) => entry.data().card?.id === characterId);
  if (!fallenEntry) throw new Error("The fallen Hunter is missing from the archive.");
  // ...and the DM can bring them back from the fallen roster.
  await dmPage.getByRole("button", { name: /^(Recover|Long Rest complete — return)$/ }).first().click();
  for (let attempt = 0; attempt < 20 && !(await db.doc(`characters/${characterId}`).get()).exists; attempt += 1) await sleep(250);
  if (!(await db.doc(`characters/${characterId}`).get()).exists) throw new Error("Recover did not return the Hunter to play.");

  await dmPage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(dmPage, "DM battle after every action, mobile");
  await dmPage.screenshot({ path: "screenshots/game-battle-actions-mobile.png", fullPage: true });
  await dmPage.setViewportSize({ width: 1280, height: 900 });

  await noHorizontalOverflow(dmPage, "Clean DM battle view");
  await dmPage.screenshot({ path: "screenshots/game-battle-mode-dm.png", fullPage: true });
  await noHorizontalOverflow(playerPage, "Player battle mode desktop");
  await playerPage.screenshot({ path: "screenshots/game-battle-mode-player.png", fullPage: true });

  await dmPage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(dmPage, "Clean DM battle view mobile");
  await dmPage.screenshot({ path: "screenshots/game-battle-mode-dm-mobile.png", fullPage: true });
  await dmPage.getByLabel("Battle options").click();
  await noHorizontalOverflow(dmPage, "Mobile battle options");
  await dmPage.screenshot({ path: "screenshots/game-battle-options-mobile.png", fullPage: true });
  await dmPage.getByLabel("Battle options").click();

  await dmPage.getByRole("button", { name: "Next turn" }).click();
  await playerPage.locator(".battle-live-status").getByText("Grave Hound", { exact: true }).waitFor();

  await playerPage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(playerPage, "Player battle mode mobile");
  await playerPage.screenshot({ path: "screenshots/game-battle-mode-mobile.png", fullPage: true });

  await openCombatantOptions(enemyControl, "Moon Beast", "Remove enemy");
  await enemyControl.getByRole("button", { name: "Remove enemy", exact: true }).click();
  await Promise.all([
    enemyControl.waitFor({ state: "detached" }),
    enemyDisplay.waitFor({ state: "detached" }),
  ]);
  const [removedCombatant, removedBattleView] = await Promise.all([
    db.doc(`games/${gameId}/combatants/${enemyId}`).get(),
    db.doc(`games/${gameId}/battleView/${enemyId}`).get(),
  ]);
  if (removedCombatant.exists || removedBattleView.exists) throw new Error("Removing a dead enemy left battle records behind.");

  await openCombatantOptions(hunterControl, "Lady Maria", "Remove Hunter");
  await hunterControl.getByRole("button", { name: "Remove Hunter", exact: true }).click();
  await Promise.all([
    hunterControl.waitFor({ state: "detached" }),
    playerPage.locator(".battle-row").filter({ hasText: "Lady Maria" }).waitFor({ state: "detached" }),
  ]);
  const removedHunterCombatants = await db.collection(`games/${gameId}/combatants`).where("characterId", "==", characterId).get();
  const preservedHunter = await db.doc(`characters/${characterId}`).get();
  if (!removedHunterCombatants.empty || !preservedHunter.exists) throw new Error("Removing a Hunter should only remove them from the battle.");

  await dmPage.getByLabel("Battle options").click();
  await dmPage.getByRole("button", { name: "End battle", exact: true }).click();
  await dmPage.getByRole("alertdialog", { name: "End battle?" }).getByRole("button", { name: "End battle", exact: true }).click();
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

  // --- Shop: the player sees it, asks to buy, the DM approves or declines ---
  await db.doc(`characters/${characterId}`).update({ coins: 20 });
  await db.doc(`games/${gameId}`).update({ shop: { open: true, name: "The Grey Market", lines: [
    { id: "line-lantern", itemId: "lantern", name: "Lantern, Hooded", priceGp: 11 },
  ] } });
  const playerShop = playerPage.locator(".player-shop");
  await playerShop.getByText("The Grey Market", { exact: true }).waitFor();
  await playerShop.getByText("20 GP", { exact: true }).waitFor();
  await playerShop.getByRole("button", { name: "Ask to buy" }).click();
  await playerShop.getByRole("button", { name: /Waiting for/ }).waitFor();
  const dmRequests = dmPage.locator(".shop-requests");
  await dmRequests.getByText(/wants/).waitFor();
  await dmRequests.getByRole("button", { name: "Approve", exact: true }).click();
  await playerShop.getByText(/Bought ✓/).waitFor();
  await playerShop.getByText("9 GP", { exact: true }).waitFor();
  const boughtHunter = (await db.doc(`characters/${characterId}`).get()).data();
  if (boughtHunter?.coins !== 9 || !boughtHunter?.inventory?.some((entry) => entry.itemId === "lantern")) throw new Error("An approved purchase must take the gold and give the item.");
  // The DM adds an item: the player is told it is new.
  await db.doc(`games/${gameId}`).update({ "shop.lines": [
    { id: "line-lantern", itemId: "lantern", name: "Lantern, Hooded", priceGp: 11 },
    { id: "line-letter", name: "A stranger's sealed letter", priceGp: 5, note: "No questions" },
  ] });
  await playerShop.locator(".player-shop-new").getByText(/A stranger's sealed letter/).waitFor();
  await playerShop.locator(".player-shop-item.is-new").filter({ hasText: "sealed letter" }).getByText("New", { exact: true }).waitFor();
  await noHorizontalOverflow(playerPage, "Player shop");
  await playerPage.screenshot({ path: "screenshots/game-player-shop.png", fullPage: true });
  await playerShop.getByRole("button", { name: "Got it" }).click();
  await playerShop.locator(".player-shop-new").waitFor({ state: "detached" });
  // A declined request changes nothing.
  await playerShop.locator(".player-shop-item").filter({ hasText: "sealed letter" }).getByRole("button", { name: "Ask to buy" }).click();
  await dmRequests.getByText(/sealed letter/).waitFor();
  await dmPage.screenshot({ path: "screenshots/game-shop-requests-dm.png", fullPage: true });
  await dmRequests.getByRole("button", { name: "Decline", exact: true }).click();
  await playerShop.getByText(/said no/).waitFor();
  if ((await db.doc(`characters/${characterId}`).get()).data()?.coins !== 9) throw new Error("A declined purchase must not take gold.");
  await db.doc(`games/${gameId}`).update({ "shop.open": false });
  await playerShop.waitFor({ state: "detached" });

  await dmPage.setViewportSize({ width: 1280, height: 900 });
  await dmPage.getByRole("button", { name: "New battle", exact: true }).click();
  const newBattlePicker = dmPage.getByRole("dialog", { name: "Start a new battle" });
  await newBattlePicker.getByLabel(/Grave Hound/).check();
  await newBattlePicker.getByRole("button", { name: "Start new battle", exact: true }).click();
  await Promise.all([
    dmPage.getByTestId("session-battle-screen").waitFor(),
    playerPage.getByTestId("session-battle-screen").waitFor(),
  ]);
  if (await dmPage.getByTestId(`battle-combatant-${enemyId}`).count()) throw new Error("A completed battle's enemy carried into the new battle.");
  if (await dmPage.locator(".battle-name").getByText("Lady Maria", { exact: true }).count() !== 1) throw new Error("The new battle should have one fresh Hunter row.");
  if (await dmPage.locator(".battle-name").getByText("Grave Hound", { exact: true }).count() !== 1) throw new Error("The selected enemy did not appear in the new battle.");

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
