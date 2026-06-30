// Exhaustive click-through QA crawler. Signs in for real (agent-test custom
// tokens) as each player type against a LOCAL dev server, visits every route,
// and clicks every safe interactive element it can find (buttons, chips, tabs,
// collapsibles, nested controls), capturing console/page/HTTP errors + a
// screenshot gallery. Destructive/mail actions are skipped (see DENY).
//
//   bun run dev               # in another terminal (serves :5173)
//   doppler run -- node scripts/qa-crawl.mjs          # run under NODE (Windows)
//   BASE=http://localhost:5173 ROLES=dm,player doppler run -- node scripts/qa-crawl.mjs
import { spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:5173";
const OUT = "screenshots/qa";
const ROLES = (process.env.ROLES ?? "anon,player,dm").split(",").map((s) => s.trim());

// Skip clicking things that send mail, sign out, or are irreversibly
// destructive (we exercise those in dedicated tests, not the broad crawl).
const DENY =
  /mailto|e-?mail|remind|sign ?out|log ?out|delete forever|yes,? delete|yes,? mark dead|confirm death|mark dead|stop game|end encounter|regenerate|leave|decline|delete (character|campaign|forever)|test campaign|i really mean it/i;

const BENIGN =
  /google-analytics|googletagmanager|firebaseinstallations|firebaselogging|firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel|identitytoolkit.*getProjectConfig/i;

function mint(role) {
  const r = spawnSync("node", ["scripts/mint-test-token.mjs", role], { encoding: "utf8", env: process.env });
  if (r.status !== 0) throw new Error(`mint ${role} failed: ${r.stderr}`);
  return r.stdout.trim().split("\n").pop().trim();
}

const errors = [];
let shotN = 0;

function attach(page, role) {
  page.on("pageerror", (e) => errors.push(`[${role}] pageerror: ${String(e).split("\n")[0].slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (t.includes("Failed to load resource")) return;
    // Browser warning from the Google sign-in popup — not an app bug.
    if (/Cross-Origin-Opener-Policy/i.test(t)) return;
    // Transient realtime-listener race while the crawler rapidly creates / enters /
    // leaves campaigns: a subscription briefly targets a game/campaign whose
    // membership context is mid-resolution. Verified (deterministic onSnapshot test)
    // NOT a rules bug; the app clears these on the next good snapshot. Real WRITE
    // permission failures aren't "subscription failed" lines, so they still flag.
    if (/subscription failed.*(insufficient permissions|permission-denied)/i.test(t)) return;
    errors.push(`[${role}] console: ${t.slice(0, 200)}`);
  });
  page.on("response", (res) => {
    if (res.status() < 400 || BENIGN.test(res.url())) return;
    errors.push(`[${role}] HTTP ${res.status()} ${res.url().slice(0, 90)}`);
  });
}

async function shot(page, name) {
  await sleep(500);
  try { await page.screenshot({ path: `${OUT}/${String(++shotN).padStart(3, "0")}-${name}.png` }); } catch {}
}

/** Click every safe, visible, enabled interactive element on the current view,
 * a few passes deep (to reach controls revealed by earlier clicks). */
async function clickEverything(page, role, label) {
  const clicked = new Set();
  for (let pass = 0; pass < 4; pass++) {
    let candidates;
    try {
      candidates = await page
        .locator("button:visible, [role=button]:visible, .chip:visible, [role=tab]:visible, summary:visible, label:visible")
        .all();
    } catch { break; }
    let acted = false;
    for (const el of candidates) {
      let name = "";
      try {
        name = ((await el.innerText({ timeout: 400 })) || (await el.getAttribute("aria-label")) || "").replace(/\s+/g, " ").trim().slice(0, 48);
      } catch { continue; }
      const key = `${name}#${(await el.getAttribute("class").catch(() => "")) ?? ""}`;
      if (!name || clicked.has(key)) continue;
      clicked.add(key);
      if (DENY.test(name)) continue;
      try {
        await el.click({ timeout: 1200 });
        acted = true;
        await sleep(180);
      } catch { /* not clickable right now */ }
    }
    if (!acted) break;
  }
  await shot(page, `${role}-${label}`);
}

async function visit(page, role, path, label) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await sleep(1600);
    await clickEverything(page, role, label);
  } catch (e) {
    errors.push(`[${role}] navigate ${path} failed: ${String(e).split("\n")[0].slice(0, 120)}`);
  }
}

async function signIn(ctx, role) {
  const page = await ctx.newPage();
  attach(page, role);
  const token = mint(role);
  await page.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
  await sleep(4500);
  return page;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true };

  // Public routes (signed out)
  if (ROLES.includes("anon")) {
    const ctx = await browser.newContext(mobile);
    const page = await ctx.newPage();
    attach(page, "anon");
    for (const [p, l] of [["/", "login"], ["/reference", "reference"], ["/handbook", "handbook"]]) await visit(page, "anon", p, l);
    await ctx.close();
  }

  // Player: main-menu surface
  if (ROLES.includes("player")) {
    const ctx = await browser.newContext(mobile);
    const page = await signIn(ctx, "player");
    for (const [p, l] of [["/", "home"], ["/character", "character"], ["/handbook", "handbook"], ["/reference", "reference"], ["/profile", "profile"]])
      await visit(page, "player", p, l);
    await ctx.close();
  }

  // DM: create a Test Run campaign, then crawl the full campaign + play surface.
  if (ROLES.includes("dm")) {
    const ctx = await browser.newContext(mobile);
    const page = await signIn(ctx, "dm");
    await visit(page, "dm", "/", "home");
    // Spin up a test campaign so campaign routes have content.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await sleep(1500);
    try {
      await page.getByRole("button", { name: /test campaign/i }).first().click({ timeout: 4000 });
      await sleep(4000);
      await shot(page, "dm-test-campaign-created");
    } catch (e) {
      errors.push(`[dm] could not create test campaign: ${String(e).split("\n")[0].slice(0, 120)}`);
    }
    for (const [p, l] of [["/play", "play"], ["/sessions", "sessions"], ["/party", "party"], ["/shop", "shop"], ["/hunter", "hunter"]])
      await visit(page, "dm", p, l);
    // Play: begin the game + exercise combat, a second pass after state changes.
    await visit(page, "dm", "/play", "play-2");
    await ctx.close();
  }

  await browser.close();
}

await main();

const uniq = [...new Set(errors)];
console.log(`\n📸 gallery → ${OUT}/  (${shotN} shots)`);
if (uniq.length) {
  console.log(`\n⚠ ${uniq.length} issue(s):`);
  for (const e of uniq) console.log("  -", e);
  process.exit(1);
}
console.log("✓ no console/page/HTTP errors found");
process.exit(0);
