import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = 5197;
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
    try { if ((await fetch(BASE)).ok) return; } catch { /* starting */ }
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
    localStorage.setItem("cs-experimental", "on");
    localStorage.setItem("cs-fighters", "on");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });

  await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Hunters" }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /Create (hunter|character)/ }).click();
  await page.getByTestId("sheet-character-automation").waitFor();
  if (await page.getByText("Build & calculate", { exact: true }).count()) {
    throw new Error("The retired calculator trigger is still visible");
  }
  const controlsAreOnSheet = await page.getByTestId("sheet-character-automation").evaluate(
    (element) => Boolean(element.closest(".papersheet .page")),
  );
  if (!controlsAreOnSheet) throw new Error("Character automation is not integrated into the white sheet");

  await page.getByTestId("sheet-class").selectOption("warden");
  await page.getByTestId("sheet-background").selectOption("criminal");
  await page.getByLabel("Perception", { exact: true }).check();
  await page.getByLabel("Survival", { exact: true }).check();
  await page.getByTestId("sheet-main-armor").selectOption("reinforced-hunter-leather-vest");

  const sheetClass = page.locator('[data-f="class"]');
  await sheetClass.waitFor();
  if (!/Warden/.test(await sheetClass.locator("option:checked").textContent())) throw new Error("Class did not fill the paper sheet");
  if (await page.locator('[data-f="level"]').inputValue() !== "1") throw new Error("New class did not default to level 1");
  if (await page.locator('[data-f="ac"]').inputValue() !== "12") throw new Error("Armor Class did not recalculate");
  if (await page.locator('[data-f="wisSaveP"]').isChecked() !== true) throw new Error("Warden Wisdom save did not fill");
  if (await page.locator('[data-f="chaSaveP"]').isChecked() !== true) throw new Error("Warden Charisma save did not fill");
  const equipmentNames = await page.locator('[data-f^="eq_"][data-f$="_0"]').evaluateAll((fields) => fields.map((field) => field.value));
  if (!equipmentNames.some((name) => /Hunter Rifle/.test(name))) throw new Error("Warden starting equipment did not fill");
  if (await page.locator('[data-f="initiative"]').inputValue() !== "+2") throw new Error("Alert did not update initiative");
  if (!(await page.locator('[data-f="hpMax"]').getAttribute("data-auto-reason"))?.includes("Hit Die")) throw new Error("Auto-filled HP has no visible reason");
  await page.getByText("0 left", { exact: true }).first().waitFor();
  await page.getByText(/The table below fills automatically/).waitFor();
  await page.screenshot({ path: "screenshots/character-automation-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Back" }).first().click();
  await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
  await page.locator('[data-f="name"]').waitFor();
  if (await page.getByTestId("legacy-conversion-wizard").count()) throw new Error("Legacy sheets still show a player-facing migration popup");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("sheet-character-automation").waitFor();
  const overflow = await page.locator(".papersheet-modal").evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  if (overflow) throw new Error("Integrated character automation causes horizontal page scrolling on mobile");
  await page.getByTestId("sheet-character-automation").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "screenshots/character-automation-mobile.png", fullPage: true });

  const retired = await context.newPage();
  await retired.goto(`${BASE}/profile?preview=user.player`, { waitUntil: "domcontentloaded" });
  await retired.locator("h1").waitFor();
  if (await retired.getByText("Experimental features", { exact: true }).count()) throw new Error("Experimental features setting is still visible");
  if (await retired.getByText("Animated fighters", { exact: true }).count()) throw new Error("Animated fighters setting is still visible");
  if (await retired.locator(".fighters").count()) throw new Error("Fighting characters still render when an old device preference is on");
  for (const route of ["play", "sessions", "party", "shop", "log", "hunter"]) {
    await retired.goto(`${BASE}/${route}?preview=user.player`, { waitUntil: "domcontentloaded" });
    await retired.waitForURL((url) => url.pathname === "/");
  }

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  console.log("Character automation Playwright checks passed.");
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
