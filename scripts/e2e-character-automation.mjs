import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PORT = Number(process.env.E2E_PORT ?? 5197);
const BASE = `http://127.0.0.1:${PORT}`;
const firebaseArgs = ["--project", "dandd-ea955", "--account", "simonmyhre1@gmail.com"];

const firebaseExecutable = (() => {
  if (process.platform !== "win32") return { command: "firebase", args: [] };
  const shim = spawnSync("where.exe", ["firebase.cmd"], { encoding: "utf8" }).stdout?.split(/\r?\n/).find(Boolean);
  if (!shim) return { command: "firebase.cmd", args: [] };
  const installDir = dirname(shim);
  const runtime = join(installDir, "node.exe");
  return {
    command: existsSync(runtime) ? runtime : process.execPath,
    args: [join(installDir, "node_modules", "firebase-tools", "lib", "bin", "firebase.js")],
  };
})();

const runFirebase = (args) => spawnSync(
  firebaseExecutable.command,
  [...firebaseExecutable.args, ...args],
  { encoding: "utf8" },
);
const appsResult = runFirebase(["apps:list", ...firebaseArgs, "--json"]);
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr || appsResult.error}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = runFirebase(["apps:sdkconfig", "WEB", webApp.appId, ...firebaseArgs, "--json"]);
if (configResult.status !== 0) throw new Error(`Could not read Firebase SDK config: ${configResult.stderr || configResult.error}`);
const firebase = JSON.parse(configResult.stdout).result.sdkConfig;
const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const server = spawn(process.execPath, [viteCli, "--host", "127.0.0.1", "--port", String(PORT)], {
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

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  await ready();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    localStorage.setItem("cs-character-sheet-view", "hud");
    localStorage.setItem("cs-theme", "light");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });

  await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Hunters", exact: true }).waitFor({ timeout: 20_000 });
  if (await page.getByRole("button", { name: "Create hunter", exact: true }).count() !== 1) {
    throw new Error("Hunter list must expose exactly one Create hunter action");
  }

  await page.getByRole("button", { name: "Create hunter", exact: true }).click();
  await page.getByTestId("app-character-sheet").waitFor();
  await page.getByRole("heading", { name: "Create hunter", exact: true }).waitFor();
  await page.getByText("Character creation · Step 1", { exact: true }).waitFor();
  await page.getByRole("textbox", { name: "Hunter name", exact: true }).fill("Restored Deepcaller");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Character creation · Step 2", { exact: true }).waitFor();
  const classSelect = page.getByRole("combobox", { name: "Hunter class", exact: true });
  await classSelect.selectOption("deepcaller");
  if (await classSelect.inputValue() !== "deepcaller") throw new Error("Deepcaller was not selected");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("heading", { name: "Choose background", exact: true }).waitFor();
  if (await page.getByText("Current source character sheet", { exact: false }).count()) {
    throw new Error("The replacement PDF-style character editor is still visible");
  }

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
  await page.getByTestId("app-character-sheet").waitFor();
  await page.getByRole("heading", { name: "Eileen the Crow", exact: true }).waitFor();
  for (const section of ["Hunter", "Abilities", "Skills", "Class abilities", "Notes", "Resources"]) {
    if (await page.getByRole("button", { name: section, exact: true }).count() !== 1) {
      throw new Error(`Restored Hunter HUD is missing its ${section} section`);
    }
  }
  if (await page.getByRole("button", { name: "Open equipment slots", exact: true }).count() !== 1) {
    throw new Error("Restored Hunter HUD is missing equipment");
  }

  await page.goto(`${BASE}/codex?q=Call%20Starborn%20Horror&preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByText("Call Starborn Horror", { exact: true }).first().waitFor();
  if (errors.length) throw new Error(`Character E2E browser errors:\n${errors.join("\n")}`);
  console.log("Guided Hunter creation, restored Hunter sheet, and current Deepcaller source checks passed.");
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
