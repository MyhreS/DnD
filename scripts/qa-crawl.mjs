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
import sharp from "sharp";

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
// Console errors matched by a known-benign filter: kept out of `errors` (they
// don't fail the crawl) but LOGGED at the end so nothing is dropped silently.
const filtered = [];
let shotN = 0;

function attach(page, role) {
  page.on("pageerror", (e) => errors.push(`[${role}] pageerror: ${String(e).split("\n")[0].slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (t.includes("Failed to load resource")) return filtered.push(`[${role}] ${t.slice(0, 160)}`);
    // Browser warning from the Google sign-in popup — not an app bug.
    if (/Cross-Origin-Opener-Policy/i.test(t)) return filtered.push(`[${role}] ${t.slice(0, 160)}`);
    // Transient realtime-listener race while the crawler rapidly creates / enters /
    // leaves campaigns: a subscription briefly targets a game/campaign whose
    // membership context is mid-resolution. Verified (deterministic onSnapshot test)
    // NOT a rules bug; the app clears these on the next good snapshot. Real WRITE
    // permission failures aren't "subscription failed" lines, so they still flag.
    if (/subscription failed.*(insufficient permissions|permission-denied)/i.test(t))
      return filtered.push(`[${role}] ${t.slice(0, 160)}`);
    errors.push(`[${role}] console: ${t.slice(0, 200)}`);
  });
  page.on("response", (res) => {
    if (res.status() < 400 || BENIGN.test(res.url())) return;
    errors.push(`[${role}] HTTP ${res.status()} ${res.url().slice(0, 90)}`);
  });
}

async function shot(page, name) {
  await sleep(500);
  try {
    const file = `${String(++shotN).padStart(3, "0")}-${name}.png`;
    const buf = await page.screenshot({ path: `${OUT}/${file}` });
    // Blank-page guard: a screenshot that is one flat color (all-white/black)
    // means the route rendered nothing — that's a failure, not a pass.
    const { channels } = await sharp(buf).stats();
    if (channels.every((c) => c.stdev < 2)) {
      errors.push(`BLANK SCREENSHOT ${file}: single flat color — the page rendered nothing`);
    }
  } catch {}
}

/** Cheap DOM-side blank check right after a route settles: the app root must
 * have rendered children with some visible text. Fails the crawl otherwise. */
async function assertRendered(page, role, label) {
  try {
    const info = await page.evaluate(() => {
      const root = document.getElementById("root");
      const text = (root?.innerText ?? "").replace(/\s+/g, " ").trim();
      return { children: root?.childElementCount ?? 0, textLen: text.length };
    });
    if (info.children === 0 || info.textLen === 0) {
      errors.push(`[${role}] BLANK PAGE on ${label}: #root has ${info.children} children, ${info.textLen} chars of text`);
    }
  } catch (e) {
    errors.push(`[${role}] blank-check failed on ${label}: ${String(e).split("\n")[0].slice(0, 120)}`);
  }
}

/** Close any dialog left open by earlier clicks (paper-sheet overlays close on
 * Escape; ModalBackdrop dialogs dismiss on backdrop click; must-complete ones
 * have a Cancel/Close/Done control) so the labeled screenshot shows the route
 * itself, not a stale modal. */
async function closeModals(page) {
  for (let i = 0; i < 5; i++) {
    const dialog = page.locator("[role=dialog]").last();
    if (!(await dialog.isVisible().catch(() => false))) return;
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(250);
    if (!(await dialog.isVisible().catch(() => false))) continue;
    // Backdrop corner click — ModalBackdrop dismisses when the backdrop itself
    // (not the dialog content) is the click target.
    await dialog.click({ position: { x: 8, y: 8 }, timeout: 800 }).catch(() => {});
    await sleep(250);
    if (!(await dialog.isVisible().catch(() => false))) continue;
    const closer = dialog.locator("button", { hasText: /cancel|close|done|back/i }).first();
    if (!(await closer.isVisible().catch(() => false))) return; // can't close — shoot as-is
    await closer.click({ timeout: 800 }).catch(() => {});
    await sleep(250);
  }
}

/** Click every safe, visible, enabled interactive element on the current view,
 * a few passes deep (to reach controls revealed by earlier clicks). */
