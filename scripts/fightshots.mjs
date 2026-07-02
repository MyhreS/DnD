// Timed capture of the animated fighter shows (dev only). Forces a solo/duel via
// ?fighters=, then screenshots across the choreography so we can actually look at
// the motion. Mobile + desktop. Not wired into package.json — a dev throwaway.
//
//   PORT=5191 bun run scripts/fightshots.mjs
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const PORT = process.env.PORT ?? "5191";
const BASE = process.env.BASE ?? `http://127.0.0.1:${PORT}`;
const PREVIEW = process.env.PREVIEW ?? "user.player";
const OUT = "/tmp/fight";
await mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile", opts: { ...devices["iPhone 15"] } },
  { name: "desktop", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
];
const KINDS = (process.env.KINDS ?? "duel,solo").split(",");
const STAMPS = (process.env.STAMPS ?? "2.5,4.5,6.5,9,12").split(",").map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"] });
let errors = 0;

for (const vp of VIEWPORTS) {
  for (const kind of KINDS) {
    const ctx = await browser.newContext(vp.opts);
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error") errs.push(t);
      else if (t.includes("[fighter]")) console.log(`    ${t}`);
    });
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.goto(`${BASE}/?preview=${PREVIEW}&fighters=${kind}`, { waitUntil: "domcontentloaded" });
    let prev = 0;
    for (const s of STAMPS) {
      await sleep(s * 1000 - prev);
      prev = s * 1000;
      const out = `${OUT}/${kind}-${vp.name}-t${String(s).replace(".", "_")}.png`;
      await page.screenshot({ path: out });
    }
    const tag = errs.length ? `⚠ ${errs.length} err` : "ok";
    console.log(`${vp.name.padEnd(8)} ${kind.padEnd(5)} → ${OUT}/${kind}-${vp.name}-t*.png  [${tag}]`);
    for (const e of errs.slice(0, 6)) console.log(`    - ${e}`);
    errors += errs.length;
    await ctx.close();
  }
}

await browser.close();
console.log(`\nDone. Total console errors: ${errors}`);
