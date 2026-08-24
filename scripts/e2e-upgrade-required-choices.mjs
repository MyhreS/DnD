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
  const score = page.getByLabel(`${ability} starting score`, { exact: true });
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
  if (await page.getByTestId("character-sheet").count()) {
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
  await page.locator(".character-sheet-upgrade-select select").selectOption("brute");
  if (await next.isDisabled()) throw new Error("The class step stayed blocked after selecting Hunter Brute");
  await next.click();

  await page.getByRole("heading", { name: "Choose background", exact: true }).waitFor();
  await page.locator(".character-sheet-upgrade-select select").selectOption("noble");
  await next.click();

  await page.getByRole("heading", { name: "Set ability scores", exact: true }).waitFor();
  await page.getByText("The supplied character sheet does not prescribe a score-generation method", { exact: false }).waitFor();
  if (await page.getByText(/Standard|Maduhausu|points left/i).count()) throw new Error("A removed ability-score method is still visible");
  if (await next.isDisabled()) throw new Error("Direct ability scores were incorrectly blocked by a removed budget");
  await page.waitForTimeout(250);
  await page.locator(".character-sheet-upgrade-step").evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: `screenshots/creation-abilities-start-${suffix}.png`, fullPage: true });
  for (const [ability, score] of [["Intelligence", "9"], ["Wisdom", "8"], ["Charisma", "8"], ["Strength", "17"], ["Dexterity", "15"], ["Constitution", "15"]]) {
    await setAbilityScore(page, ability, score);
  }
  await page.waitForTimeout(250);
  await page.locator(".character-sheet-upgrade-step").evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: `screenshots/creation-abilities-${suffix}.png`, fullPage: true });
  await next.click();
  await page.getByRole("heading", { name: "Class skills", exact: true }).waitFor();
  await page.getByText("Climb, jump, grapple, escape physical holds, and force obstacles.", { exact: true }).waitFor();
  await page.getByText("+3 now; +5 trained", { exact: true }).waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/class-skill-guidance-${suffix}.png`, fullPage: true });
  await page.getByLabel("Athletics", { exact: true }).check();
  await page.getByLabel("Perception", { exact: true }).check();
  await next.click();

  await page.getByRole("heading", { name: "Weapon mastery", exact: true }).waitFor();
  await page.getByText("3 weapons needed", { exact: true }).waitFor();
  await page.getByText("Mastery unlocks the special effect shown for each one", { exact: false }).waitFor();
  await page.getByText("On a miss, deal damage equal to the ability modifier", { exact: false }).waitFor();
  await page.getByText("After a melee hit, make one extra attack", { exact: false }).waitFor();
  await page.getByText("On a hit, the target has Disadvantage on its next attack", { exact: false }).waitFor();
  await page.getByText("DM-set", { exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("Weapon Mastery could be skipped with three choices missing");
  const masteryOverflow = await page.locator(".character-sheet-upgrade-step").evaluate((element) => element.scrollWidth > element.clientWidth);
  if (masteryOverflow) throw new Error(`Weapon Mastery guidance overflows the ${suffix} creation page`);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/upgrade-required-choices-${suffix}.png`, fullPage: true });
  await page.locator(".character-sheet-upgrade-step").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: `screenshots/weapon-mastery-bottom-${suffix}.png`, fullPage: true });
  await page.locator(".character-sheet-upgrade-step").evaluate((element) => { element.scrollTop = 0; });
  await page.getByLabel(/^Greatsword/).check();
  await page.getByLabel(/^Greataxe/).check();
  await page.getByLabel(/^Longsword/).check();
  await page.getByText("3 / 3 chosen", { exact: true }).waitFor();
  if (!await page.getByLabel("Shortsword", { exact: true }).isDisabled()) throw new Error("A fourth Weapon Mastery choice remained enabled");
  await page.screenshot({ path: `screenshots/weapon-mastery-selected-${suffix}.png`, fullPage: true });
  if (await next.isDisabled()) throw new Error("Weapon Mastery stayed blocked after three selections");
  await next.click();

  await page.getByRole("heading", { name: "Fighting Style", exact: true }).waitFor();
  if (!await next.isDisabled()) throw new Error("The level-one Fighting Style choice was not required");
  await page.locator(".character-sheet-upgrade-select select").selectOption({ label: "Defense" });
  if (await next.isDisabled()) throw new Error("Fighting Style stayed blocked after choosing Defense");
  await next.click();

  await page.getByRole("heading", { name: "Armor & carrying", exact: true }).waitFor();
  await page.getByText("Carried weight", { exact: true }).waitFor();
  await page.getByText("Load effect", { exact: true }).waitFor();
  const creationEquipmentSummary = page.locator(".character-sheet-creation-equipment .character-sheet-equipment-summary");
  const creationSummaryPosition = await creationEquipmentSummary.evaluate((element) => getComputedStyle(element).position);
  if (creationSummaryPosition !== "static") {
    throw new Error(`The character-creation equipment summary still floats while scrolling: ${creationSummaryPosition}`);
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/creation-armor-start-${suffix}.png`, fullPage: true });
  const creationLayer = page.locator('[data-page-id="create-hunter"]');
  await creationLayer.evaluate((element) => { element.dataset.mountMark = "preserved"; });
  const mainArmor = page.locator(".character-sheet-equip-main .character-sheet-equipment-socket");
  await mainArmor.click();
  await page.getByRole("heading", { name: "Main armor", exact: true }).waitFor();
  if (await page.locator(".character-sheet-page-layer").count() !== 2) throw new Error("The equipment picker did not layer over its parent page");
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
  await page.locator(".character-sheet-slot-option-list > button").filter({ has: page.locator("strong", { hasText: /^Hunter Leather Vest$/ }) }).click();
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
  const sheet = page.getByTestId("character-sheet");
  await sheet.waitFor();

  await sheet.locator(".character-sheet-identity-profile").click();
  await page.getByRole("heading", { name: "Hunter & build", exact: true }).waitFor();
  if (await page.locator(".character-sheet-hunter-build-grid select").count()) throw new Error("Creation selectors remained inside the completed character sheet");
  await page.locator(".character-sheet-hunter-build-grid").getByText("Hunter Brute", { exact: true }).waitFor();
  const hunterBuildLayout = await page.locator(".character-sheet-hunter-build").evaluate((element) => {
    function rect(target) {
      const bounds = target.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width };
    }
    const name = element.querySelector(".character-sheet-hunter-name");
    const nameInput = element.querySelector(".character-sheet-hunter-name input");
    const fields = [...element.querySelectorAll(".character-sheet-hunter-build-value")];
    const fieldValues = fields.map((field) => field.querySelector("strong"));
    const panels = [...element.querySelectorAll(".character-sheet-hunter-feats-tools > .appsheet-panel")];
    const referenceLists = [...element.querySelectorAll(".character-sheet-reference-list")];
    const articles = [...element.querySelectorAll(".character-sheet-reference-list article")];
    if (!name || !nameInput || fieldValues.some((value) => !value)) throw new Error("Hunter build fields are incomplete");
    return {
      width: element.getBoundingClientRect().width,
      sections: [name, ...fields, ...panels].map(rect),
      dividers: [
        getComputedStyle(nameInput).borderBottomWidth,
        ...fieldValues.map((value) => getComputedStyle(value).borderBottomWidth),
        ...panels.map((panel) => getComputedStyle(panel).borderBottomWidth),
        ...referenceLists.map((list) => getComputedStyle(list).borderTopWidth),
        ...articles.map((article) => getComputedStyle(article).borderBottomWidth),
      ],
    };
  });
  for (let index = 1; index < hunterBuildLayout.sections.length; index += 1) {
    const previous = hunterBuildLayout.sections[index - 1];
    const current = hunterBuildLayout.sections[index];
    if (current.top < previous.bottom || Math.abs(current.left - previous.left) > 2 || Math.abs(current.width - previous.width) > 2) {
      throw new Error(`${suffix} Hunter & build sections are not one ordered column: ${JSON.stringify(hunterBuildLayout.sections)}`);
    }
  }
  if (suffix === "desktop") {
    if (hunterBuildLayout.width > 700) throw new Error(`Desktop Hunter & build content is too wide: ${hunterBuildLayout.width}`);
    if (hunterBuildLayout.dividers.some((width) => width !== "0px")) {
      throw new Error(`Desktop Hunter & build still has content dividers: ${JSON.stringify(hunterBuildLayout.dividers)}`);
    }
  }
  await page.screenshot({ path: `screenshots/hunter-build-${suffix}.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await sheet.getByRole("button", { name: "Abilities", exact: true }).click();
  await page.getByRole("heading", { name: "Abilities", exact: true }).waitFor();
  if (await page.getByText("Build ability scores", { exact: true }).count()) throw new Error("The creation score builder remained inside the completed character sheet");
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await sheet.locator(".character-sheet-vitals button").filter({ hasText: "Sanity" }).click();
  await page.getByRole("heading", { name: "Sanity", exact: true }).waitFor();
  await page.getByText("Tracked separately from Sanity.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Increase Madness", exact: true }).click();
  await page.getByTestId("appsheet-edit-stage").getByText("Madness", { exact: true }).waitFor();
  await page.screenshot({ path: `screenshots/sanity-independent-${suffix}.png`, fullPage: true, animations: "disabled" });
  await page.getByTestId("appsheet-edit-stage").getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await sheet.getByRole("button", { name: "Resources", exact: true }).click();
  await page.getByRole("heading", { name: "Resources", exact: true }).waitFor();
  await page.getByText("Sanity dice", { exact: true }).waitFor();
  await page.getByText("2d6", { exact: true }).waitFor();
  await page.screenshot({ path: `screenshots/source-sheet-values-${suffix}.png`, fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/creation-complete-${suffix}.png`, fullPage: true });

  await sheet.locator(".character-sheet-identity-progress button").filter({ hasText: "Insight" }).click();
  await page.getByRole("heading", { name: "Insight & level", exact: true }).waitFor();
  for (let award = 0; award < 6; award += 1) {
    await page.getByRole("button", { name: "Increase Insight", exact: true }).click();
  }
  const progressPage = page.locator(".character-sheet-progress-page");
  const progressLayout = await progressPage.evaluate((element) => {
    const resource = element.querySelector(".character-sheet-resource")?.getBoundingClientRect();
    const upgrade = element.querySelector(".character-sheet-upgrade-launch")?.getBoundingClientRect();
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
  await progressPage.locator(".character-sheet-upgrade-launch").click();
  await page.locator('.character-sheet-page-stack[data-panel="upgrade"]').waitFor();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await progressPage.waitFor();

  if (errors.length) throw new Error(`Browser errors (${suffix}): ${errors.join(" | ")}`);
  await context.close();
}

async function inspectExpertiseGuidance(browser, viewport, suffix) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
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

  await page.getByLabel("Hunter name", { exact: true }).fill(`Stalker ${suffix}`);
  await next.click();
  await page.locator(".character-sheet-upgrade-select select").selectOption("stalker");
  await next.click();
  await page.locator(".character-sheet-upgrade-select select").selectOption("criminal");
  await next.click();
  for (const [ability, score] of [["Intelligence", "8"], ["Wisdom", "8"], ["Charisma", "8"], ["Strength", "15"], ["Dexterity", "15"], ["Constitution", "15"]]) {
    await setAbilityScore(page, ability, score);
  }
  await next.click();

  await page.getByRole("heading", { name: "Class skills", exact: true }).waitFor();
  if (!await page.getByLabel("Stealth", { exact: true }).isDisabled()) throw new Error("A background skill could be chosen again as a class skill");
  await page.getByText("From Criminal", { exact: true }).first().waitFor();
  await page.getByLabel("Athletics", { exact: true }).check();
  await page.getByLabel("Perception", { exact: true }).check();
  await page.waitForTimeout(100);
  await page.screenshot({ path: `screenshots/class-skill-guidance-selected-${suffix}.png`, fullPage: true });
  await next.click();

  await page.getByRole("heading", { name: "Choose Expertise", exact: true }).waitFor();
  await page.getByText("Expertise adds your +2 proficiency bonus a second time.", { exact: false }).waitFor();
  await page.getByText("+4 trained to +6 expert", { exact: true }).first().waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `screenshots/expertise-guidance-${suffix}.png`, fullPage: true });
  await page.getByLabel("Stealth", { exact: true }).check();
  await page.getByLabel("Perception", { exact: true }).check();
  if (await next.isDisabled()) throw new Error("Expertise stayed blocked after the required choices");
  const horizontalOverflow = await page.locator(".character-sheet-upgrade-step").evaluate((element) => element.scrollWidth > element.clientWidth);
  if (horizontalOverflow) throw new Error(`Expertise guidance overflows the ${suffix} creation page`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `screenshots/expertise-guidance-selected-${suffix}.png`, fullPage: true });
  if (errors.length) throw new Error(`Browser errors (${suffix} expertise): ${errors.join(" | ")}`);
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await ready();
  await completeBruteCreation(browser, { width: 390, height: 844 }, "mobile");
  await completeBruteCreation(browser, { width: 1440, height: 900 }, "desktop");
  await inspectExpertiseGuidance(browser, { width: 390, height: 844 }, "mobile");
  await inspectExpertiseGuidance(browser, { width: 1440, height: 900 }, "desktop");
  console.log("Upgrade required-choice Playwright checks passed.");
} finally {
  await browser.close();
  stopServer();
}