async function clickEverything(page, role, label, path) {
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
  // The labeled shot must show the ROUTE, not whatever dialog / detour the
  // click passes left behind: close open modals, and if a click SPA-navigated
  // away from the route, go back to it first.
  await closeModals(page);
  if (path) {
    try {
      if (new URL(page.url()).pathname !== path) {
        await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
        await sleep(1200);
      }
    } catch { /* keep the current view */ }
  }
  await shot(page, `${role}-${label}`);
}

async function visit(page, role, path, label) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await sleep(1600);
    await assertRendered(page, role, `${label} (${path})`);
    await clickEverything(page, role, label, path);
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
    // The big-screen status board remains a standalone table display.
    await visit(page, "dm", "/status", "status");
    await ctx.close();
  }

  await browser.close();

  // The DM crawl seeded a real "Test Run" campaign + 5 bot hunters in LIVE
  // Firestore. Tear it down so repeated runs never litter the world-readable
  // hunter gallery. A failed teardown fails the crawl.
  if (ROLES.includes("dm")) await teardownTestRuns();
}

/** Admin-delete every Test Run campaign owned by the agent DM (the one this
 * crawl created and any strays from crashed runs), including its scoped docs
 * and bot hunters. Also sweeps orphaned bot cards whose campaign is gone. */
async function teardownTestRuns() {
  const sa = process.env.AGENT_TEST_SA;
  if (!sa) {
    errors.push("[dm] Test Run teardown skipped: AGENT_TEST_SA not in env (run via doppler)");
    return;
  }
  try {
    const { initializeApp, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const admin = initializeApp({ credential: cert(JSON.parse(sa)) }, "qa-teardown");
    const adb = getFirestore(admin);
    const snap = await adb.collection("campaigns").where("dmUid", "==", "agent-dm").get();
    const targets = snap.docs.filter((d) => d.data().sandbox === true || d.data().name === "Test Run");
    const targetIds = new Set(targets.map((d) => d.id));
    for (const c of targets) {
      for (const coll of ["games", "sessions", "trades", "shopListings", "sellRequests", "activity"]) {
        const s = await adb.collection(coll).where("campaignId", "==", c.id).get();
        for (const d of s.docs) await adb.recursiveDelete(d.ref);
      }
      const chars = await adb.collection("characters").where("campaignId", "==", c.id).get();
      for (const d of chars.docs) {
        if (String(d.data().ownerUid ?? "").startsWith("bot-")) await d.ref.delete();
        else await d.ref.set({ campaignId: null }, { merge: true }); // never delete a real hunter
      }
      await adb.recursiveDelete(c.ref); // members subcollection + the campaign doc
    }
    // Orphaned bot cards (their campaign no longer exists) are litter no matter
    // who seeded them — but leave bots that belong to someone's LIVE Test Run.
    const bots = await adb.collection("characters").orderBy("ownerUid").startAt("bot-").endAt("bot-" + String.fromCharCode(0xf8ff)).get();
    let swept = 0;
    for (const d of bots.docs) {
      const cid = d.data().campaignId ?? null;
      if (cid && !targetIds.has(cid) && (await adb.doc(`campaigns/${cid}`).get()).exists) continue;
      await d.ref.delete();
      swept++;
    }
    console.log(`🧹 teardown: deleted ${targets.length} Test Run campaign(s); swept ${swept} bot card(s)`);
  } catch (e) {
    errors.push(`[dm] Test Run teardown FAILED: ${String(e).split("\n")[0].slice(0, 160)}`);
  }
}

await main();

const uniq = [...new Set(errors)];
console.log(`\n📸 gallery → ${OUT}/  (${shotN} shots)`);
const fUniq = [...new Set(filtered)];
if (fUniq.length) {
  console.log(`\nℹ ${fUniq.length} filtered console error(s) — known-benign, non-failing, logged for visibility:`);
  for (const f of fUniq) console.log("  -", f);
}
if (uniq.length) {
  console.log(`\n⚠ ${uniq.length} issue(s):`);
  for (const e of uniq) console.log("  -", e);
  process.exit(1);
}
console.log("✓ no console/page/HTTP errors found");
process.exit(0);
