// Quick visual check: screenshot a URL at iPhone size.
//   bun run scripts/shoot.mjs <url> <outfile>
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://dandd-ea955.web.app";
const out = process.argv[3] ?? "/tmp/cs-shot.png";

const browser = await chromium.launch();
const page = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14-ish
  deviceScaleFactor: 2,
}).then((c) => c.newPage());

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.screenshot({ path: out, fullPage: false });
console.log("Saved", out);
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
else console.log("No console errors.");

await browser.close();
