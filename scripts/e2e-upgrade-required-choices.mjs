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

async function setAbilityScore(page, ability, target) {
  const score = page.getByLabel(`${ability} base score`, { exact: true });
  let current = Number(await score.textContent());
  const button = page.getByRole("button", { name: `${target < current ? "Decrease" : "Increase"} ${ability} score`, exact: true });
  while (current !== Number(target)) {
    await button.click();
    current = Number(await score.textContent());
  }
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
  const next = page.getByRole("button", { name: "Next", exact: true });
  await page.getByRole("heading", { name: "Create hunter", exact: true }).waitFor();
  if (await page.getByTestId("view4-character-sheet").count()) {
    throw new Error("A blank character sheet appeared before guided creation finished");
  }

  await page.getByRole("heading", { name: "Name your hunter", exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("A new hunter could skip their name");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/creation-name-${suffix}.png`, fullPage: true });
  await page.getByLabel("Hunter name", { exact: true }).fill(`Brute ${suffix}`);
  await next.click();

  await page.getByRole("heading", { name: "Choose class", exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("A new hunter could skip the required class decision");
  await page.locator(".v4-upgrade-select select").selectOption("brute");
  if (await next.isDisabled()) throw new Error("The class step stayed blocked after selecting Hunter Brute");
  await next.click();

  await page.getByRole("heading", { name: "Choose background", exact: true }).waitFor();
  await page.locator(".v4-upgrade-select select").selectOption("noble");
  await next.click();

  await page.getByRole("heading", { name: "Set ability scores", exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("A new hunter could skip unspent ability points");
  const standardMethod = page.getByRole("button", { name: "Standard 27 points", exact: true });
  const maduhausuMethod = page.getByRole("button", { name: "Maduhausu 57 points", exact: true });
  if (await standardMethod.getAttribute("aria-pressed") !== "true") throw new Error("Standard point buy was not selected");
  await page.waitForTimeout(250);
  await page.locator(".v4-upgrade-step").evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: `screenshots/creation-abilities-start-${suffix}.png`, fullPage: true });
  await maduhausuMethod.click();
  if (await maduhausuMethod.getAttribute("aria-pressed") !== "true") throw new Error("Maduhausu point buy could not be selected");
  await standardMethod.click();
  for (const [ability, score] of [["Intelligence", "8"], ["Wisdom", "8"], ["Charisma", "8"], ["Strength", "15"], ["Dexterity", "15"], ["Constitution", "15"]]) {
    await setAbilityScore(page, ability, score);
  }
  await page.getByText("0 points left", { exact: true }).waitFor();
  if (await next.isDisabled()) throw new Error("The ability step stayed blocked after spending the full budget");
  await page.waitForTimeout(250);
  await page.locator(".v4-upgrade-step").evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: `screenshots/creation-abilities-${suffix}.png`, fullPage: true });
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

  await page.getByRole("heading", { name: "Armor & carrying", exact: true }).waitFor();
  await page.getByText("Carried weight", { exact: true }).waitFor();
  await page.getByText("Load effect", { exact: true }).waitFor();
  const creationEquipmentSummary = page.locator(".v4-creation-equipment .v4-equipment-summary");
  const creationSummaryPosition = await creationEquipmentSummary.evaluate((element) => getComputedStyle(element).position);
  if (creationSummaryPosition !== "static") {
    throw new Error(`The character-creation equipment summary still floats while scrolling: ${creationSummaryPosition}`);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/creation-armor-start-${suffix}.png`, fullPage: true });
  const creationLayer = page.locator('[data-page-id="create-hunter"]');
  await creationLayer.evaluate((element) => { element.dataset.mountMark = "preserved"; });
  const mainArmor = page.locator(".v4-equip-main .v4-equipment-socket");
  await mainArmor.click();
  await page.getByRole("heading", { name: "Main armor", exact: true }).waitFor();
  if (await page.locator(".v4-page-layer").count() !== 2) throw new Error("The equipment picker did not layer over its parent page");
  if (await creationLayer.getAttribute("aria-hidden") !== "true") throw new Error("The covered parent page stayed active");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator('[data-page-id^="equipment-picker-"]').evaluate((element) => {
    if (!element.classList.contains("is-exiting")) throw new Error("The nested page did not start moving down");
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `screenshots/nested-page-return-${suffix}.png`, fullPage: true });
  await page.locator('[data-page-id^="equipment-picker-"]').waitFor({ state: "detached" });
  if (await creationLayer.getAttribute("data-mount-mark") !== "preserved") throw new Error("Returning from a nested page remounted its parent");

  await mainArmor.click();
  await page.locator(".v4-slot-option-list > button").filter({ has: page.locator("strong", { hasText: /^Hunter Leather Vest$/ }) }).click();
  await page.locator('[data-page-id^="equipment-picker-"]').waitFor({ state: "detached" });
  await page.getByRole("heading", { name: "Armor & carrying", exact: true }).waitFor();
  await page.getByText("Hunter Leather Vest", { exact: true }).first().waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/creation-armor-${suffix}.png`, fullPage: true });
  await next.click();

  await page.getByRole("heading", { name: "Review your hunter", exact: true }).waitFor();
  await page.getByText("Ready to create", { exact: true }).waitFor();
  const save = creationLayer.getByRole("button", { name: "Create hunter", exact: true });
  if (await save.isDisabled()) throw new Error("The completed creation flow could not create the hunter");
  if (await page.getByRole("region", { name: "Required decisions", exact: true }).count()) {
    throw new Error("The review still listed required decisions after every choice was completed");
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/creation-review-${suffix}.png`, fullPage: true });
  await save.click();
  const sheet = page.getByTestId("view4-character-sheet");
  await sheet.waitFor();

  await sheet.locator(".v4-identity-profile").click();
  await page.getByRole("heading", { name: "Hunter & build", exact: true }).waitFor();
  if (await page.locator(".v4-hunter-build-grid select").count()) throw new Error("Creation selectors remained inside the completed character sheet");
  await page.locator(".v4-hunter-build-grid").getByText("Hunter Brute", { exact: true }).waitFor();
  const hunterBuildLayout = await page.locator(".v4-hunter-build").evaluate((element) => {
    const rectOf = (target) => {
      const rect = target.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const buildItems = [...element.querySelectorAll(".v4-hunter-build-grid > *")].map(rectOf);
    const referencePanels = [...element.querySelectorAll(".v4-hunter-feats-tools > .appsheet-panel")].map(rectOf);
    const dividers = [...element.querySelectorAll(".v4-hunter-build-value > strong, .v4-hunter-feats-tools > .appsheet-panel, .v4-reference-list, .v4-reference-list article")]
      .filter((target) => {
        const style = getComputedStyle(target);
        return Number.parseFloat(style.borderTopWidth) > 0 || Number.parseFloat(style.borderBottomWidth) > 0;
      }).length;
    return { profile: rectOf(element), buildItems, referencePanels, dividers };
  });
  const stacked = (items) => items.every((item, index) => index === 0
    || (Math.abs(item.left - items[0].left) <= 2 && item.top >= items[index - 1].bottom));
  if (!stacked(hunterBuildLayout.buildItems) || !stacked(hunterBuildLayout.referencePanels)) {
    throw new Error(`Hunter & build mixes side-by-side and stacked sections (${suffix}): ${JSON.stringify(hunterBuildLayout)}`);
  }
  if (suffix === "desktop" && (hunterBuildLayout.profile.width > 782 || hunterBuildLayout.dividers !== 0)) {
    throw new Error(`Desktop Hunter & build is not a quiet single reading column: ${JSON.stringify(hunterBuildLayout)}`);
  }
  await page.screenshot({ path: `screenshots/hunter-build-${suffix}.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await sheet.getByRole("button", { name: "Abilities", exact: true }).click();
  await page.getByRole("heading", { name: "Abilities", exact: true }).waitFor();
  if (await page.getByText("Build ability scores", { exact: true }).count()) throw new Error("The creation score builder remained inside the completed character sheet");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/creation-complete-${suffix}.png`, fullPage: true });

  await sheet.locator(".v4-identity-progress button").filter({ hasText: "Insight" }).click();
  await page.getByRole("heading", { name: "Insight & level", exact: true }).waitFor();
  for (let award = 0; award < 6; award += 1) {
    await page.getByRole("button", { name: "Increase Insight", exact: true }).click();
  }
  const progressPage = page.locator(".v4-progress-page");
  const progressLayout = await progressPage.evaluate((element) => {
    const resource = element.querySelector(".v4-resource")?.getBoundingClientRect();
    const upgrade = element.querySelector(".v4-upgrade-launch")?.getBoundingClientRect();
    if (!resource || !upgrade) throw new Error("Insight controls or upgrade action are missing");
    return {
      resource: { left: resource.left, right: resource.right, top: resource.top, bottom: resource.bottom, width: resource.width },
      upgrade: { left: upgrade.left, right: upgrade.right, top: upgrade.top, bottom: upgrade.bottom, width: upgrade.width },
    };
  });
  if (suffix === "desktop") {
    const resourceCenter = (progressLayout.resource.top + progressLayout.resource.bottom) / 2;
    const upgradeCenter = (progressLayout.upgrade.top + progressLayout.upgrade.bottom) / 2;
    const horizontalGap = progressLayout.upgrade.left - progressLayout.resource.right;
    if (Math.abs(resourceCenter - upgradeCenter) > 3 || horizontalGap < 20 || horizontalGap > 80) {
      throw new Error(`Desktop upgrade action is not aligned beside the Insight control: ${JSON.stringify(progressLayout)}`);
    }
  } else if (
    progressLayout.upgrade.top < progressLayout.resource.bottom
    || Math.abs(progressLayout.upgrade.left - progressLayout.resource.left) > 2
    || Math.abs(progressLayout.upgrade.width - progressLayout.resource.width) > 2
  ) {
    throw new Error(`Mobile upgrade action layout changed: ${JSON.stringify(progressLayout)}`);
  }
  await page.screenshot({ path: `screenshots/insight-upgrade-${suffix}.png`, fullPage: true, animations: "disabled" });
  await progressPage.locator(".v4-upgrade-launch").click();
  await page.locator('.v4-page-stack[data-panel="upgrade"]').waitFor();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await progressPage.waitFor();

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
