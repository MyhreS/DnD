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

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(desktop);
  await desktop.goto(`${BASE}/codex`, { waitUntil: "domcontentloaded" });
  await desktop.getByRole("heading", { name: "Codex", exact: true }).waitFor();
  await desktop.getByRole("heading", { name: "Source library" }).waitFor();

  const search = desktop.getByLabel("Search every rule and reference");
  await search.fill("grappled");
  const grappled = desktop.getByTestId("codex-topic").filter({ hasText: "Grappled" }).first();
  await grappled.waitFor();
  await grappled.getByText("D&D Rules", { exact: true }).first().waitFor();
  await grappled.getByText("Game Card", { exact: true }).first().waitFor();
  await grappled.getByText("This topic appears in multiple sources", { exact: false }).waitFor();
  if (!desktop.url().includes("q=grappled")) throw new Error("Codex query was not reflected in the URL");

  await desktop.getByLabel("Search within").selectOption("game-card");
  await grappled.getByText("Game Card", { exact: true }).first().waitFor();
  if (await grappled.getByText("D&D Rules", { exact: true }).count()) throw new Error("source filter kept a D&D version");

  await search.fill("hunter rifle");
  const weapons = desktop.getByTestId("codex-topic").filter({ hasText: "Weapons" }).first();
  await weapons.waitFor();
  await weapons.locator("summary").click();
  await weapons.getByText("Hunter Rifle", { exact: true }).waitFor();

  await search.fill("Madness Die");
  await desktop.getByTestId("codex-empty").waitFor();

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
  await mobile.goto(`${BASE}/codex?q=grappled`, { waitUntil: "domcontentloaded" });
  const mobileTopic = mobile.getByTestId("codex-topic").filter({ hasText: "Grappled" }).first();
  await mobileTopic.waitFor();
  await mobileTopic.getByText("D&D Rules", { exact: true }).first().waitFor();
  await mobileTopic.getByText("Game Card", { exact: true }).first().waitFor();
  await mobile.screenshot({ path: "screenshots/codex-mobile.png", fullPage: true });
  await mobileContext.close();

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Unified Codex E2E passed. Screenshots: screenshots/codex-*.png");
} finally {
  await browser.close();
}
