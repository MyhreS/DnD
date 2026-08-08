import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, devices } from "playwright";

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const FIREBASE_ACCOUNT = process.env.FIREBASE_ACCOUNT ?? "simonmyhre1@gmail.com";
const appsResult = spawnSync("firebase", ["apps:list", "--json", "--account", FIREBASE_ACCOUNT], { encoding: "utf8" });
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = spawnSync("firebase", ["apps:sdkconfig", "WEB", webApp.appId, "--json", "--account", FIREBASE_ACCOUNT], { encoding: "utf8" });
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
  await owner.goto(`${BASE}/game?preview=user.player&game=invite`, { waitUntil: "domcontentloaded" });
  const desktopRequest = owner.getByRole("region", { name: "Session requests" });
  await desktopRequest.getByText("The Ashen Cathedral", { exact: true }).waitFor();
  await desktopRequest.getByText("Second DM invited you. Accepting will leave your current session.", { exact: true }).waitFor();
  await assertNoHorizontalOverflow(owner, "Desktop session request");
  await owner.screenshot({ path: "screenshots/session-switch-request-desktop.png", fullPage: true });
  await desktopRequest.getByRole("button", { name: "Decline", exact: true }).click();
  await desktopRequest.waitFor({ state: "detached" });
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
  await gascoigne.getByText("Preview Hunter · Bloodbound · Level 3", { exact: true }).waitFor();
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
  await managePlayers.getByText("Preview Hunter · Bloodbound · Level 3", { exact: true }).waitFor();
  await owner.screenshot({ path: "screenshots/manage-players-desktop.png" });
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

  const desktopNotes = owner.getByRole("region", { name: "Session notes" });
  await desktopNotes.getByRole("textbox", { name: "Add a session note" }).fill("The bell tower overlooks the eastern gate.");
  await desktopNotes.getByRole("button", { name: "Add note", exact: true }).click();
  await desktopNotes.getByText("The bell tower overlooks the eastern gate.", { exact: true }).waitFor();
  await assertNoHorizontalOverflow(owner, "Desktop session notes");
  await owner.screenshot({ path: "screenshots/session-notes-desktop.png", fullPage: true });

  await owner.setViewportSize({ width: 390, height: 844 });
  await managePlayersButton.click();
  await managePlayers.getByText("Preview Hunter · Bloodbound · Level 3", { exact: true }).waitFor();
  await assertNoHorizontalOverflow(owner, "Mobile Manage players dialog");
  await owner.screenshot({ path: "screenshots/manage-players-mobile.png" });
  await managePlayers.getByRole("button", { name: "Done", exact: true }).click();
  const mobileNotes = owner.getByRole("region", { name: "Session notes" });
  await mobileNotes.getByRole("textbox", { name: "Add a session note" }).fill("Keep the lantern lit when crossing the bridge.");
  await mobileNotes.getByRole("button", { name: "Add note", exact: true }).click();
  await mobileNotes.getByText("Keep the lantern lit when crossing the bridge.", { exact: true }).waitFor();
  await assertNoHorizontalOverflow(owner, "Mobile session notes");
  await owner.screenshot({ path: "screenshots/session-notes-mobile.png", fullPage: true });
  await owner.setViewportSize({ width: 1440, height: 1000 });

  await owner.getByRole("button", { name: "Start session" }).click();
  if (await owner.getByTestId("session-clock").count()) throw new Error("Session timer is still visible.");
  if (await owner.getByRole("button", { name: /^(Pause|Resume)$/ }).count()) throw new Error("Session timer controls are still visible.");
  await owner.getByRole("button", { name: "Manage enemies", exact: true }).click();
  const enemyLibrary = owner.getByRole("dialog", { name: "Manage enemies" });
  await enemyLibrary.getByRole("button", { name: "New enemy" }).click();
  const enemyEditor = owner.getByRole("dialog", { name: "New enemy" });
  await enemyEditor.getByLabel("Name").fill("Moon Beast");
  await enemyEditor.getByLabel("Max HP").fill("30");
  await enemyEditor.getByRole("spinbutton", { name: "Initiative", exact: true }).fill("16");
  await enemyEditor.getByRole("spinbutton", { name: "AC", exact: true }).fill("14");
  await enemyEditor.getByLabel("Private notes").fill("Howls when bloodied.");
  await enemyEditor.getByLabel("Add to the current battle after saving").check();
  await enemyEditor.getByRole("button", { name: "Save enemy", exact: true }).click();
  await enemyLibrary.getByText("Moon Beast", { exact: true }).waitFor();
  await assertNoHorizontalOverflow(owner, "Enemy library desktop");
  await owner.screenshot({ path: "screenshots/enemy-library-desktop.png", fullPage: true });
  await owner.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(owner, "Enemy library mobile");
  await owner.screenshot({ path: "screenshots/enemy-library-mobile.png", fullPage: true });
  await owner.setViewportSize({ width: 1440, height: 1000 });
  await enemyLibrary.getByRole("button", { name: "Done", exact: true }).click();
  await owner.getByRole("button", { name: "Start battle screen" }).click();
  const battlePicker = owner.getByRole("dialog", { name: "Choose enemies" });
  await owner.screenshot({ path: "screenshots/start-battle-picker-desktop.png", fullPage: true });
  await owner.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(owner, "Start battle picker mobile");
  await owner.screenshot({ path: "screenshots/start-battle-picker-mobile.png", fullPage: true });
  await owner.setViewportSize({ width: 1440, height: 1000 });
  await battlePicker.getByRole("button", { name: "Start battle", exact: true }).click();
  await owner.getByTestId("session-battle-screen").waitFor();
  await owner.locator(".battle-name").getByText("Moon Beast", { exact: true }).waitFor();
  owner.once("dialog", (dialog) => dialog.accept());
  await owner.getByRole("button", { name: "End battle" }).click();
  await owner.getByTestId("session-battle-screen").waitFor({ state: "detached" });

  owner.once("dialog", (dialog) => dialog.accept());
  await owner.getByRole("button", { name: "End session" }).click();
  await owner.getByText("Session history", { exact: true }).waitFor();
  const historyToggle = owner.getByRole("button", { name: "Session history" });
  if (await owner.getByText("Night of the Pale Moon", { exact: true }).count() !== 1) {
    throw new Error("Saved sessions should be hidden until history is opened");
  }
  await historyToggle.click();
  await owner.getByText("Night of the Pale Moon", { exact: true }).nth(1).waitFor();
  await historyToggle.click();
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
  await player.goto(`${BASE}/game?preview=user.player&game=invite`, { waitUntil: "domcontentloaded" });
  const mobileRequest = player.getByRole("region", { name: "Session requests" });
  await mobileRequest.getByRole("button", { name: "Join and switch", exact: true }).waitFor();
  await assertNoHorizontalOverflow(player, "Mobile session request");
  await player.screenshot({ path: "screenshots/session-switch-request-mobile.png", fullPage: true });
  await mobileRequest.getByRole("button", { name: "Join and switch", exact: true }).click();
  await player.getByRole("heading", { name: "The Ashen Cathedral", exact: true }).waitFor();
  await mobileRequest.waitFor({ state: "detached" });
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
  await player.goto(`${BASE}/game?preview=user.player&game=history`, { waitUntil: "domcontentloaded" });
  await player.getByRole("heading", { name: "The Sunless Vault", exact: true }).waitFor();
  await player.getByText("Your Hunter", { exact: true }).waitFor();
  const playerHistoryToggle = player.getByRole("button", { name: "History (1)" });
  await playerHistoryToggle.waitFor();
  if (await player.getByText("The Old Cathedral", { exact: true }).count()) {
    throw new Error("Player session history should stay hidden by default");
  }
  await playerHistoryToggle.click();
  await player.getByText("The Old Cathedral", { exact: true }).waitFor();
  await playerHistoryToggle.click();
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
