// Focused Playwright coverage for the local combat controller and second-screen view.
// Uses DEV preview auth, so it is deterministic and does not touch Firestore.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import { chromium } from "playwright";

const PORT = 5192;
const BASE = `http://localhost:${PORT}`;
const OUT = "screenshots/combat";

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(250);
  }
  throw new Error("Combat test server did not start");
}

async function requireText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });
}

async function addCombatant(page, input) {
  const form = page.getByTestId("add-combatant-form");
  await form.locator("#combatant-name").fill(input.name);
  await form.locator("#combatant-kind").selectOption(input.kind);
  await form.locator("#combatant-initiative").fill(String(input.initiative));
  await form.locator("#combatant-ac").fill(String(input.armorClass));
  await form.locator("#combatant-hp").fill(String(input.maxHp));
  if (input.warden) await form.getByText("Warden", { exact: true }).click();
  await form.getByRole("button", { name: "Add combatant" }).click();
  await page.getByText(input.name, { exact: true }).first().waitFor({ state: "visible" });
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.removeItem("cs-combat-session-v1"));

  const errors = [];
  const control = await context.newPage();
  control.on("pageerror", (error) => errors.push(`pageerror: ${String(error)}`));
  control.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await control.goto(`${BASE}/combat?preview=admin.dm`, { waitUntil: "networkidle" });
  await requireText(control, "Run initiative, damage, conditions");
  await requireText(control, "Local preview mode");
  const gameCardResponse = await context.request.get(`${BASE}/game-card/players-game-card.pdf`);
  if (!gameCardResponse.ok() || !gameCardResponse.headers()["content-type"]?.includes("pdf")) {
    throw new Error("Player's game card PDF is not served correctly");
  }

  await addCombatant(control, {
    name: "Warden Vale",
    kind: "hunter",
    initiative: 18,
    armorClass: 16,
    maxHp: 24,
    warden: true,
  });
  await addCombatant(control, {
    name: "Moon Beast",
    kind: "creature",
    initiative: 12,
    armorClass: 14,
    maxHp: 30,
    warden: false,
  });
  await control.screenshot({ path: `${OUT}/01-setup-mobile.png`, fullPage: true });

  const [display] = await Promise.all([
    context.waitForEvent("page"),
    control.getByRole("button", { name: "Open battle screen" }).click(),
  ]);
  await display.setViewportSize({ width: 1440, height: 900 });
  await display.waitForLoadState("networkidle");
  await requireText(display, "Roll for initiative");

  await control.getByTestId("start-combat").click();
  await requireText(control, "Tactical briefing");
  await requireText(display, "Tactical briefing");
  await display.screenshot({ path: `${OUT}/02-warden-briefing-display.png`, fullPage: true });

  await control.getByTestId("start-warden-turn").click();
  await requireText(control, "Turn in progress");
  const runningTime = await control.getByTestId("combat-timer").textContent();
  if (!runningTime || !/1:(?:30|29|28)/.test(runningTime)) {
    throw new Error(`Expected a fresh 90-second timer, got: ${runningTime}`);
  }

  await control.getByRole("button", { name: "Pause timer" }).click();
  await requireText(control, "Timer paused by DM");
  await requireText(display, "Timer paused by DM");

  const wardenRow = control.getByTestId("combatant-Warden Vale");
  await wardenRow.getByRole("button", { name: "Deal 5 damage to Warden Vale" }).click();
  await wardenRow.getByLabel("Add condition to Warden Vale").fill("Poisoned");
  await wardenRow.getByRole("button", { name: "Add", exact: true }).click();
  await requireText(display, "Poisoned");
  await display.screenshot({ path: `${OUT}/03-damage-condition-display.png`, fullPage: true });

  await control.getByTestId("next-turn").click();
  await requireText(display, "Moon Beast");
  await requireText(display, "DM turn - no timer");
  await control.screenshot({ path: `${OUT}/04-next-turn-mobile.png`, fullPage: true });
  await display.screenshot({ path: `${OUT}/05-untimed-dm-turn-display.png`, fullPage: true });

  control.once("dialog", (dialog) => dialog.accept());
  await control.getByRole("button", { name: "End combat" }).click();
  await requireText(control, "Initiative order");

  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player = await playerContext.newPage();
  await player.goto(`${BASE}/combat?preview=user.player`, { waitUntil: "networkidle" });
  await requireText(player, "The DM controls the live encounter");
  await player.goto(`${BASE}/handbook?preview=user.player`, { waitUntil: "networkidle" });
  await player.getByText("Playtest Rule - Combat Turn Timer", { exact: true }).click();
  await requireText(player, "Each player has 90 seconds");
  const gameCardLink = player.getByRole("link", { name: "Open player's game card (PDF)" });
  if ((await gameCardLink.getAttribute("href")) !== "/game-card/players-game-card.pdf") {
    throw new Error("Handbook game-card link points to the wrong file");
  }
  await playerContext.close();

  await context.close();
  await browser.close();
  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
}

const previewEnv = {
  ...process.env,
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "preview-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "preview.local",
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "preview-project",
  VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "preview-app",
};

console.log("Starting focused combat E2E test");
const dev = spawn("bunx", ["vite", "--port", String(PORT)], {
  stdio: ["ignore", "ignore", "inherit"],
  env: previewEnv,
});

try {
  await waitForServer();
  await run();
  console.log(`Combat E2E passed. Screenshots: ${OUT}`);
} finally {
  dev.kill("SIGTERM");
}
