import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = 5197;
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
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text()); });

  await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Hunters" }).waitFor({ timeout: 20000 });
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
  await strains.screenshot({ path: "screenshots/deepcaller-strains-mobile.png" });
  await riteReference.screenshot({ path: "screenshots/deepcaller-rites-mobile.png" });
  const strainOverflow = await strains.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (strainOverflow) throw new Error("Deepcaller Strain controls overflow the mobile viewport");
  const ritesOverflow = await riteReference.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (ritesOverflow) throw new Error("Deepcaller Rite reference overflows the mobile viewport");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByTestId("appsheet-class").selectOption("warden");
  await openAppSection("Gear & carrying");
  await page.getByTestId("appsheet-inventory").getByText("Hunter Rifle", { exact: true }).waitFor();
  const rifleSlot = page.getByLabel("Hunter Rifle item 1 carrying slot");
  if (await rifleSlot.inputValue() !== "") throw new Error("New equipment should start Unassigned");
  if (!await rifleSlot.locator('option[value="hand"]').count()) throw new Error("Hunter Rifle cannot be assigned to Hand");
  await rifleSlot.selectOption("hand");
  await page.getByTestId("appsheet-inventory").locator(".appsheet-item-slot").filter({ hasText: "Hand" }).waitFor();
  await page.getByTestId("appsheet-background").selectOption("criminal");
  const appBackgroundDetails = page.getByTestId("background-details").first();
  await appBackgroundDetails.getByRole("heading", { name: "Criminal" }).waitFor();
  if (!await appBackgroundDetails.getByText("Sleight of Hand, Stealth", { exact: true }).count()) {
    throw new Error("Selected app background did not show its proficiencies");
  }
  await appBackgroundDetails.getByRole("button", { name: "More about the Alert origin feat" }).click();
  await appBackgroundDetails.getByText("Add your Proficiency Bonus to Initiative rolls.", { exact: false }).waitFor();
  await appBackgroundDetails.screenshot({ path: "screenshots/background-details-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await appBackgroundDetails.screenshot({ path: "screenshots/background-details-mobile.png" });
  const backgroundOverflow = await appBackgroundDetails.evaluate((element) => element.scrollWidth > element.clientWidth);
  if (backgroundOverflow) throw new Error("Background details overflow the mobile viewport");
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
  await page.getByRole("button", { name: "Apply changes" }).click();

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
  for (const [ability, score] of [["Intelligence", "8"], ["Wisdom", "8"], ["Charisma", "8"], ["Strength", "15"], ["Dexterity", "15"], ["Constitution", "15"]]) {
    await page.getByLabel(`${ability} app base`).selectOption(score);
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
  const appStrength = page.getByLabel("Strength app base");
  if (await appStrength.isDisabled()) throw new Error("Level-one ability scores stayed locked after setup");
  await appStrength.selectOption("14");
  await appStrength.selectOption("15");
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
  await openAppDisclosure("Add a catalog item");
  await page.getByTestId("appsheet-catalog-item").selectOption("torch");
  await page.getByTestId("appsheet-add-catalog-item").click();
  await page.getByTestId("appsheet-inventory").getByText("Torch", { exact: true }).waitFor();

  await openAppSection("Notes");
  await page.getByTestId("appsheet-notes").fill("Shared app-view note.");
  await page.locator(".papersheet-modal").evaluate((element) => element.scrollTo({ top: 0 }));
  await page.screenshot({ path: "screenshots/app-character-sheet-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Paper sheet" }).click();
  await page.getByTestId("sheet-character-automation").waitFor();
  const sheetBackgroundDetails = page.getByTestId("sheet-character-automation").getByTestId("background-details");
  await sheetBackgroundDetails.getByRole("heading", { name: "Criminal" }).waitFor();
  if (!await sheetBackgroundDetails.getByText("Thieves' Tools, Crowbar", { exact: true }).count()) {
    throw new Error("Selected paper background did not show its starting gear");
  }
  await sheetBackgroundDetails.getByRole("button", { name: "More about the Alert origin feat" }).click();
  await sheetBackgroundDetails.getByText("swap your Initiative with a willing ally", { exact: false }).waitFor();
  if (await page.locator('[data-f="pageNotes"]').inputValue() !== "Shared app-view note.") throw new Error("App notes did not synchronize into the paper sheet");
  const controlsAreOnSheet = await page.getByTestId("sheet-character-automation").evaluate(
    (element) => Boolean(element.closest(".papersheet .page")),
  );
  if (!controlsAreOnSheet) throw new Error("Paper automation is not integrated into the white sheet");
  await page.getByLabel("Head Gear", { exact: true }).selectOption("tricorn");
  for (const dropdown of [page.getByTestId("sheet-main-armor"), page.getByLabel("Head Gear", { exact: true })]) {
    const appearance = await dropdown.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow };
    });
    if (appearance.backgroundColor !== "rgba(0, 0, 0, 0)" || appearance.boxShadow !== "none") {
      throw new Error(`Paper dropdown has a coloured automation box: ${JSON.stringify(appearance)}`);
    }
  }

  const sheetClass = page.locator('[data-f="class"]');
  await sheetClass.waitFor();
  if (!/Warden/.test(await sheetClass.locator("option:checked").textContent())) throw new Error("Class did not fill the paper sheet");
  if (await page.locator('[data-f="level"]').inputValue() !== "1") throw new Error("New class did not default to level 1");
  if (await page.locator('[data-f="ac"]').inputValue() !== "15") throw new Error("Armor Class did not recalculate");
  if (!/Tricorn/.test(await page.locator('[data-f="headGear"]').locator("option:checked").textContent())) throw new Error("Extra armor did not fill its legacy paper field");
  if (await page.locator('[data-f="wisSaveP"]').isChecked() !== true) throw new Error("Warden Wisdom save did not fill");
  if (await page.locator('[data-f="chaSaveP"]').isChecked() !== true) throw new Error("Warden Charisma save did not fill");
  const equipmentNames = await page.locator('[data-f^="eq_"][data-f$="_0"]').evaluateAll((fields) => fields.map((field) => field.value));
  if (!equipmentNames.some((name) => /Hunter Rifle/.test(name))) throw new Error("Warden starting equipment did not fill");
  if (await page.locator('[data-f="initiative"]').inputValue() !== "+5") throw new Error("Alert did not update initiative");
  if (!(await page.locator('[data-f="hpMax"]').getAttribute("data-auto-reason"))?.includes("Hit Die")) throw new Error("Auto-filled HP has no visible reason");
  await page.getByText(/The table below fills automatically/).waitFor();
  const paperStrength = page.getByLabel("Strength base");
  if (await paperStrength.isDisabled()) throw new Error("Level-one paper-sheet ability scores stayed locked after setup");
  await paperStrength.selectOption("14");
  await paperStrength.selectOption("15");

  await page.getByRole("button", { name: "Add unique weapon or item found in play" }).click();
  await page.getByLabel("Unique item name").fill("Moon Saw");
  await page.getByLabel("Unique item weight").fill("4");
  await page.getByLabel("Unique weapon attack bonus").fill("+4");
  await page.getByLabel("Unique weapon damage").fill("1d8 slashing");
  await page.getByLabel("Unique item note").fill("Found beneath the old chapel.");
  await page.getByRole("button", { name: "Add unique item", exact: true }).click();
  const foundEquipmentNames = await page.locator('[data-f^="eq_"][data-f$="_0"]').evaluateAll((fields) => fields.map((field) => field.value));
  if (!foundEquipmentNames.includes("Moon Saw")) throw new Error("Unique found weapon did not fill the equipment sheet");
  if (await page.locator('[data-f="wd_0_0"]').inputValue() !== "Moon Saw") throw new Error("Unique found weapon did not fill the weapon table");

  const addonIds = ["full-leather-cuirass", "leather-pauldron-right", "leather-pauldron-left", "leather-vambrace-right", "leather-vambrace-left"];
  for (const [index, id] of addonIds.entries()) await page.getByTestId(`sheet-addon-armor-${index + 1}`).selectOption(id);
  await page.getByLabel("Studs for add-on armor 1").check();
  const armoredAc = await page.locator('[data-f="ac"]').inputValue();
  if (armoredAc !== "18") throw new Error(`Integrated add-on armor, Shield Arm, and studs did not recalculate AC (received ${armoredAc})`);
  await page.getByRole("button", { name: "Add unique armor found in play" }).click();
  await page.getByLabel("Unique armor type").selectOption("Add-on Armor");
  if (!await page.getByRole("button", { name: "Add and equip unique armor" }).isDisabled()) throw new Error("Unique add-on armor can exceed the worn-piece limit");
  await page.getByText(/All add-on slots are full/).waitFor();
  await page.getByRole("button", { name: "Cancel unique armor" }).click();
  for (let index = addonIds.length; index > 0; index -= 1) await page.getByTestId(`sheet-addon-armor-${index}`).selectOption("");
  await page.getByRole("button", { name: "Add unique armor found in play" }).click();
  await page.getByLabel("Unique armor type").selectOption("Main Armor");
  await page.getByLabel("Unique armor name").fill("Moon Plate");
  await page.getByLabel("Unique armor AC").fill("14");
  await page.getByLabel("Unique armor weight").fill("8");
  await page.getByLabel("Unique armor note").fill("Glows near Dreadbloods.");
  await page.getByRole("button", { name: "Add and equip unique armor" }).click();
  if (await page.locator('[data-f="ac"]').inputValue() !== "16") throw new Error("Unique found armor did not recalculate AC");
  if (!/Moon Plate/.test(await page.getByTestId("sheet-main-armor").locator("option:checked").textContent())) throw new Error("Unique found armor was not equipped");
  await page.screenshot({ path: "screenshots/character-automation-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "Back" }).first().click();
  await page.getByRole("button", { name: /Open Eileen the Crow/ }).click();
  await page.locator('[data-f="name"]').waitFor();
  if (await page.getByTestId("legacy-conversion-wizard").count()) throw new Error("Legacy sheets still show a player-facing migration popup");

  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator(".papersheet-toolbar h1").count()) throw new Error("Character name still renders above the sheet toolbar");
  const toolbarAlignment = await page.locator(".papersheet-toolbar").evaluate((toolbar) => {
    const toggle = toolbar.querySelector(".character-view-switch");
    const toolbarBox = toolbar.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    return { rightGap: Math.round(toolbarBox.right - toggleBox.right), toolbarWidth: Math.round(toolbarBox.width) };
  });
  if (toolbarAlignment.rightGap > 2) {
    throw new Error(`The mobile character-view toggle is not right-aligned: ${JSON.stringify(toolbarAlignment)}`);
  }
  await page.getByRole("button", { name: "App view" }).click();
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
  const carryingSetup = await openAppDisclosure("Carrying setup");
  if (await carryingSetup.getByRole("heading", { name: "Storage worn on the body", exact: true }).count()) {
    throw new Error("Carrying setup still exposes the removed body-storage controls");
  }
  if (!await carryingSetup.getByRole("heading", { name: "Slot assignment", exact: true }).isVisible()) {
    throw new Error("Carrying setup no longer exposes slot assignment");
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
    await page.getByRole("button", { name: "App view" }).click();
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
