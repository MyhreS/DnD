import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PORT = 5202;
const BASE = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = process.env.E2E_SCREENSHOT_DIR;
if (SCREENSHOT_DIR) await mkdir(SCREENSHOT_DIR, { recursive: true });
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

const viewports = [
  { name: "narrow", width: 320, height: 568 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
];
const privateRoutes = ["/", "/character", "/game", "/codex", "/codex/documents", "/profile", "/status"];
const publicRoutes = ["/", "/codex", "/codex/documents"];
const privateExpected = {
  "/": "Welcome",
  "/character": "Hunters",
  "/game": "The Sunless Vault",
  "/codex": "Codex",
  "/codex/documents": "Source library",
  "/profile": "Profile",
  "/status": "Between hunts",
};
const publicExpected = {
  "/": "Continue with Google",
  "/codex": "Codex",
  "/codex/documents": "Source library",
};
const errors = [];

async function capture(page, name) {
  if (!SCREENSHOT_DIR) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${slug}.png`) });
}

function watch(page, label) {
  page.on("pageerror", (error) => errors.push(`${label}: page error: ${String(error)}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      errors.push(`${label}: console error: ${message.text()}`);
    }
  });
}

async function auditPage(page, label, mobile) {
  const report = await page.evaluate(({ checkMobileFonts }) => {
    const root = document.getElementById("root");
    const viewportWidth = document.documentElement.clientWidth;
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const clipped = [...document.querySelectorAll("body *")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className.slice(0, 80) : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
        };
      })
      .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
      .slice(0, 8);
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const smallFormControls = checkMobileFonts
      ? [...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea')]
        .filter(visible)
        .map((element) => ({
          name: element.getAttribute("aria-label") || element.getAttribute("name") || element.id || element.tagName,
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        }))
        .filter((item) => item.fontSize < 16)
      : [];
    return {
      rootTextLength: (root?.innerText ?? "").trim().length,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth,
      clipped,
      duplicateIds,
      smallFormControls,
    };
  }, { checkMobileFonts: mobile });

  if (report.rootTextLength === 0) errors.push(`${label}: blank app root`);
  if (report.documentWidth > report.viewportWidth || report.bodyWidth > report.viewportWidth) {
    errors.push(`${label}: horizontal overflow ${JSON.stringify(report)}`);
  }
  if (report.clipped.length > 0) errors.push(`${label}: clipped visible content ${JSON.stringify(report.clipped)}`);
  if (report.duplicateIds.length > 0) errors.push(`${label}: duplicate IDs ${report.duplicateIds.join(", ")}`);
  if (report.smallFormControls.length > 0) {
    errors.push(`${label}: mobile form controls below 16px ${JSON.stringify(report.smallFormControls.slice(0, 8))}`);
  }
}

async function openPreviewHunter(page) {
  await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
  await page.getByTestId("app-character-sheet").waitFor();
  await page.getByTestId("character-sheet").waitFor();
}

