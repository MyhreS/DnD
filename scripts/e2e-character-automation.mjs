import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = Number(process.env.E2E_PORT ?? 5197);
const BASE = `http://127.0.0.1:${PORT}`;
const firebaseArgs = ["--project", "dandd-ea955", "--account", "simonmyhre1@gmail.com"];
const appsResult = spawnSync("firebase", ["apps:list", ...firebaseArgs, "--json"], { encoding: "utf8" });
if (appsResult.status !== 0) throw new Error(`Could not read Firebase app config: ${appsResult.stderr}`);
const webApp = JSON.parse(appsResult.stdout).result.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("No Firebase web app found");
const configResult = spawnSync("firebase", ["apps:sdkconfig", "WEB", webApp.appId, ...firebaseArgs, "--json"], { encoding: "utf8" });
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
    localStorage.setItem("cs-theme", "light");
  });
  const page = await context.newPage();
  let capturedViewMenuDesktop = false;
  async function openAppDisclosure(title) {
    const disclosure = page.locator(".appsheet-disclosure").filter({ has: page.getByText(title, { exact: true }) }).first();
    await disclosure.waitFor();
    if (!await disclosure.evaluate((element) => element.open)) {
      await disclosure.locator(":scope > summary").click();
    }
    return disclosure;
  }
  async function openAppSection(title) {
    const section = page.locator(".appsheet-section").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).first();
    await section.waitFor();
    if (!await section.evaluate((element) => element.open)) {
      await section.locator(":scope > summary").click();
    }
    return section;
  }
  async function selectCharacterView(label) {
    const trigger = page.getByRole("button", { name: "Choose character view", exact: true });
    if (await trigger.count() !== 1) throw new Error("Character sheet must expose one view-menu trigger");
    await trigger.click();
    if (await trigger.getAttribute("aria-expanded") !== "true") throw new Error("Character view menu did not report its open state");
    const menu = page.getByRole("menu", { name: "Character sheet views", exact: true });
    const labels = await menu.getByRole("menuitemradio").allTextContents();
    if (JSON.stringify(labels) !== JSON.stringify(["View 3", "View 4"])) {
      throw new Error(`Character view menu labels or ordering changed: ${JSON.stringify(labels)}`);
    }
    if (!capturedViewMenuDesktop) {
      await page.locator(".papersheet-toolbar").screenshot({ path: "screenshots/character-view-menu-desktop.png" });
      capturedViewMenuDesktop = true;
    }
    await menu.getByRole("menuitemradio", { name: label, exact: true }).click();
  }
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });

  await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Hunters" }).waitFor({ timeout: 20000 });
  await page.evaluate(async () => {
    const modulePath = "/src/app/" + "pwaUpdates.ts";
    const { usePwaUpdate } = await import(modulePath);
    usePwaUpdate.setState({
      needRefresh: true,
      update: () => { document.body.dataset.updateApplied = "true"; },
    });
  });
  const updateNotice = page.getByTestId("app-update-notice");
  await updateNotice.getByText("New update available", { exact: true }).waitFor();
  await updateNotice.getByText("Refresh", { exact: true }).waitFor();
  await page.screenshot({ path: "screenshots/update-notice-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  const updateNoticeBounds = await updateNotice.boundingBox();
  if (!updateNoticeBounds || updateNoticeBounds.x < 0 || updateNoticeBounds.x + updateNoticeBounds.width > 390) {
    throw new Error("Update notice overflows the mobile viewport");
  }
  await page.screenshot({ path: "screenshots/update-notice-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const routeBeforeUpdate = page.url();
  await updateNotice.click();
  await updateNotice.getByText("Refreshing…", { exact: true }).waitFor();
  if (await page.locator("body").getAttribute("data-update-applied") !== "true") {
    throw new Error("Update notice did not apply the waiting update");
  }
  if (page.url() !== routeBeforeUpdate) throw new Error("Update notice changed the current route");
  await page.evaluate(async () => {
    const modulePath = "/src/app/" + "pwaUpdates.ts";
    const { usePwaUpdate } = await import(modulePath);
    usePwaUpdate.setState({ needRefresh: false });
  });
  await page.screenshot({ path: "screenshots/hunter-list-desktop.png", fullPage: true });
  await page.getByRole("button", { name: /Create (hunter|character)/ }).click();
  await page.getByTestId("app-character-sheet").waitFor();
  if (await page.getByText("Build & calculate", { exact: true }).count()) {
    throw new Error("The retired calculator trigger is still visible");
  }
  if (await page.getByText("Choose armor", { exact: true }).count()) {
    throw new Error("Armor still renders in a duplicate chooser section");
  }
  await page.getByTestId("appsheet-name").fill("App Warden");
  await page.getByTestId("appsheet-class").selectOption("warden");
  await page.getByTestId("appsheet-class").selectOption("deepcaller");
  const classAbilities = await openAppDisclosure("Class abilities");
  await classAbilities.getByText("Eldritch Comprehension", { exact: true }).waitFor();
  if (await classAbilities.getByText("Braced Mind", { exact: true }).count() !== 0) {
    throw new Error("Class abilities included a feature above the acquired level");
  }
  const eldritchComprehension = classAbilities.locator(".appsheet-feature-timeline details").filter({ has: page.getByText("Eldritch Comprehension", { exact: true }) });
  await eldritchComprehension.locator(":scope > summary").click();
  await eldritchComprehension.getByText("forbidden knowledge", { exact: false }).waitFor();
  await classAbilities.screenshot({ path: "screenshots/class-abilities-overview-desktop.png" });
  const sanityDie = page.getByTestId("appsheet-sanity-die");
  if (await sanityDie.locator("strong").textContent() !== "1d20") throw new Error("Deepcaller Sanity Die was not derived in the overview");
  await sanityDie.getByLabel("Why this value is automatic").click();
  if (!(await sanityDie.textContent())?.includes("Deepcaller core traits")) throw new Error("Sanity Die did not explain its automatic class source");
  await page.locator(".appsheet-current-state").screenshot({ path: "screenshots/sanity-die-overview-desktop.png" });
  const strains = page.getByTestId("appsheet-strains");
  await strains.waitFor();
  if (await strains.getByRole("status", { name: "Strains left" }).textContent() !== "2") throw new Error("Level-one Deepcaller did not receive two available Strains");
  if (!await strains.getByText("2 available · level 1 Strains", { exact: true }).count()) throw new Error("Deepcaller strain allowance was not shown in the overview");
  await strains.getByRole("button", { name: "Decrease Strains left" }).click();
  if (await strains.getByRole("status", { name: "Strains left" }).textContent() !== "1") throw new Error("Deepcaller could not record an expended Strain");
  const riteReference = await openAppDisclosure("Rites & Whispers");
  await riteReference.getByText("Rites available with level 1 Strains", { exact: true }).waitFor();
  if (await riteReference.getByText("Eldritch Rebuke", { exact: true }).count() !== 1) throw new Error("Deepcaller level-one Rites were not shown in the overview");
  if (await riteReference.getByText("Darkness", { exact: true }).count() !== 0) throw new Error("Deepcaller overview showed a Rite above the current Strain level");
  const rebuke = riteReference.locator(".appsheet-rite-reference").filter({ has: page.getByText("Eldritch Rebuke", { exact: true }) });
  await rebuke.locator(":scope > summary").click();
  await rebuke.getByText("2d10", { exact: true }).waitFor();
  await rebuke.getByText("Fire", { exact: true }).waitFor();
  await openAppSection("Features & choices");
  const preparedWhispers = await openAppDisclosure("Class choices");
  const blastChoice = preparedWhispers.getByLabel("Eldritch Blast");
  await blastChoice.check();
  await preparedWhispers.getByText("1 × 1d10 Eldritch Power · 120 feet", { exact: true }).waitFor();
  await page.screenshot({ path: "screenshots/deepcaller-strains-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await classAbilities.screenshot({ path: "screenshots/class-abilities-overview-mobile.png" });
  if (await classAbilities.evaluate((element) => element.scrollWidth > element.clientWidth)) {
    throw new Error("Class abilities overflow the mobile viewport");
  }
  await page.locator(".appsheet-current-state").screenshot({ path: "screenshots/sanity-die-overview-mobile.png" });
  await strains.screenshot({ path: "screenshots/deepcaller-strains-mobile.png" });
  await riteReference.screenshot({ path: "screenshots/deepcaller-rites-mobile.png" });
  const strainOverflow = await strains.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (strainOverflow) throw new Error("Deepcaller Strain controls overflow the mobile viewport");
  const ritesOverflow = await riteReference.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (ritesOverflow) throw new Error("Deepcaller Rite reference overflows the mobile viewport");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Increase level" }).click();
  await page.getByRole("button", { name: "Increase level" }).click();
  const deepcallerPath = page.getByTestId("appsheet-subclass");
  if (await deepcallerPath.inputValue() !== "") throw new Error("Level-three Deepcaller should continue on the core path by default");
  if (!await deepcallerPath.getByRole("option", { name: "Continue as Deepcaller", exact: true }).count()) throw new Error("Level-three Deepcaller is missing the option to continue their core path");
  if (!await deepcallerPath.getByRole("option", { name: "Hunter Zealot", exact: true }).count()) throw new Error("Level-three Deepcaller is missing the Zealot path option");
  await page.getByRole("button", { name: "Apply changes" }).click();
  if (await page.getByText("Choose 1 Deepcaller path", { exact: true }).count()) throw new Error("Continuing as a level-three Deepcaller should not create a required subclass decision");
  await page.screenshot({ path: "screenshots/deepcaller-level-three-path-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "screenshots/deepcaller-level-three-path-mobile.png", fullPage: true });
  if (await page.locator(".appsheet-identity-panel").evaluate((element) => element.scrollWidth > element.clientWidth)) throw new Error("Deepcaller path choice overflows the mobile viewport");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await deepcallerPath.selectOption("hunter-zealot");
  await page.getByRole("button", { name: "Apply changes" }).click();
  const zealotAbilities = await openAppDisclosure("Class abilities");
  await zealotAbilities.getByText("Burn the Book", { exact: true }).waitFor();
  await page.getByTestId("appsheet-class").selectOption("warden");
  const weaponReference = await openAppDisclosure("Weapons");
  await weaponReference.getByText("Hunter Rifle", { exact: true }).waitFor();
  const rifleReference = weaponReference.locator(".appsheet-weapon-reference").filter({ has: page.getByText("Hunter Rifle", { exact: true }) });
  await rifleReference.locator(":scope > summary").click();
  await rifleReference.getByText("1d10", { exact: true }).waitFor();
  await rifleReference.getByText("Piercing", { exact: true }).waitFor();
  await rifleReference.getByText("Damage roll", { exact: true }).waitFor();
  await weaponReference.screenshot({ path: "screenshots/weapon-reference-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await weaponReference.screenshot({ path: "screenshots/weapon-reference-mobile.png" });
  if (await weaponReference.evaluate((element) => element.scrollWidth > element.clientWidth)) {
    throw new Error("Weapon reference overflows the mobile viewport");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await selectCharacterView("View 3");
  const appViewTwo = page.getByTestId("app-character-sheet-2");
  await appViewTwo.waitFor();
  await appViewTwo.getByText("App Warden", { exact: true }).waitFor();
  await appViewTwo.getByText("Hunter Rifle", { exact: true }).waitFor();
  await appViewTwo.getByRole("button", { name: "Decrease HP" }).click();
  await page.getByTestId("appsheet-edit-stage").waitFor();
  await appViewTwo.screenshot({ path: "screenshots/app-character-sheet-2-desktop.png" });
  await appViewTwo.getByRole("button", { name: "Gear" }).click();
  const quickGear = appViewTwo.locator(".appsheet-quick-gear");
  await quickGear.getByRole("heading", { name: "Gear & carrying" }).waitFor();
  await quickGear.getByTestId("appsheet-inventory").getByText("Hunter Rifle", { exact: true }).waitFor();
  if (await quickGear.getByTestId("appsheet-inventory-add").count()) throw new Error("View 3 unexpectedly uses the View 2 inventory Add menu");
  if (await quickGear.getByTestId("appsheet-catalog-picker").count() !== 1) throw new Error("View 3 lost its rules-library picker");
  if (await quickGear.getByText("Record a unique item", { exact: true }).count() !== 1) throw new Error("View 3 lost its unique-item disclosure");
  const carryingCustomization = await openAppDisclosure("Carrying customization");
  await carryingCustomization.getByTestId("warden-carrying-figure").waitFor();
  await carryingCustomization.getByRole("heading", { name: "Slot assignment", exact: true }).waitFor();
  await carryingCustomization.screenshot({ path: "screenshots/app-character-sheet-2-carrying-desktop.png" });
  await quickGear.screenshot({ path: "screenshots/app-character-sheet-2-gear-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  const appViewTwoOverflow = await quickGear.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (appViewTwoOverflow) throw new Error("App view 2 overflows the mobile viewport");
  await carryingCustomization.scrollIntoViewIfNeeded();
  await carryingCustomization.screenshot({ path: "screenshots/app-character-sheet-2-carrying-mobile.png" });
  await quickGear.screenshot({ path: "screenshots/app-character-sheet-2-gear-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.once("dialog", (dialog) => dialog.accept());
  await selectCharacterView("View 2");
  await page.getByTestId("appsheet-background").selectOption("criminal");
  const appBackgroundDetails = page.getByTestId("background-details").first();
  await appBackgroundDetails.getByRole("heading", { name: "Criminal" }).waitFor();
  if (!await appBackgroundDetails.getByText("Sleight of Hand, Stealth", { exact: true }).count()) {
    throw new Error("Selected app background did not show its proficiencies");
  }
  await appBackgroundDetails.screenshot({ path: "screenshots/background-details-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await appBackgroundDetails.screenshot({ path: "screenshots/background-details-mobile.png" });
  const backgroundOverflow = await appBackgroundDetails.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (backgroundOverflow) throw new Error("Background details overflow the mobile viewport");
  const backgroundReadingEdges = await appBackgroundDetails.evaluate((element) => {
    const left = (selector) => element.querySelector(selector)?.getBoundingClientRect().left;
    return {
      textAlign: getComputedStyle(element).textAlign,
      title: left("h3"),
      label: left(".background-details-heading span"),
      description: left(":scope > p"),
      details: left(":scope > dl"),
    };
  });
  if (backgroundReadingEdges.textAlign !== "left") throw new Error("Background details are not left-aligned on mobile");
  const mobileReadingEdges = [backgroundReadingEdges.title, backgroundReadingEdges.label, backgroundReadingEdges.description, backgroundReadingEdges.details];
  if (mobileReadingEdges.some((edge) => edge == null || Math.abs(edge - mobileReadingEdges[0]) > 1)) {
    throw new Error(`Background details do not share one mobile reading edge: ${JSON.stringify(backgroundReadingEdges)}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await appBackgroundDetails.getByRole("button", { name: "More about the Alert origin feat" }).click();
  await appBackgroundDetails.getByText("Add your Proficiency Bonus to Initiative rolls.", { exact: false }).waitFor();
  await openAppSection("Gear & carrying");
  const fullAppGear = page.getByTestId("app-character-sheet").locator(".appsheet-section").filter({ has: page.getByRole("heading", { name: "Gear & carrying", exact: true }) });
  if (await fullAppGear.getByText("Carrying setup", { exact: true }).count()) {
    throw new Error("View 2 still exposes the removed Carrying setup panel");
  }
  if (await fullAppGear.getByText("Check load", { exact: true }).count()) {
    throw new Error("View 2 still exposes the removed carrying warning");
  }
  if (await fullAppGear.getByRole("heading", { name: "Slot assignment", exact: true }).count()) {
    throw new Error("View 2 still exposes the removed slot-assignment summary");
  }
  await page.getByTestId("appsheet-inventory").getByText("Hunter Rifle", { exact: true }).waitFor();
  const rifleSlot = page.getByLabel("Hunter Rifle item 1 carrying slot");
  if (await rifleSlot.inputValue() !== "") throw new Error("New equipment should start Unassigned");
  if (!await rifleSlot.locator('option[value="hand"]').count()) throw new Error("Hunter Rifle cannot be assigned to Hand");
  await rifleSlot.selectOption("hand");
  await page.getByTestId("appsheet-inventory").locator(".appsheet-item-slot").filter({ hasText: "Hand" }).waitFor();
  const inventory = page.getByTestId("appsheet-inventory");
  if (await fullAppGear.getByTestId("appsheet-catalog-picker").count()) throw new Error("View 2 still exposes the separate rules-library disclosure");
  if (await fullAppGear.getByText("Record a unique item", { exact: true }).count()) throw new Error("View 2 still exposes the separate unique-item disclosure");
  const inventoryAdd = fullAppGear.getByTestId("appsheet-inventory-add");
  await inventoryAdd.click();
  const addDialog = page.getByRole("dialog", { name: "Add to inventory", exact: true });
  if (await addDialog.locator(".appsheet-add-choices > button").count() !== 2) throw new Error("Inventory Add menu does not offer exactly two paths");
  await addDialog.getByRole("button", { name: "Record a unique item", exact: true }).click();
  const uniqueItemDialog = page.getByRole("dialog", { name: "Record a unique item", exact: true });
  await uniqueItemDialog.getByLabel("Unique item name").waitFor();
  await uniqueItemDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await addDialog.getByRole("button", { name: "Add from rules library", exact: true }).click();
  await page.getByTestId("appsheet-catalog-item").selectOption("backpack");
  await page.getByTestId("appsheet-add-catalog-item").click();
  const backpackRow = inventory.locator(":scope > div").filter({ has: page.getByText("Backpack", { exact: true }) });
  await backpackRow.getByRole("button", { name: "Wear" }).click();
  const wornStorage = page.getByTestId("appsheet-worn-storage");
  await wornStorage.getByText("7 back slots", { exact: true }).waitFor();
  await inventoryAdd.click();
  await page.getByRole("dialog", { name: "Add to inventory", exact: true }).getByRole("button", { name: "Add from rules library", exact: true }).click();
  await page.getByTestId("appsheet-catalog-item").selectOption("mace");
  await page.getByTestId("appsheet-add-catalog-item").click();
  const maceSlot = page.getByLabel("Mace item 1 carrying slot");
  if (!await maceSlot.locator('option[value="storage:backpack:1"]').count()) throw new Error("Worn storage does not offer its extra slots in Inventory");
  await maceSlot.selectOption("storage:backpack:1");
  await inventoryAdd.click();
  await page.getByRole("dialog", { name: "Add to inventory", exact: true }).getByRole("button", { name: "Add from rules library", exact: true }).click();
  await page.getByTestId("appsheet-catalog-item").selectOption("flail");
  await page.getByTestId("appsheet-add-catalog-item").click();
  const flailSlot = page.getByLabel("Flail item 1 carrying slot");
  if (await flailSlot.locator('option[value="storage:backpack:1"]').count()) throw new Error("An occupied storage slot remains selectable for another item");
  if (!await flailSlot.locator('option[value="storage:backpack:2"]').count()) throw new Error("Unused storage slots are not offered after assigning an item");
  await inventoryAdd.click();
  await page.getByTestId("appsheet-add-backdrop").dispatchEvent("click");
  if (await page.getByRole("dialog", { name: "Add to inventory", exact: true }).count()) throw new Error("Outside click did not close the Inventory Add menu");
  await page.setViewportSize({ width: 390, height: 844 });
  await inventory.screenshot({ path: "screenshots/inventory-storage-slots-mobile.png" });
  if (await inventory.evaluate((element) => element.scrollWidth > element.clientWidth)) throw new Error("Inventory storage controls overflow the mobile viewport");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openAppSection("Abilities & skills");
  const skillChoiceDisclosure = page.locator(".appsheet-disclosure").filter({ has: page.getByText("Skill proficiency choices", { exact: true }) }).first();
  if (!await skillChoiceDisclosure.evaluate((element) => element.open)) throw new Error("Fresh required skill choices are not expanded");

  await page.getByRole("button", { name: "Increase level" }).click();
  await page.getByTestId("appsheet-edit-stage").waitFor();
  if (!await page.getByTestId("appsheet-edit-stage").getByText("Level").count()) throw new Error("Level change preview did not list the affected level");
  if (!await page.getByTestId("appsheet-edit-stage").locator(".positive").count()) throw new Error("Level increase did not show positive changes in green");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  if (await page.getByTestId("appsheet-level").locator("output").textContent() !== "1") throw new Error("Cancel did not discard the staged level change");

  await page.getByRole("button", { name: "Decrease HP" }).click();
  await page.getByTestId("appsheet-edit-stage").waitFor();
  if (!await page.getByTestId("appsheet-edit-stage").locator(".negative").count()) throw new Error("HP loss did not show as a negative preview");
  await page.getByRole("button", { name: "Decrease Insight" }).click();
  const pendingStage = page.getByTestId("appsheet-edit-stage");
  if (!await pendingStage.getByText("Current HP", { exact: true }).count() || !await pendingStage.getByText("Insight", { exact: true }).count()) {
    throw new Error("View 2 did not collect multiple character changes in one review tray");
  }
  const changesBeforeNote = await pendingStage.locator(".appsheet-change-list > span").count();
  await openAppSection("Notes");
  await page.getByTestId("appsheet-notes").fill("This note saves directly, without review.");
  const changesAfterNote = await pendingStage.locator(".appsheet-change-list > span").count();
  if (changesAfterNote !== changesBeforeNote) throw new Error("View 2 notes were incorrectly added to the change review tray");
  await page.getByRole("button", { name: "Apply changes" }).click();
  if (await page.getByTestId("appsheet-notes").inputValue() !== "This note saves directly, without review.") throw new Error("Applying View 2 changes overwrote a directly saved note");
  await page.getByTestId("appsheet-notes").fill("A note by itself must save live.");
  if (await page.getByTestId("appsheet-edit-stage").count()) throw new Error("Editing only View 2 notes opened the change review tray");

  // Levelling a damaged hunter restores every pool whose maximum increases.
  await page.getByRole("button", { name: "Increase level" }).click();
  const stagedChanges = page.getByTestId("appsheet-edit-stage").locator(".appsheet-change-list > span");
  const hpChange = stagedChanges.filter({ has: page.getByText("Current HP", { exact: true }) });
  const hpMaxChange = stagedChanges.filter({ has: page.getByText("Maximum HP", { exact: true }) });
  const hpMaximum = await hpMaxChange.locator("strong").textContent();
  if (await hpChange.locator("strong").textContent() !== hpMaximum) throw new Error("Level-up did not restore HP to its new maximum");
  await page.getByRole("button", { name: "Apply changes" }).click();
  if (await page.getByLabel("HP").textContent() !== hpMaximum) throw new Error("Applied level-up did not save restored HP");

  // Lower scores first so the point-buy guard has budget available while the
  // three 15s are raised.
  for (const [ability, target] of [["Intelligence", 8], ["Wisdom", 8], ["Charisma", 8], ["Strength", 15], ["Dexterity", 15], ["Constitution", 15]]) {
    const score = page.getByLabel(`${ability} base score`, { exact: true });
    let current = Number(await score.textContent());
    const button = page.getByRole("button", { name: `${target < current ? "Decrease" : "Increase"} ${ability} score`, exact: true });
    while (current !== target) {
      await button.click();
      current = Number(await score.textContent());
    }
  }
  await openAppSection("Abilities & skills");
  await openAppDisclosure("Skill proficiency choices");
  await page.getByLabel("Perception").check();
  await page.getByLabel("Survival").check();
  if (await skillChoiceDisclosure.evaluate((element) => element.open)) throw new Error("Completed skill choices did not collapse to reduce clutter");
  await page.getByLabel("Dexterity app background bonus").selectOption("2");
  await page.getByLabel("Constitution app background bonus").selectOption("1");
  const finishSetup = page.getByRole("button", { name: "Finish setup" });
  if (await finishSetup.isDisabled()) {
    const unresolved = await page.locator(".appsheet-incomplete").allTextContents();
    throw new Error(`Fresh app setup remained disabled after all choices: ${unresolved.join(", ")}`);
  }
  await finishSetup.click();
  const characterBuildDisclosure = page.locator(".appsheet-disclosure").filter({ has: page.getByText("Character build", { exact: true }) }).first();
  if (await characterBuildDisclosure.evaluate((element) => element.open)) throw new Error("Completed character build did not collapse to reduce clutter");
  await skillChoiceDisclosure.screenshot({ path: "screenshots/skill-choices-collapsed-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await skillChoiceDisclosure.screenshot({ path: "screenshots/skill-choices-collapsed-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const appStrength = page.getByLabel("Strength base score", { exact: true });
  const decreaseStrength = page.getByRole("button", { name: "Decrease Strength score", exact: true });
  const increaseStrength = page.getByRole("button", { name: "Increase Strength score", exact: true });
  if (!await appStrength.count() || await decreaseStrength.isDisabled()) throw new Error("Level-one ability scores stayed locked after setup");
  await decreaseStrength.click();
  await increaseStrength.click();
  await openAppDisclosure("Skill proficiency choices");
  if (!await skillChoiceDisclosure.evaluate((element) => element.open)) throw new Error("Completed skill choices could not be reopened for an update");
  await page.getByLabel("Perception").uncheck();
  await page.getByLabel("Athletics").check();
  if (await page.getByLabel("Perception").isChecked()) throw new Error("Completed skill choices could not be changed");
  if (!await page.getByLabel("Athletics").isChecked()) throw new Error("Replacement skill choice was not saved");

  await openAppSection("Combat & armor");
  await openAppDisclosure("Change worn armor");
  const wornArmorDisclosure = page.locator(".appsheet-disclosure").filter({ has: page.getByText("Change worn armor", { exact: true }) }).first();
  await page.getByTestId("appsheet-main-armor").selectOption("reinforced-hunter-leather-vest");
  if (await page.getByTestId("appsheet-combat-ac").locator(":scope > strong").textContent() !== "15") throw new Error("App armor choice did not recalculate AC");
  if (!await wornArmorDisclosure.evaluate((element) => element.open)) throw new Error("Editing a value collapsed its disclosure mid-task");

  await openAppSection("Gear & carrying");
  const inventoryAddMenu = page.getByTestId("appsheet-inventory-add");
  await inventoryAddMenu.click();
  await page.getByRole("dialog", { name: "Add to inventory", exact: true }).getByRole("button", { name: "Add from rules library", exact: true }).click();
  const catalogPicker = page.getByRole("dialog", { name: "Add from rules library", exact: true });
  await catalogPicker.screenshot({ path: "screenshots/rules-library-picker-desktop.png" });
  await page.getByTestId("appsheet-catalog-item").selectOption("torch");
  await page.getByTestId("appsheet-add-catalog-item").click();
  await page.getByTestId("appsheet-inventory").getByText("Torch", { exact: true }).waitFor();
  await inventoryAddMenu.click();
  await page.getByRole("dialog", { name: "Add to inventory", exact: true }).getByRole("button", { name: "Add from rules library", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await catalogPicker.screenshot({ path: "screenshots/rules-library-picker-mobile.png" });
  const catalogOverflow = await fullAppGear.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (catalogOverflow) throw new Error("Rules-library item picker overflows the mobile viewport");
  await page.keyboard.press("Escape");
  if (!await inventoryAddMenu.evaluate((element) => element === document.activeElement)) throw new Error("Closing the Inventory Add menu did not restore trigger focus");
  await page.setViewportSize({ width: 1440, height: 1000 });

  await openAppSection("Notes");
  await page.getByTestId("appsheet-notes").fill("Shared app-view note.");
  await page.locator(".papersheet-modal").evaluate((element) => element.scrollTo({ top: 0 }));
  await page.screenshot({ path: "screenshots/app-character-sheet-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Back" }).first().click();
  await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
  await page.getByTestId("app-character-sheet").waitFor();
  if (await page.getByTestId("legacy-conversion-wizard").count()) throw new Error("Legacy sheets still show a player-facing migration popup");

  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator(".papersheet-toolbar h1").count()) throw new Error("Character name still renders above the sheet toolbar");
  const toolbarAlignment = await page.locator(".papersheet-toolbar").evaluate((toolbar) => {
    const toggle = toolbar.querySelector(".character-view-menu");
    const toolbarBox = toolbar.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    return { rightGap: Math.round(toolbarBox.right - toggleBox.right), toolbarWidth: Math.round(toolbarBox.width) };
  });
  if (toolbarAlignment.rightGap > 2) {
    throw new Error(`The mobile character-view toggle is not right-aligned: ${JSON.stringify(toolbarAlignment)}`);
  }
  const mobileViewTrigger = page.getByRole("button", { name: "Choose character view", exact: true });
  await mobileViewTrigger.click();
  const mobileViewMenu = page.getByRole("menu", { name: "Character sheet views", exact: true });
  const mobileViewMenuBounds = await mobileViewMenu.boundingBox();
  if (!mobileViewMenuBounds || mobileViewMenuBounds.x < 0 || mobileViewMenuBounds.x + mobileViewMenuBounds.width > 390) {
    throw new Error(`Character view menu overflows the mobile viewport: ${JSON.stringify(mobileViewMenuBounds)}`);
  }
  await page.locator(".papersheet-toolbar").screenshot({ path: "screenshots/character-view-menu-mobile.png" });
  await page.keyboard.press("Escape");
  if (await mobileViewTrigger.getAttribute("aria-expanded") !== "false") throw new Error("Escape did not close the character view menu");
  if (!await mobileViewTrigger.evaluate((element) => element === document.activeElement)) throw new Error("Closing the character view menu did not restore trigger focus");
  await selectCharacterView("View 2");
  await page.getByTestId("app-character-sheet").waitFor();
  if (await page.getByLabel("Character section", { exact: true }).count()) {
    throw new Error("The removed character section selector is still visible");
  }
  if (await page.locator(".appsheet-nav").count()) {
    throw new Error("The removed character section navigation is still visible");
  }
  const sections = await page.getByTestId("app-character-sheet").locator(".appsheet-section").count();
  if (sections !== 6) {
    throw new Error(`The continuous character sheet did not render all six sections: ${sections}`);
  }
  const closedSections = await page.getByTestId("app-character-sheet").locator(".appsheet-section:not([open])").count();
  if (closedSections !== 5) {
    throw new Error(`The app sheet should start with only Overview expanded, found ${closedSections} collapsed sections`);
  }
  const overviewOrder = await page.getByTestId("app-character-sheet").evaluate((sheet) => ({
    battle: sheet.querySelector(".appsheet-battle-resources").getBoundingClientRect().top,
    build: sheet.querySelector(".appsheet-identity-panel").getBoundingClientRect().top,
  }));
  if (overviewOrder.battle >= overviewOrder.build) {
    throw new Error(`Established characters do not see battle resources before build controls on mobile: ${JSON.stringify(overviewOrder)}`);
  }
  const buildDisclosure = page.locator(".appsheet-disclosure").filter({ has: page.getByText("Character build", { exact: true }) }).first();
  if (await buildDisclosure.evaluate((element) => element.open)) throw new Error("Established character build controls are expanded by default");
  const collapsedBuildSummary = buildDisclosure.locator(".appsheet-disclosure-summary");
  if (!await collapsedBuildSummary.isVisible()) throw new Error("Collapsed character build does not expose its useful summary");
  await buildDisclosure.locator(":scope > summary").click();
  if (await collapsedBuildSummary.isVisible()) throw new Error("Expanded disclosure repeats its collapsed summary");
  if (!await page.getByTestId("appsheet-class").isVisible()) throw new Error("Expanded character build does not reveal its complete controls");
  await buildDisclosure.locator(":scope > summary").click();
  if (await page.getByRole("heading", { name: "Visible armor impression", exact: true }).count()) {
    throw new Error("Visible armor impression is still duplicated inside App View");
  }
  await openAppSection("Gear & carrying");
  const mobileFullAppGear = page.getByTestId("app-character-sheet").locator(".appsheet-section").filter({ has: page.getByRole("heading", { name: "Gear & carrying", exact: true }) });
  if (await mobileFullAppGear.getByText("Carrying setup", { exact: true }).count()) {
    throw new Error("Mobile View 2 still exposes the removed Carrying setup panel");
  }
  if (await mobileFullAppGear.getByText("Check load", { exact: true }).count()) {
    throw new Error("Mobile View 2 still exposes the removed carrying warning");
  }
  if (await mobileFullAppGear.getByRole("heading", { name: "Slot assignment", exact: true }).count()) {
    throw new Error("Mobile View 2 still exposes the removed slot-assignment summary");
  }
  await openAppDisclosure("Weapon details");
  const mobileWeaponLabels = page.locator(".appsheet-weapon-label");
  if (await mobileWeaponLabels.count() === 0 || !await mobileWeaponLabels.first().isVisible()) {
    throw new Error("Mobile weapon facts do not expose their stacked labels");
  }
  await page.getByRole("heading", { name: "Gear & carrying" }).scrollIntoViewIfNeeded();
  await openAppSection("Notes");
  await page.getByTestId("appsheet-notes").scrollIntoViewIfNeeded();
  const mobileScroll = await page.locator(".papersheet-modal").evaluate((element) => ({
    horizontal: element.scrollWidth > element.clientWidth,
    vertical: element.scrollHeight > element.clientHeight,
    position: element.scrollTop,
  }));
  if (mobileScroll.horizontal) throw new Error("App character sheet causes horizontal page scrolling on mobile");
  if (!mobileScroll.vertical || mobileScroll.position === 0) {
    throw new Error(`The continuous mobile sheet does not scroll naturally: ${JSON.stringify(mobileScroll)}`);
  }
  const appColors = await page.getByTestId("app-character-sheet").evaluate((element) => {
    const text = getComputedStyle(element).color;
    const title = getComputedStyle(element.querySelector("h2")).color;
    const background = getComputedStyle(element.closest(".papersheet-modal")).backgroundColor;
    const luminance = (value) => {
      const [r, g, b] = value.match(/[\d.]+/g).slice(0, 3).map(Number);
      return .2126 * r + .7152 * g + .0722 * b;
    };
    return {
      theme: document.documentElement.dataset.theme,
      text,
      title,
      background,
      backgroundLuminance: luminance(background),
      textContrast: Math.abs(luminance(text) - luminance(background)),
      titleContrast: Math.abs(luminance(title) - luminance(background)),
    };
  });
  if (appColors.theme !== "light" || appColors.backgroundLuminance < 180) {
    throw new Error(`App sheet did not inherit the light theme: ${JSON.stringify(appColors)}`);
  }
  if (appColors.textContrast < 80 || appColors.titleContrast < 80) {
    throw new Error(`App sheet contrast failed: ${JSON.stringify(appColors)}`);
  }
  await page.locator(".papersheet-modal").evaluate((element) => element.scrollTo({ top: 0 }));
  await page.screenshot({ path: "screenshots/app-character-sheet-mobile.png", fullPage: true });
  for (const [section, screenshot] of [
    ["Combat & armor", "combat"],
    ["Features & choices", "features"],
    ["Abilities & skills", "abilities"],
    ["Gear & carrying", "gear"],
    ["Notes", "notes"],
  ]) {
    await openAppSection(section);
    await page.getByRole("heading", { name: section, exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `screenshots/app-character-sheet-mobile-${screenshot}.png`, fullPage: true });
  }
  await openAppSection("Gear & carrying");
  await openAppDisclosure("Weapon details");
  await page.getByRole("heading", { name: "Carried weapons", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "screenshots/app-character-sheet-mobile-weapons.png", fullPage: true });
  await page.locator(".papersheet-modal").evaluate((element) => element.scrollTo({ top: 0 }));
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  const darkBackground = await page.locator(".papersheet-modal").evaluate((element) => getComputedStyle(element).backgroundColor);
  if (darkBackground === appColors.background) throw new Error("App sheet did not respond when the global theme changed to dark");
  await page.screenshot({ path: "screenshots/app-character-sheet-mobile-dark.png", fullPage: true });

  // Escape closes the complete character editor, and reopening restores focus
  // to the toolbar rather than leaving keyboard users behind the modal.
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: "Hunters" }).waitFor();
  await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
  const reopenedBack = page.locator(".papersheet-toolbar").getByRole("button", { name: "Back" }).first();
  await reopenedBack.waitFor();
  if (!await reopenedBack.evaluate((element) => element === document.activeElement)) {
    throw new Error("Reopened character editor did not focus its Back control");
  }
  if (!await page.getByTestId("app-character-sheet").count()) {
    await selectCharacterView("View 2");
  }
  await page.getByTestId("app-character-sheet").waitFor();

  // Character deletion sits beside View character in the Hunters list, keeping
  // the character editor focused on playing and editing the sheet.
  await page.getByRole("button", { name: "Back" }).first().click();
  const deleteTrigger = page.getByRole("button", { name: "Delete character" });
  await deleteTrigger.waitFor();
  await deleteTrigger.click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete character?" });
  await deleteDialog.waitFor();
  const deleteInput = deleteDialog.getByTestId("character-delete-confirmation");
  if (!await deleteInput.evaluate((element) => element === document.activeElement)) {
    throw new Error("Delete confirmation did not focus its required input");
  }
  await deleteInput.fill("Not Eileen");
  if (!await deleteDialog.getByRole("button", { name: "Delete character" }).isDisabled()) {
    throw new Error("Delete action enabled without the exact character name");
  }
  const deleteLayout = await deleteDialog.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  if (deleteLayout.left < 0 || deleteLayout.right > deleteLayout.viewport) {
    throw new Error(`Delete confirmation overflows the mobile viewport: ${JSON.stringify(deleteLayout)}`);
  }
  await page.screenshot({ path: "screenshots/character-delete-confirmation-mobile.png", fullPage: true });
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  if (await deleteDialog.count()) throw new Error("Cancel did not close the delete confirmation");
  if (!await page.getByRole("heading", { name: "Hunters" }).isVisible()) throw new Error("Cancel left the hunters list");
  await page.screenshot({ path: "screenshots/hunter-list-mobile.png", fullPage: true });

  await deleteTrigger.click();
  await deleteDialog.getByTestId("character-delete-confirmation").fill("Eileen the Crow");
  const confirmedDelete = deleteDialog.getByRole("button", { name: "Delete character" });
  if (await confirmedDelete.isDisabled()) throw new Error("Exact character name did not enable deletion");
  await confirmedDelete.click();
  await page.getByRole("heading", { name: "Hunters" }).waitFor();
  if (await page.getByRole("button", { name: /Open Eileen the Crow/ }).count()) {
    throw new Error("Deleted character remained in the hunter list");
  }

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
