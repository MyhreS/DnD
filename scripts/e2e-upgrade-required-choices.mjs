import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = Number(process.env.E2E_PORT ?? 5204);
const BASE = `http://127.0.0.1:${PORT}`;
const firebaseArgs = ["--project", "dandd-ea955", "--account", "simonmyhre1@gmail.com"];
function runFirebase(args) {
  return process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "firebase.cmd", ...args], { encoding: "utf8" })
    : spawnSync("firebase", args, { encoding: "utf8" });
}
const appsResult = runFirebase(["apps:list", ...firebaseArgs, "--json"]);
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.error ?? appsResult.stderr}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = runFirebase(["apps:sdkconfig", "WEB", webApp.appId, ...firebaseArgs, "--json"]);
if (configResult.status !== 0) throw new Error(`Could not read Firebase SDK config: ${configResult.error ?? configResult.stderr}`);
const firebase = JSON.parse(configResult.stdout).result.sdkConfig;
const server = spawn("bun", ["x", "vite", "--host", "127.0.0.1", "--port", String(PORT)], {
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
    try { if ((await fetch(BASE)).ok) return; } catch { /* starting */ }
    await sleep(250);
  }
  throw new Error("Vite did not start");
}

function stopServer() {
  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill.exe", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }
  server.kill("SIGTERM");
}

async function completeBruteCreation(browser, viewport, suffix) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem("cs-character-sheet-view", "hud");
    localStorage.setItem("cs-theme", "dark");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });

  await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Hunters", exact: true }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Create hunter", exact: true }).click();
  const sheet = page.getByTestId("view4-character-sheet");
  await sheet.waitFor();
  await sheet.locator(".v4-identity-progress button").first().click();
  await page.getByRole("button", { name: /^Upgrade character/ }).click();

  const next = page.getByRole("button", { name: "Next", exact: true });
  await page.getByRole("heading", { name: "Choose class", exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("A new hunter could skip the required class decision");
  await page.locator(".v4-upgrade-select select").selectOption("brute");
  if (await next.isDisabled()) throw new Error("The class step stayed blocked after selecting Hunter Brute");
  await next.click();

  await page.getByRole("heading", { name: "Choose background", exact: true }).waitFor();
  await page.locator(".v4-upgrade-select select").selectOption("noble");
  await next.click();
  await page.getByLabel("Strength background bonus", { exact: true }).selectOption("2");
  await page.getByLabel("Intelligence background bonus", { exact: true }).selectOption("1");
  await next.click();
  await page.getByLabel("Athletics", { exact: true }).check();
  await page.getByLabel("Perception", { exact: true }).check();
  await next.click();

  await page.getByRole("heading", { name: "Weapon mastery", exact: true }).waitFor();
  await page.getByText("3 weapons needed", { exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("Weapon Mastery could be skipped with three choices missing");
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/upgrade-required-choices-${suffix}.png`, fullPage: true });
  await page.getByLabel(/^Greatsword/).check();
  await page.getByLabel(/^Greataxe/).check();
  await page.getByLabel(/^Longsword/).check();
  if (await next.isDisabled()) throw new Error("Weapon Mastery stayed blocked after three selections");
  await next.click();

  await page.getByRole("heading", { name: "Fighting Style", exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("The level-one Fighting Style choice was not required");
  await page.locator(".v4-upgrade-select select").selectOption({ label: "Defense" });
  if (await next.isDisabled()) throw new Error("Fighting Style stayed blocked after choosing Defense");
  await next.click();

  await page.getByRole("heading", { name: "Review & save", exact: true }).waitFor();
  await page.getByText("Ready to save", { exact: true }).waitFor();
  const save = page.getByRole("button", { name: "Save upgrade", exact: true });
  if (await save.isDisabled()) throw new Error("The completed creation flow could not be saved");
  if (await page.getByRole("region", { name: "Required decisions", exact: true }).count()) {
    throw new Error("The review still listed required decisions after every choice was completed");
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/upgrade-review-complete-${suffix}.png`, fullPage: true });
  await save.click();
  await page.getByRole("status").filter({ hasText: "Upgrade complete" }).waitFor();

  if (errors.length) throw new Error(`Browser errors (${suffix}): ${errors.join(" | ")}`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await ready();
  await completeBruteCreation(browser, { width: 390, height: 844 }, "mobile");
  await completeBruteCreation(browser, { width: 1440, height: 900 }, "desktop");
  console.log("Upgrade required-choice Playwright checks passed.");
} finally {
  await browser.close();
  stopServer();
}