async function auditCharacterPanels(page, viewport) {
  await openPreviewHunter(page);
  await capture(page, `${viewport.name}-character-home`);
  const root = page.getByTestId("character-sheet");
  const launches = [
    { title: "Hunter & build", button: root.locator(".character-sheet-identity-profile") },
    { title: "Abilities", button: root.getByRole("navigation", { name: "Character sheet sections" }).getByRole("button", { name: "Abilities", exact: true }) },
    { title: "Skills", button: root.getByRole("navigation", { name: "Character sheet sections" }).getByRole("button", { name: "Skills", exact: true }) },
    { title: "Class abilities", button: root.getByRole("navigation", { name: "Character sheet sections" }).getByRole("button", { name: "Class abilities", exact: true }) },
    { title: "Armor Class", button: root.getByRole("region", { name: "At a glance" }).getByRole("button", { name: /AC/ }) },
    { title: "Speed", button: root.getByRole("region", { name: "At a glance" }).getByRole("button", { name: /Speed/ }) },
    { title: "Passive Perception", button: root.getByRole("region", { name: "At a glance" }).getByRole("button", { name: /Passive/ }) },
    { title: "Initiative", button: root.getByRole("region", { name: "At a glance" }).getByRole("button", { name: /Initiative/ }) },
    { title: "Inventory", button: root.getByRole("region", { name: "Current resources" }).getByRole("button", { name: /Inventory/ }) },
    { title: "Notes", button: root.getByRole("navigation", { name: "Character sheet sections" }).getByRole("button", { name: "Notes", exact: true }) },
    { title: "Equipment", button: root.getByRole("button", { name: "Open equipment slots", exact: true }) },
    { title: "Health", button: root.getByRole("region", { name: "Current resources" }).getByRole("button", { name: /Hit points/ }) },
    { title: "Sanity", button: root.getByRole("region", { name: "Current resources" }).getByRole("button", { name: /Sanity/ }) },
    { title: "Insight & level", button: root.locator(".character-sheet-identity-progress button").first() },
    { title: "Resources", button: root.getByRole("navigation", { name: "Character sheet sections" }).getByRole("button", { name: "Resources", exact: true }) },
  ];

  for (const launch of launches) {
    await launch.button.click();
    const dialog = page.locator('.character-sheet-page-stack[role="dialog"]');
    await dialog.getByRole("heading", { name: launch.title, exact: true }).first().waitFor();
    await page.waitForTimeout(400);
    await auditPage(page, `${viewport.name} character/${launch.title}`, viewport.width <= 390);
    await capture(page, `${viewport.name}-character-${launch.title}`);
    await dialog.getByRole("button", { name: "Back", exact: true }).first().click();
    await dialog.waitFor({ state: "detached" });
  }

  await root.locator(".character-sheet-identity-progress button").first().click();
  const progress = page.locator('.character-sheet-page-stack[data-panel="progress"]');
  const upgrade = progress.getByRole("button", { name: /Upgrade character/ });
  if (await upgrade.isEnabled()) {
    await upgrade.click();
    const dialog = page.locator('.character-sheet-page-stack[data-panel="upgrade"]');
    await dialog.getByRole("heading", { name: "Upgrade character", exact: true }).waitFor();
    await page.waitForTimeout(400);
    await auditPage(page, `${viewport.name} character/Upgrade character`, viewport.width <= 390);
    await capture(page, `${viewport.name}-character-upgrade`);
  }
}

await ready();
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const privateContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const privatePage = await privateContext.newPage();
    watch(privatePage, `private/${viewport.name}`);
    for (const route of privateRoutes) {
      await privatePage.goto(`${BASE}${route}?preview=user.player`, { waitUntil: "domcontentloaded" });
      await privatePage.getByText(privateExpected[route], { exact: route !== "/" }).first().waitFor();
      if (route === "/profile") {
        await privatePage.getByText("Appearance", { exact: true }).waitFor();
        const profileCards = await privatePage.locator(".reading > .card > .eyebrow").allTextContents();
        if (JSON.stringify(profileCards) !== JSON.stringify(["Your name", "Appearance", "App"])) {
          errors.push(`${viewport.name} /profile: unexpected settings cards: ${JSON.stringify(profileCards)}`);
        }
      }
      await privatePage.evaluate(() => document.fonts.ready);
      await auditPage(privatePage, `${viewport.name} ${route}`, viewport.width <= 390);
      if (viewport.name === "mobile" || viewport.name === "desktop") await capture(privatePage, `${viewport.name}-route-${route}`);
    }
    if (viewport.width <= 390) {
      await openPreviewHunter(privatePage);
      await auditPage(privatePage, `${viewport.name} character sheet`, true);
    }
    if (viewport.name === "mobile" || viewport.name === "desktop") {
      await auditCharacterPanels(privatePage, viewport);
    }
    await privateContext.close();

    const publicContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const publicPage = await publicContext.newPage();
    watch(publicPage, `public/${viewport.name}`);
    for (const route of publicRoutes) {
      await publicPage.goto(`${BASE}${route}?preview=off`, { waitUntil: "domcontentloaded" });
      await publicPage.getByText(publicExpected[route], { exact: true }).first().waitFor();
      await publicPage.evaluate(() => document.fonts.ready);
      await auditPage(publicPage, `${viewport.name} public ${route}`, viewport.width <= 390);
    }
    await publicContext.close();
  }

  if (errors.length > 0) throw new Error(`App audit found ${errors.length} issue(s):\n${[...new Set(errors)].join("\n")}`);
  console.log(`App edge audit passed: ${viewports.length} viewports, ${privateRoutes.length} authenticated routes, ${publicRoutes.length} public routes, and every Hunter panel on mobile + desktop.`);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
