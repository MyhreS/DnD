import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PORT = 5204;
const BASE = `http://127.0.0.1:${PORT}`;
const FIREBASE_ACCOUNT = process.env.FIREBASE_ACCOUNT ?? "simonmyhre1@gmail.com";
const firebaseExecutable = (() => {
  if (process.platform !== "win32") return { command: "firebase", args: [] };
  const located = spawnSync("where.exe", ["firebase.cmd"], { encoding: "utf8" });
  const shim = located.stdout?.split(/\r?\n/).find(Boolean);
  if (!shim) return { command: "firebase.cmd", args: [] };
  const installDir = dirname(shim);
  const runtime = join(installDir, "node.exe");
  return {
    command: existsSync(runtime) ? runtime : process.execPath,
    args: [join(installDir, "node_modules", "firebase-tools", "lib", "bin", "firebase.js")],
  };
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

const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  await ready();
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      localStorage.setItem("cs-theme", "light");
    });
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
    await page.getByTestId("character-sheet").waitFor();
    await page.getByRole("button", { name: /Hit points/ }).click();
    const health = page.getByRole("dialog", { name: "Health", exact: true });
    await health.getByRole("button", { name: "Decrease Hit points", exact: true }).click();
    await page.getByTestId("appsheet-edit-stage").waitFor();
    await health.getByRole("button", { name: "Back", exact: true }).click();
    await health.waitFor({ state: "detached" });
    const backToHunters = page.getByRole("button", { name: "Back to hunters", exact: true });
    await backToHunters.click();

    const confirmation = page.getByRole("alertdialog", { name: "Discard changes?", exact: true });
    await confirmation.getByText("These previewed character changes have not been applied. Closing now will leave the saved character unchanged.", { exact: true }).waitFor();
    const safeAction = confirmation.getByRole("button", { name: "Keep editing", exact: true });
    if (!await safeAction.evaluate((element) => element === document.activeElement)) {
      throw new Error(`${viewport.name} character confirmation did not focus its safe action`);
    }
    await page.locator(".confirm-dialog-backdrop").evaluate((element) => Promise.all(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    ));
    await assertNoHorizontalOverflow(page, `${viewport.name} character confirmation`);
    await page.screenshot({ path: `screenshots/character-discard-confirmation-${viewport.name}.png` });

    await safeAction.click();
    await confirmation.waitFor({ state: "detached" });
    await page.getByTestId("appsheet-edit-stage").waitFor();
    if (!await backToHunters.evaluate((element) => element === document.activeElement)) {
      throw new Error(`${viewport.name} character confirmation did not restore focus`);
    }
    await backToHunters.click();
    await page.getByRole("alertdialog", { name: "Discard changes?", exact: true })
      .getByRole("button", { name: "Discard changes", exact: true }).click();
    await page.getByRole("heading", { name: "Hunters", exact: true }).waitFor();
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    if (bodyOverflow === "hidden") {
      throw new Error(`${viewport.name} nested character confirmation left document scrolling locked`);
    }
    await context.close();
  }

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Custom confirmations E2E passed: no browser popup, safe focus, cancel/confirm behavior, restored document scrolling, and responsive character layout.");
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
