import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, devices } from "playwright";

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const appsResult = spawnSync("firebase", ["apps:list", "--json"], { encoding: "utf8" });
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = spawnSync("firebase", ["apps:sdkconfig", "WEB", webApp.appId, "--json"], { encoding: "utf8" });
if (configResult.status !== 0) throw new Error(`Could not read Firebase SDK config: ${configResult.stderr}`);
const firebase = JSON.parse(configResult.stdout).result.sdkConfig;
const server = spawn("bunx", ["vite", "--host", "127.0.0.1", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    VITE_FIREBASE_API_KEY: firebase.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebase.authDomain,
    VITE_FIREBASE_PROJECT_ID: firebase.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: firebase.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: firebase.messagingSenderId,
    VITE_FIREBASE_APP_ID: firebase.appId,
    VITE_FIREBASE_MEASUREMENT_ID: firebase.measurementId,
  },
});

async function ready() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* Vite is starting. */ }
    await sleep(250);
  }
  throw new Error("Vite did not start");
}

function watch(page, errors) {
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const report = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  if (report.document > report.viewport || report.body > report.viewport) {
    throw new Error(`${label} overflows horizontally: ${JSON.stringify(report)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  await ready();

  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ownerContext.addInitScript(() => {
    localStorage.setItem("cs-theme", "dark");
  });
  const owner = await ownerContext.newPage();
  watch(owner, errors);
  await owner.goto(`${BASE}/game?preview=user.player&game=empty`, { waitUntil: "domcontentloaded" });
  await owner.getByRole("heading", { name: "Game", exact: true }).waitFor();
  const primaryLinks = await owner.getByRole("navigation", { name: "Primary" }).getByRole("link").allTextContents();
  const huntersIndex = primaryLinks.indexOf("Hunters");
  if (huntersIndex < 0 || primaryLinks[huntersIndex + 1] !== "Game") {
    throw new Error(`Game is not directly after Hunters in navigation: ${JSON.stringify(primaryLinks)}`);
  }
  if (primaryLinks.includes("Menu")) throw new Error(`Landing page remains in navigation: ${JSON.stringify(primaryLinks)}`);
  if (primaryLinks.includes("DM")) throw new Error(`Legacy DM page remains in navigation: ${JSON.stringify(primaryLinks)}`);
  await owner.getByRole("link", { name: "Catacombs & Starspawns", exact: true }).click();
  await owner.waitForURL(`${BASE}/`);
  await owner.getByRole("heading", { name: /Welcome/ }).waitFor();
  await owner.screenshot({ path: "screenshots/main-menu-desktop.png", fullPage: true });
  await owner.goto(`${BASE}/game?preview=user.player&game=empty`, { waitUntil: "domcontentloaded" });
  await owner.getByRole("heading", { name: "Game", exact: true }).waitFor();

  await owner.getByRole("button", { name: "Create session", exact: true }).click();
  await owner.getByLabel("Session name").fill("Night of the Pale Moon");
  const search = owner.getByLabel("Search for a player or Hunter");
  await search.fill("Eileen");
  const searchResults = owner.getByLabel("Hunter search results");
  await searchResults.getByText("No matching Hunters.", { exact: true }).waitFor();
  if (await searchResults.getByRole("button", { name: /Eileen the Crow/ }).count()) {
    throw new Error("Session creator can add their own Hunter");
  }
  await search.fill("Gascoigne");
  const gascoigne = searchResults.getByRole("button", { name: /Gascoigne/ });
  await gascoigne.waitFor();
  await gascoigne.click();
  await owner.getByRole("button", { name: "Create session", exact: true }).click();
  await owner.getByRole("heading", { name: "Night of the Pale Moon" }).waitFor();
  if (await owner.getByText(/player ready|players ready|View party|Add players/).count()) {
    throw new Error("DM session body duplicates player management");
  }
  if (await owner.getByRole("button", { name: "Create session", exact: true }).count()) {
    throw new Error("Session owner can create a second active session");
  }

  const managePlayersButton = owner.getByRole("button", { name: "Manage players", exact: true });
  if (await managePlayersButton.count() !== 1) throw new Error("DM should have exactly one Manage players entry point");
  await managePlayersButton.click();
  const managePlayers = owner.getByRole("dialog", { name: "Manage players" });
  await managePlayers.getByRole("button", { name: /Gascoigne/ }).click();
  const characterSheet = owner.getByRole("dialog", { name: "Character sheet" });
  await characterSheet.waitFor();
  await characterSheet.getByRole("button", { name: /Back/ }).click();
  await characterSheet.waitFor({ state: "hidden" });

  await managePlayers.getByPlaceholder("Search player or Hunter…").fill("Eileen");
  if (await managePlayers.getByRole("button", { name: /Eileen the Crow/ }).count()) {
    throw new Error("Session creator can add their own Hunter after session creation");
  }
  await managePlayers.getByRole("button", { name: "Done", exact: true }).click();

  await owner.getByRole("button", { name: "Start session" }).click();
  if (await owner.getByTestId("session-clock").count()) throw new Error("Session timer is still visible.");
  if (await owner.getByRole("button", { name: /^(Pause|Resume)$/ }).count()) throw new Error("Session timer controls are still visible.");
  await owner.getByRole("button", { name: "Add enemy", exact: true }).click();
  const addEnemyDialog = owner.getByRole("dialog", { name: "Add enemy" });
  await addEnemyDialog.getByLabel("Name").fill("Moon Beast");
  await addEnemyDialog.getByLabel("Max HP").fill("30");
  await addEnemyDialog.getByRole("spinbutton", { name: "Initiative", exact: true }).fill("16");
  await addEnemyDialog.getByRole("spinbutton", { name: "AC", exact: true }).fill("14");
  await addEnemyDialog.getByLabel("Private notes").fill("Howls when bloodied.");
  await addEnemyDialog.getByRole("button", { name: "Add enemy", exact: true }).click();
  await owner.getByRole("button", { name: "Start battle screen" }).click();
  await owner.getByTestId("session-battle-screen").waitFor();
  await owner.locator(".battle-name").getByText("Moon Beast", { exact: true }).waitFor();
  await owner.getByRole("button", { name: "Manage battle" }).click();
  const manageBattle = owner.getByRole("dialog", { name: "Manage battle" });
  owner.once("dialog", (dialog) => dialog.accept());
  await manageBattle.getByRole("button", { name: "End battle" }).click();
  await owner.getByTestId("session-battle-screen").waitFor({ state: "detached" });

  owner.once("dialog", (dialog) => dialog.accept());
  await owner.getByRole("button", { name: "End session" }).click();
  await owner.getByText("Session history", { exact: true }).waitFor();
  await owner.getByText("History", { exact: true }).waitFor();
  await owner.getByText("1 player attended", { exact: true }).waitFor();
  await owner.getByRole("button", { name: "Create session", exact: true }).waitFor();

  await owner.getByRole("button", { name: "Create session", exact: true }).click();
  await owner.getByLabel("Session name").fill("Throwaway lobby");
  await owner.getByRole("button", { name: "Create session", exact: true }).click();
  await owner.getByRole("heading", { name: "Throwaway lobby" }).waitFor();
  await owner.getByRole("button", { name: "Discard session" }).waitFor();
  owner.once("dialog", (dialog) => dialog.accept());
  await owner.getByRole("button", { name: "Discard session" }).click();
  await owner.getByRole("heading", { name: "Night of the Pale Moon" }).waitFor();
  await owner.getByText("1 player attended", { exact: true }).waitFor();
  if (await owner.getByText("Throwaway lobby", { exact: true }).count()) {
    throw new Error("Discarded lobby was retained in session history");
  }
  await owner.screenshot({ path: "screenshots/game-page-owner-history-desktop.png", fullPage: true });

  const playerContext = await browser.newContext({ ...devices["iPhone 13"] });
  await playerContext.addInitScript(() => {
    localStorage.setItem("cs-theme", "light");
  });
  const player = await playerContext.newPage();
  watch(player, errors);
  await player.goto(`${BASE}/game?preview=user.player`, { waitUntil: "domcontentloaded" });
  await player.getByRole("heading", { name: "The Sunless Vault", exact: true }).waitFor();
  if (await player.getByRole("button", { name: "Create session", exact: true }).count()) {
    throw new Error("Invited player can create a second active session");
  }
  const playerLinks = await player.getByRole("navigation", { name: "Primary" }).getByRole("link").allTextContents();
  if (playerLinks.includes("Menu")) throw new Error(`Landing page remains in mobile navigation: ${JSON.stringify(playerLinks)}`);
  if (playerLinks.includes("DM")) throw new Error(`Legacy DM page remains in player navigation: ${JSON.stringify(playerLinks)}`);
  await player.getByRole("link", { name: "Catacombs & Starspawns", exact: true }).click();
  await player.waitForURL(`${BASE}/`);
  await player.getByRole("heading", { name: /Welcome/ }).waitFor();
  await player.screenshot({ path: "screenshots/main-menu-mobile.png", fullPage: true });
  await player.goto(`${BASE}/game?preview=user.player`, { waitUntil: "domcontentloaded" });
  await player.getByRole("heading", { name: "The Sunless Vault", exact: true }).waitFor();
  await player.getByText("Your Hunter", { exact: true }).waitFor();
  if (await player.getByText("Cleric Beast", { exact: true }).count()) throw new Error("Normal player session page exposes the encounter roster");
  if (await player.getByText("Players", { exact: true }).count()) throw new Error("Normal player session page exposes the party roster");
  await assertNoHorizontalOverflow(player, "Mobile Game page");
  await player.screenshot({ path: "screenshots/game-page-player-mobile.png", fullPage: true });

  await player.goto(`${BASE}/dm?preview=user.player`, { waitUntil: "domcontentloaded" });
  await player.waitForURL(/\/game(?:\?|$)/);
  await player.goto(`${BASE}/profile?preview=user.player`, { waitUntil: "domcontentloaded" });
  await player.getByText("Profile", { exact: true }).waitFor();
  const profileText = await player.locator("main").innerText();
  for (const removed of ["Dungeon Master mode", "Role switcher", "Admin · Party access"]) {
    if (profileText.includes(removed)) throw new Error(`Removed settings UI is still visible: ${removed}`);
  }
  await playerContext.close();
  await ownerContext.close();

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Game page E2E passed: logo navigation, compact primary navigation, one active session, owner controls, saved history, lobby discard, player visibility, and responsive layout.");
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
