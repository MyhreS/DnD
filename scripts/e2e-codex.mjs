import { chromium, devices } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const browser = await chromium.launch();
const errors = [];

function watch(page) {
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
}

async function assertNoPageOverflow(page, label) {
  const report = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          right: Math.round(rect.right),
          text: (element.textContent ?? "").trim().slice(0, 80),
        };
      })
      .filter((item) => item.right > viewportWidth + 1)
      .slice(0, 5);

    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      offenders,
    };
  });

  if (report.documentWidth > report.viewportWidth || report.bodyWidth > report.viewportWidth) {
    throw new Error(`${label} overflows horizontally: ${JSON.stringify(report)}`);
  }
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(desktop);
  await desktop.goto(`${BASE}/codex`, { waitUntil: "domcontentloaded" });
  await desktop.getByRole("heading", { name: "Codex", exact: true }).waitFor();
  if (await desktop.getByTestId("codex-document").count()) throw new Error("Source documents remained on the Codex home");
  await desktop.getByRole("heading", { name: "Browse", exact: true }).waitFor();
  if (await desktop.getByText("Start with a part of the library", { exact: true }).count()) throw new Error("Old Codex browse prompt remains visible");
  if (await desktop.getByLabel("Search within").count()) throw new Error("Source filter remains on Codex home");
  if (await desktop.getByText("All sources", { exact: true }).count()) throw new Error("All sources label remains on Codex home");
  const browseMetadataColumns = await desktop.locator(".codex-collection-item small").evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().left),
  );
  if (Math.max(...browseMetadataColumns) - Math.min(...browseMetadataColumns) > 1) {
    throw new Error(`Browse metadata does not share one column: ${JSON.stringify(browseMetadataColumns)}`);
  }
  await desktop.screenshot({ path: "screenshots/codex-home-desktop.png", fullPage: true });
  await desktop.getByRole("link", { name: /Source library/ }).click();
  await desktop.waitForURL(/\/codex\/documents$/);
  await desktop.getByRole("heading", { name: "Source library" }).waitFor();
  if (await desktop.getByTestId("codex-document").count() !== 16) throw new Error("Dedicated source library is incomplete");
  await desktop.getByTestId("codex-document").nth(0).getByRole("heading", { name: "Player's Handbook" }).waitFor();
  await desktop.getByTestId("codex-document").nth(1).getByRole("heading", { name: "Character Sheets" }).waitFor();
  await desktop.getByTestId("codex-document").nth(2).getByRole("heading", { name: "Player's Game Card" }).waitFor();
  const documentRows = desktop.getByTestId("codex-document");
  for (let index = 0; index < await documentRows.count(); index += 1) {
    if (await documentRows.nth(index).locator("a[download]").count() === 0) {
      throw new Error(`Source document ${index + 1} has no PDF download`);
    }
  }
  const downloadPaths = await documentRows.locator("a[download]").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")).filter(Boolean),
  );
  if (downloadPaths.length !== 30) throw new Error(`Expected 30 source PDFs, found ${downloadPaths.length}`);
  const actionColumns = await documentRows.locator(".codex-source-actions").evaluateAll((columns) =>
    columns.map((column) => column.getBoundingClientRect().left),
  );
  if (Math.max(...actionColumns) - Math.min(...actionColumns) > 1) {
    throw new Error(`Source actions do not share one column: ${JSON.stringify(actionColumns)}`);
  }
  const actionText = await documentRows.locator(".codex-source-actions").allTextContents();
  if (actionText.some((text) => /for send|ability-score-point-costs|CATACOMBS & STARSPAWNS Players Handbook/i.test(text))) {
    throw new Error(`Source actions expose internal filenames: ${JSON.stringify(actionText)}`);
  }
  await documentRows.filter({ hasText: "Hunter Bloodbound" }).getByText("Download All Hunter Classes (combined PDF)", { exact: true }).waitFor();
  for (const path of new Set(downloadPaths)) {
    const response = await desktop.request.get(new URL(path, BASE).href);
    if (!response.ok() || !response.headers()["content-type"]?.includes("application/pdf")) {
      throw new Error(`Broken PDF download: ${path} (${response.status()})`);
    }
  }
  await desktop.screenshot({ path: "screenshots/codex-documents-desktop.png", fullPage: true });
  await desktop.getByRole("link", { name: "Back to Codex" }).click();
  await desktop.waitForURL(/\/codex$/);

  const search = desktop.getByLabel("Search every rule and reference");
  await search.fill("grappled");
  const grappled = desktop.getByTestId("codex-topic").filter({ hasText: "Grappled" }).first();
  await grappled.waitFor();
  await grappled.getByText("D&D Rules", { exact: true }).first().waitFor();
  await grappled.getByText("Game Card", { exact: true }).first().waitFor();
  await grappled.getByText("This topic appears in multiple sources", { exact: false }).waitFor();
  if (!desktop.url().includes("q=grappled")) throw new Error("Codex query was not reflected in the URL");

  await desktop.goto(`${BASE}/codex?source=game-card&q=grappled`, { waitUntil: "domcontentloaded" });
  await desktop.getByRole("heading", { name: "Results for “grappled”", exact: true }).waitFor();
  await grappled.getByText("Game Card", { exact: true }).first().waitFor();
  if (await grappled.getByText("D&D Rules", { exact: true }).count()) throw new Error("source filter kept a D&D version");

  await search.fill("hunter rifle");
  const weapons = desktop.getByTestId("codex-topic").filter({ hasText: "Weapons" }).first();
  await weapons.waitFor();
  await weapons.locator("summary").click();
  await weapons.getByText("Hunter Rifle", { exact: true }).waitFor();

  await search.fill("Madness Die");
  await desktop.getByTestId("codex-empty").getByText("No Codex entries match this search.", { exact: true }).waitFor();

  await desktop.goto(`${BASE}/rules?q=prone`, { waitUntil: "domcontentloaded" });
  await desktop.waitForURL(/\/codex\?.*source=rules-reference-scan/);
  await desktop.getByTestId("codex-topic").filter({ hasText: "Prone" }).first().waitFor();

  await desktop.goto(`${BASE}/handbook?tab=classes&item=brute`, { waitUntil: "domcontentloaded" });
  await desktop.waitForURL(/\/codex\?.*source=brute/);
  await desktop.getByTestId("codex-topic").filter({ hasText: "Hunter Brute" }).first().waitFor();

  await desktop.goto(`${BASE}/game-card?q=secret+door`, { waitUntil: "domcontentloaded" });
  await desktop.waitForURL(/\/codex\?.*source=game-card/);
  await desktop.getByTestId("codex-topic").filter({ hasText: "Doors, Secret Doors & Locks" }).waitFor();
  await desktop.screenshot({ path: "screenshots/codex-desktop.png", fullPage: true });

  const mobileContext = await browser.newContext({ ...devices["iPhone 13"] });
  const mobile = await mobileContext.newPage();
  watch(mobile);
  await mobile.goto(`${BASE}/codex`, { waitUntil: "domcontentloaded" });
  const mobileSourceLibrary = mobile.getByRole("link", { name: /Source library/ });
  await mobileSourceLibrary.waitFor();
  await assertNoPageOverflow(mobile, "Codex mobile home");
  await mobile.screenshot({ path: "screenshots/codex-home-mobile.png", fullPage: true });
  await mobileSourceLibrary.click();
  await mobile.waitForURL(/\/codex\/documents$/);
  await mobile.getByRole("heading", { name: "Source library" }).waitFor();
  if (await mobile.getByTestId("codex-document").count() !== 16) throw new Error("Mobile source library is incomplete");
  await assertNoPageOverflow(mobile, "Codex mobile source library");
  await mobile.screenshot({ path: "screenshots/codex-documents-mobile.png", fullPage: true });
  await mobile.getByRole("link", { name: "Back to Codex" }).click();
  await mobile.waitForURL(/\/codex$/);

  const mobileSearch = mobile.getByLabel("Search every rule and reference");
  await mobileSearch.fill("hunter rifle");
  const mobileWeapons = mobile.getByTestId("codex-topic").filter({ hasText: "Weapons" }).first();
  await mobileWeapons.waitFor();
  await mobileWeapons.locator("summary").click();
  await mobileWeapons.getByText("Hunter Rifle", { exact: true }).first().waitFor();
  const tableDimensions = await mobileWeapons.locator(".codex-table-wrap").first().evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  if (tableDimensions.scrollWidth <= tableDimensions.clientWidth) {
    throw new Error(`Expected the wide Codex table to scroll inside its container: ${JSON.stringify(tableDimensions)}`);
  }
  await assertNoPageOverflow(mobile, "Codex mobile table results");

  await mobileSearch.fill("grappled");
  const mobileTopic = mobile.getByTestId("codex-topic").filter({ hasText: "Grappled" }).first();
  await mobileTopic.waitFor();
  await mobileTopic.getByText("D&D Rules", { exact: true }).first().waitFor();
  await mobileTopic.getByText("Game Card", { exact: true }).first().waitFor();
  await assertNoPageOverflow(mobile, "Codex mobile search results");
  await mobile.screenshot({ path: "screenshots/codex-mobile.png", fullPage: true });
  await mobileContext.close();

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Unified Codex E2E passed. Screenshots: screenshots/codex-*.png");
} finally {
  await browser.close();
}
