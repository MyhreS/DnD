import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { initializeApp as initializeAdmin, cert } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { chromium } from "playwright";

const PORT = 5201;
const BASE = `http://127.0.0.1:${PORT}`;
const serviceAccount = process.env.AGENT_TEST_SA;
if (!serviceAccount) throw new Error("Missing AGENT_TEST_SA (run through Doppler).");
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) throw new Error("Missing VITE_FIREBASE_PROJECT_ID.");

const admin = initializeAdmin({ credential: cert(JSON.parse(serviceAccount)), projectId }, "battle-e2e");
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
  isWarden: false,
  createdAt: Date.now(),
});
await Promise.all([
  db.doc(`activeGameSeats/${dmUid}`).set({ uid: dmUid, gameId, role: "dm", reservedAt: Date.now() }),
  db.doc(`activeGameSeats/${playerUid}`).set({ uid: playerUid, gameId, role: "player", reservedAt: Date.now() }),
]);
const [dmToken, playerToken] = await Promise.all([
  auth.createCustomToken(dmUid),
  auth.createCustomToken(playerUid),
]);

const server = spawn("bunx", ["vite", "--host", "127.0.0.1", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, VITE_FIREBASE_EMULATORS: "1" },
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
  const battleLink = dmPage.getByRole("link", { name: "Open battle screen ↗" });
  await battleLink.waitFor();
  if (!(await battleLink.getAttribute("target"))?.includes("_blank")) throw new Error("Battle Screen does not open as a second display.");

  const playerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const battlePage = await playerContext.newPage();
  watch(battlePage, errors);
  await signIn(battlePage, playerToken);
  await battlePage.goto(`${BASE}/game/${gameId}/battle`, { waitUntil: "domcontentloaded" });
  await battlePage.getByText("Roll for initiative", { exact: true }).waitFor();

  await dmPage.getByRole("button", { name: "Start battle" }).click();
  await battlePage.getByText("Round 1", { exact: true }).waitFor();
  await battlePage.locator(".battle-name").getByText("Lady Maria", { exact: true }).waitFor();
  await battlePage.getByTestId("battle-turn-timer").getByText("Tactical briefing", { exact: true }).waitFor();
  await battlePage.getByTestId("battle-turn-timer").getByText("Briefing", { exact: true }).waitFor();
  await dmPage.getByRole("button", { name: "Start 90 seconds" }).click();
  await battlePage.getByTestId("battle-turn-timer").getByText("Turn timer", { exact: true }).waitFor();
  await battlePage.getByTestId("battle-turn-timer").getByText(/1:[0-3][0-9]/).waitFor();

  const enemyControl = dmPage.locator(".game-initiative-row").filter({ hasText: "Moon Beast" });
  await enemyControl.getByLabel("Add condition to Moon Beast").selectOption("poisoned");
  const enemyDisplay = battlePage.getByTestId(`battle-combatant-${enemyId}`);
  await enemyDisplay.getByText(/Poisoned/).waitFor();

  const enemyCard = dmPage.locator(".game-enemy").filter({ hasText: "Moon Beast" });
  await enemyCard.getByRole("button", { name: "Damage Moon Beast by 5" }).click();
  await enemyDisplay.getByText("5", { exact: true }).waitFor();
  await enemyDisplay.getByText("taken", { exact: true }).waitFor();

  await noHorizontalOverflow(dmPage, "Game combat controls");
  await dmPage.screenshot({ path: "screenshots/game-page-combat-controls.png", fullPage: true });
  await noHorizontalOverflow(battlePage, "Battle Screen desktop");
  await battlePage.screenshot({ path: "screenshots/battle-screen-desktop.png", fullPage: true });

  await dmPage.getByRole("button", { name: "Next turn" }).click();
  await battlePage.getByTestId("battle-turn-timer").getByText("DM turn", { exact: true }).waitFor();
  await battlePage.getByTestId("battle-turn-timer").getByText("No timer", { exact: true }).waitFor();
  await battlePage.getByTestId("battle-turn-timer").getByText("Moon Beast", { exact: true }).waitFor();

  await battlePage.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(battlePage, "Battle Screen mobile");
  await battlePage.screenshot({ path: "screenshots/battle-screen-mobile.png", fullPage: true });

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Battle Screen E2E passed: separate player display, Firestore initiative sync, timer, conditions, damage, and responsive layout.");
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
    db.doc(`users/${dmUid}`).delete(),
    db.doc(`users/${playerUid}`).delete(),
    auth.deleteUser(dmUid),
    auth.deleteUser(playerUid),
  ]);
}
