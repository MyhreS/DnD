// Focused Playwright coverage for the current Play combat controls and Status board.
// Preview mode is deterministic; cross-device Firestore is covered by test-play.mjs.
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

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.setItem("cs-experimental", "on"));

  const errors = [];
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(`pageerror: ${String(error)}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
  };

  const control = await context.newPage();
  watch(control);
  await control.goto(`${BASE}/play?preview=admin.dm&play=active&phase=combat`, { waitUntil: "networkidle" });
  await requireText(control, "Combat · Round 2");
  await requireText(control, "DM turn — no timer");
  await control.getByRole("button", { name: "Next turn" }).click();
  await requireText(control, "Turn in progress");
  const runningTime = await control.getByTestId("combat-timer").textContent();
  if (!runningTime || !/1:(?:30|29)/.test(runningTime)) {
    throw new Error(`Expected a fresh 90-second timer, got: ${runningTime}`);
  }
  await control.getByTestId("pause-combat-timer").click();
  await requireText(control, "Timer paused by DM");
  await control.getByTestId("resume-combat-timer").click();
  await requireText(control, "Turn in progress");

  await control.getByRole("button", { name: "Next turn" }).click();
  await requireText(control, "Tactical briefing");
  await control.getByTestId("start-warden-timer").click();
  await requireText(control, "Gascoigne · Turn in progress");
  await control.screenshot({ path: `${OUT}/control-mobile.png`, fullPage: true });

  const display = await context.newPage();
  watch(display);
  await display.setViewportSize({ width: 1440, height: 900 });
  await display.goto(`${BASE}/status?preview=admin.dm&play=active&phase=combat`, { waitUntil: "networkidle" });
  await requireText(display, "Combat · Round 2");
  await requireText(display, "DM turn — no timer");
  await display.screenshot({ path: `${OUT}/status-desktop.png`, fullPage: true });

  const pdfResponse = await context.request.get(`${BASE}/game-card/players-game-card.pdf`);
  if (!pdfResponse.ok() || !pdfResponse.headers()["content-type"]?.includes("pdf")) {
    throw new Error("Player's game card PDF is not served correctly");
  }
  await control.goto(`${BASE}/handbook`, { waitUntil: "networkidle" });
  await requireText(control, "Playtest Rule — Combat Turn Timer");
  const gameCardLink = control.getByRole("link", { name: "Open player's game card (PDF)" });
  if ((await gameCardLink.getAttribute("href")) !== "/game-card/players-game-card.pdf") {
    throw new Error("Handbook game-card link points to the wrong file");
  }

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
