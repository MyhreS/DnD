import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const PORT = 5198;
const BASE = process.env.BASE ?? `http://127.0.0.1:${PORT}`;
let server = null;
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

if (!process.env.BASE) {
  const appsResult = runFirebase(["apps:list", "--json", "--account", FIREBASE_ACCOUNT]);
  if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr}`);
  const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
  if (!webApp) throw new Error("No Firebase web app found");
  const configResult = runFirebase(["apps:sdkconfig", "WEB", webApp.appId, "--json", "--account", FIREBASE_ACCOUNT]);
  if (configResult.status !== 0) throw new Error(`Could not read Firebase SDK config: ${configResult.stderr}`);
  const firebase = JSON.parse(configResult.stdout).result.sdkConfig;
  const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  server = spawn(process.execPath, [viteCli, "--host", "127.0.0.1", "--port", String(PORT)], {
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
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* Vite is starting. */ }
    if (attempt === 79) throw new Error("Vite did not start");
    await sleep(250);
  }
}

mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();
const errors = [];

function watch(page) {
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

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(desktop);
  await desktop.goto(`${BASE}/codex`, { waitUntil: "domcontentloaded" });
  await desktop.getByRole("heading", { name: "Codex", exact: true }).waitFor();
  await desktop.getByText(/3 sources.*3 PDFs/).waitFor();
  await desktop.getByRole("link", { name: /Source library/ }).click();
  await desktop.waitForURL(/\/codex\/documents$/);
  await desktop.getByRole("heading", { name: "Source library", exact: true }).waitFor();
  const documents = desktop.getByTestId("codex-document");
  if (await documents.count() !== 3) throw new Error("Player source library must contain exactly three documents");
  const titles = await documents.getByRole("heading").allTextContents();
  const expectedTitles = [
    "C&S Book of the Deepcaller",
    "C&S Character Sheet",
    "C&S Whispers Sheet",
  ];
  if (JSON.stringify(titles) !== JSON.stringify(expectedTitles)) throw new Error(`Unexpected source order: ${JSON.stringify(titles)}`);
  const downloads = documents.locator("a[download]");
  if (await downloads.count() !== 3) throw new Error("Each player document must have exactly one download");
  for (const path of await downloads.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    const response = await desktop.request.get(new URL(path, BASE).href);
    if (!response.ok() || !response.headers()["content-type"]?.includes("application/pdf")) {
      throw new Error(`Broken source PDF: ${path}`);
    }
  }
  await desktop.screenshot({ path: "screenshots/codex-documents-desktop.png", fullPage: true });

  await desktop.goto(`${BASE}/codex`, { waitUntil: "domcontentloaded" });
  const search = desktop.getByLabel("Search every rule and reference");
  await search.fill("Eldritch Rebuke");
  const rebuke = desktop.getByTestId("codex-topic").filter({ hasText: "Eldritch Rebuke" }).first();
  await rebuke.getByText("2d10 Fire damage", { exact: false }).waitFor();
  await search.fill("Grit");
  await desktop.getByTestId("codex-topic").filter({ hasText: "Abilities & Skills" }).first().waitFor();
  await search.fill("Starborn Horror Behavior Table");
  await desktop.getByText(/not supplied.*does not invent/i).waitFor();
  await search.fill("Hunter Rifle");
  await desktop.getByTestId("codex-empty").waitFor();
  await search.fill("Old One Vessel");
  await desktop.getByTestId("codex-empty").waitFor();
  await desktop.screenshot({ path: "screenshots/codex-search-desktop.png", fullPage: true });

  const mobileContext = await browser.newContext({ ...devices["iPhone 13"] });
  const mobile = await mobileContext.newPage();
  watch(mobile);
  await mobile.goto(`${BASE}/codex/documents`, { waitUntil: "domcontentloaded" });
  await mobile.getByRole("heading", { name: "Source library", exact: true }).waitFor();
  if (await mobile.getByTestId("codex-document").count() !== 3) throw new Error("Mobile player source library is incomplete");
  await assertNoHorizontalOverflow(mobile, "Mobile source library");
  await mobile.screenshot({ path: "screenshots/codex-documents-mobile.png", fullPage: true });
  await mobile.goto(`${BASE}/codex`, { waitUntil: "domcontentloaded" });
  const mobileSearch = mobile.getByLabel("Search every rule and reference");
  await mobileSearch.fill("Eldritch Blast");
  const blast = mobile.getByTestId("codex-topic").filter({ hasText: "Eldritch Blast" }).first();
  await blast.getByText("ranged rite attack", { exact: false }).waitFor();
  await blast.getByText("creates two beams", { exact: false }).waitFor();
  await assertNoHorizontalOverflow(mobile, "Mobile Codex results");
  await mobile.screenshot({ path: "screenshots/codex-search-mobile.png", fullPage: true });
  await mobileContext.close();

  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Current-source Codex E2E passed: three public PDFs, hidden-source exclusion, and desktop/mobile search verified.");
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}
