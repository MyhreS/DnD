// Dual-viewport visual check: screenshots routes at BOTH mobile (iPhone 15) and
// desktop, reporting console errors. This is the standard "look at it" tool — we
// always review the app at both sizes.
//
//   bun run scripts/shots.mjs                         # default routes, preview mode
//   bun run scripts/shots.mjs /character /handbook    # specific routes
//   BASE=https://dandd-ea955.web.app bun run scripts/shots.mjs   # against prod
//
// Output: screenshots/<slug>-mobile.png and -desktop.png
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://localhost:5173";
const PREVIEW = process.env.PREVIEW ?? "user.player"; // dev bypass; ignored on prod
const OUT = "screenshots";
await mkdir(OUT, { recursive: true });

const routes = process.argv.slice(2);
if (routes.length === 0) routes.push("/", "/character", "/party", "/handbook");

const VIEWPORTS = [
  { name: "mobile", opts: { ...devices["iPhone 15"] } },
  // Desktop: a roomy power-user window.
  { name: "desktop", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
];

const slug = (r) => (r.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home");
const sep = (r) => (r.includes("?") ? "&" : "?");
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const browser = await chromium.launch();
let errorCount = 0;

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext(vp.opts);
  const page = await ctx.newPage();
  for (const route of routes) {
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    const url = `${BASE}${route}${BASE.includes("localhost") ? `${sep(route)}preview=${PREVIEW}` : ""}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await sleep(1600);
    const out = `${OUT}/${slug(route)}-${vp.name}.png`;
    await page.screenshot({ path: out, fullPage: true });
    const tag = errors.length ? `⚠ ${errors.length} err` : "ok";
    console.log(`${vp.name.padEnd(8)} ${route.padEnd(14)} → ${out}  [${tag}]`);
    for (const e of errors.slice(0, 5)) console.log(`    - ${e}`);
    errorCount += errors.length;
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
  }
  await ctx.close();
}

await browser.close();
console.log(`\nDone. Total console errors: ${errorCount}`);
process.exit(errorCount ? 1 : 0);
