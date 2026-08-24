import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PORT = 5204;
const BASE = `http://127.0.0.1:${PORT}`;
const FIREBASE_ACCOUNT = process.env.FIREBASE_ACCOUNT ?? "simonmyhre1@gmail.com";
const firebaseExecutable = (() => {
  if (process.platform !== "win32") return { command: "firebase", args: [] };
  const shim = spawnSync("where.exe", ["firebase.cmd"], { encoding: "utf8" }).stdout?.split(/\r?\n/).find(Boolean);
  if (!shim) return { command: "firebase.cmd", args: [] };
  const installDir = dirname(shim);
  const runtime = join(installDir, "node.exe");
  return { command: existsSync(runtime) ? runtime : process.execPath, args: [join(installDir, "node_modules", "firebase-tools", "lib", "bin", "firebase.js")] };
})();
const runFirebase = (args) => spawnSync(firebaseExecutable.command, [...firebaseExecutable.args, ...args], { encoding: "utf8" });
const appsResult = runFirebase(["apps:list", "--json", "--account", FIREBASE_ACCOUNT]);
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr || appsResult.error}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = runFirebase(["apps:sdkconfig", "WEB", webApp.appId, "--json", "--account", FIREBASE_ACCOUNT]);
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

mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  await ready();
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
    });
    page.on("dialog", (dialog) => {
      errors.push(`Unexpected browser dialog: ${dialog.message()}`);
      void dialog.dismiss();
    });

    await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Hunters", exact: true }).waitFor();
    await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
    const sheet = page.getByTestId("source-character-sheet");
    await sheet.waitFor();
    for (const title of ["Identity & Abilities", "Armor & Equipment", "Equipment & Weapons", "Class Features & Feats", "Whispers & Rites", "Notes"]) {
      await sheet.getByRole("heading", { name: title, exact: true }).waitFor();
    }
    if (await sheet.getByText(/point buy|choose a class|automatic armor|upgrade available/i).count()) {
      throw new Error("Retired character automation remains visible");
    }
    const printable = sheet.getByRole("link", { name: "Printable PDF", exact: true });
    const response = await page.request.get(new URL(await printable.getAttribute("href"), BASE).href);
    if (!response.ok() || !response.headers()["content-type"]?.includes("application/pdf")) throw new Error("Printable character sheet PDF is broken");

    const name = sheet.getByLabel("Your Name", { exact: true });
    await name.fill("Eileen Source Test");
    await sheet.getByRole("status").getByText("Saved", { exact: true }).waitFor();
    await assertNoHorizontalOverflow(page, `${viewport.name} source character sheet`);
    await page.screenshot({ path: `screenshots/source-character-sheet-${viewport.name}.png`, fullPage: true });
    await sheet.getByRole("button", { name: /Hunters/ }).click();
    if (await page.getByRole("alertdialog").count()) throw new Error("The autosaving source sheet opened a discard confirmation");
    await page.getByRole("button", { name: /Open Eileen Source Test/ }).click();
    await page.getByTestId("source-character-sheet").getByLabel("Your Name", { exact: true }).waitFor();
    if (await page.getByTestId("source-character-sheet").getByLabel("Your Name", { exact: true }).inputValue() !== "Eileen Source Test") {
      throw new Error("Saved source-sheet values did not survive reopening");
    }
    await context.close();
  }
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Current source character sheet E2E passed on mobile and desktop.");
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
