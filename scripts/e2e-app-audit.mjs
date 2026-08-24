import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const PORT = 5202;
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
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = runFirebase(["apps:sdkconfig", "WEB", webApp.appId, "--json", "--account", FIREBASE_ACCOUNT]);
if (configResult.status !== 0) throw new Error(`Could not read Firebase SDK config: ${configResult.stderr}`);
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
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.left >= -1 && rect.right <= viewportWidth + 1) return false;
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const overflowX = getComputedStyle(ancestor).overflowX;
          if ((overflowX === "auto" || overflowX === "scroll") && ancestor.scrollWidth > ancestor.clientWidth) return false;
        }
        return true;
      })
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
      await privatePage.evaluate(() => document.fonts.ready);
      await auditPage(privatePage, `${viewport.name} ${route}`, viewport.width <= 390);
    }
    if (viewport.width <= 390) {
      await privatePage.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
      await privatePage.getByRole("button", { name: /Open Eileen the Crow/ }).click();
      await privatePage.getByTestId("source-character-sheet").waitFor();
      await auditPage(privatePage, `${viewport.name} current character sheet`, true);
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
  console.log(`App edge audit passed: ${viewports.length} viewports, ${privateRoutes.length} authenticated routes, and ${publicRoutes.length} public routes.`);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
