import { chromium, devices } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:5173";
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
  await desktop.goto(`${BASE}/game-card`, { waitUntil: "networkidle" });
  await desktop.getByRole("heading", { name: /Player.s Game Card/ }).waitFor();

  const search = desktop.getByPlaceholder(/Search the game card/);
  await search.fill("hunter rifle");
  await desktop.getByText("Weapons", { exact: true }).waitFor();
  await desktop.getByText("Hunter Rifle", { exact: true }).waitFor();
  if (!desktop.url().includes("q=hunter+rifle")) throw new Error("search query was not reflected in the URL");

  await desktop.goto(`${BASE}/game-card?q=dreadblood+eyes`, { waitUntil: "networkidle" });
  await desktop.getByText("Dreadblood Eyes", { exact: true }).first().waitFor();
  await desktop.getByText(/gain Blindsight for 10 rounds/).waitFor();

  await search.fill("not-a-real-game-rule-xyz");
  await desktop.getByTestId("game-card-empty").waitFor();
  const pdfHref = await desktop.getByTestId("game-card-pdf").getAttribute("href");
  if (pdfHref !== "/game-card/players-game-card.pdf") throw new Error(`unexpected PDF link: ${pdfHref}`);

  await desktop.goto(`${BASE}/game-card?category=Equipment`, { waitUntil: "networkidle" });
  await desktop.getByRole("button", { name: "Equipment", exact: true }).waitFor();
  await desktop.screenshot({ path: "screenshots/game-card-desktop.png", fullPage: true });

  const mobileContext = await browser.newContext({ ...devices["iPhone 13"] });
  const mobile = await mobileContext.newPage();
  watch(mobile);
  await mobile.goto(`${BASE}/game-card?q=secret+door`, { waitUntil: "networkidle" });
  await mobile.getByText("Doors, Secret Doors & Locks", { exact: true }).waitFor();
  await mobile.getByText("Well-hidden", { exact: true }).waitFor();
  await mobile.screenshot({ path: "screenshots/game-card-mobile.png", fullPage: true });
  await mobileContext.close();

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Searchable Game Card E2E passed. Screenshots: screenshots/game-card-*.png");
} finally {
  await browser.close();
}
