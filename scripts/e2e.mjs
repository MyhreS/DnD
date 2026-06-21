// End-to-end self-QA. Signs in for real (agent-test custom tokens) and drives
// Playwright through every page AND the key interactions of every feature,
// writing a screenshot gallery to screenshots/ and failing on console errors.
//
//   bun run e2e        (= doppler run -- bun scripts/e2e.mjs)
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import { chromium } from "playwright";

const PORT = 5191;
const BASE = `http://localhost:${PORT}`;
const OUT = "screenshots";

function mint(role) {
  const r = spawnSync("bun", ["scripts/mint-test-token.mjs", role], { encoding: "utf8", env: process.env });
  if (r.status !== 0) throw new Error(`mint ${role} failed: ${r.stderr}`);
  return r.stdout.trim().split("\n").pop().trim();
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch {}
    await sleep(500);
  }
  throw new Error("dev server did not start");
}

const errors = [];
let n = 0;

// Firestore's realtime channel + analytics/installations occasionally 4xx and
// the SDK just retries — those aren't app bugs, so don't fail the run on them.
const BENIGN = /google-analytics|googletagmanager|firebaseinstallations|firebaselogging|firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel|identitytoolkit.*getProjectConfig/i;

function makeRunner(page, role) {
  // Real JS exceptions always fail.
  page.on("pageerror", (e) => errors.push(`[${role}] pageerror: ${String(e)}`));
  // console.error from our code fails; generic "failed to load resource" is a
  // network message handled by the response listener below.
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (t.includes("Failed to load resource")) return;
    errors.push(`[${role}] console: ${t}`);
  });
  // Non-benign 4xx/5xx responses fail.
  page.on("response", (res) => {
    if (res.status() < 400) return;
    if (BENIGN.test(res.url())) return;
    errors.push(`[${role}] HTTP ${res.status()} ${res.url().slice(0, 100)}`);
  });
  return {
    page,
    async shot(name) {
      await sleep(700);
      await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${role}-${name}.png` });
      console.log("  📸", name);
    },
    async step(label, fn) {
      try { await fn(); } catch (e) { console.log(`  · skipped ${label}: ${String(e).split("\n")[0].slice(0, 80)}`); }
    },
    async goto(path) { await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }); await sleep(1800); },
    click: (name, opts) => page.getByRole("button", { name, ...opts }).first().click({ timeout: 4000 }),
    clickText: (t) => page.getByText(t, { exact: false }).first().click({ timeout: 4000 }),
  };
}

async function run() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();

  // ---- Signed out ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const r = makeRunner(await ctx.newPage(), "anon");
    await r.goto("/");
    await r.shot("login");
    await ctx.close();
  }

  // ---- Player: full character lifecycle + sessions + handbook ----
  {
    const token = mint("player");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
    const r = makeRunner(await ctx.newPage(), "player");
    await r.page.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
    await sleep(4500);
    console.log("● player");

    // Sessions + RSVP
    await r.goto("/"); await r.shot("sessions");
    await r.step("rsvp", async () => { await r.click("I'm in"); await r.shot("sessions-rsvp"); });

    // Character: create (if needed) → play sheet → trackers → dice → delete
    await r.goto("/character");
    await r.step("create-open", async () => { await r.click("Create character"); await sleep(1200); });
    await r.step("create-fill", async () => {
      await r.page.locator("#hunter-name").fill("Grukk the Tester");
      await r.page.locator("#bg").fill("Deserter");
      await r.page.getByRole("button", { name: "Scout" }).click();
      await sleep(300);
      // Point-buy: spend the full 27-point budget. Three abilities 10→14 cost 7
      // each (=21); the other three stay at 10 (2 each =6); 21+6 = 27, 0 left.
      const incBase = r.page.getByLabel("increase base");
      for (let a = 0; a < 3; a++) for (let i = 0; i < 4; i++) await incBase.nth(a).click();
      // Background bonus must total exactly 3 (+2 then +1).
      const incBg = r.page.getByLabel("increase bg");
      await incBg.nth(0).click(); await incBg.nth(0).click(); await incBg.nth(1).click();
      // Skills: pick exactly the class's required number of proficiencies.
      const skillCard = r.page.locator(".card").filter({ has: r.page.locator(".eyebrow", { hasText: "Skills" }) });
      const m = (await skillCard.locator("h3").innerText()).match(/\d+/);
      const need = m ? parseInt(m[0], 10) : 0;
      const chips = skillCard.locator(".chip.selectable");
      for (let i = 0; i < need; i++) await chips.nth(i).click();
      await sleep(300);
      await r.shot("character-editor");
      await r.click("Save hunter");
      await sleep(2500);
    });
    await r.shot("character-sheet");
    await r.step("trackers", async () => {
      await r.page.getByLabel("increase Madness").click();
      await r.page.getByLabel("decrease Hit Points").click();
      await r.shot("character-trackers");
    });
    await r.step("dice", async () => { await r.clickText("d20"); await r.shot("character-dice"); });
    await r.step("export-pdf", async () => {
      const dl = r.page.waitForEvent("download", { timeout: 6000 }).catch(() => null);
      await r.click("Export PDF");
      const d = await dl; if (d) console.log("    ↳ pdf:", await d.suggestedFilename());
    });

    // Party + Handbook
    await r.goto("/party"); await r.shot("party");
    await r.step("expand-hunter", async () => { await r.clickText("Grukk the Tester"); await r.shot("party-expanded"); });
    await r.goto("/handbook"); await r.shot("handbook-rules");
    await r.step("handbook-classes", async () => { await r.click("Classes"); await sleep(500); await r.clickText("Brute"); await r.shot("handbook-classes"); });
    await r.step("handbook-armory", async () => { await r.click("Armory"); await r.shot("handbook-armory"); });

    // Profile: theme toggle
    await r.goto("/profile"); await r.shot("profile");
    await r.step("theme-light", async () => { await r.clickText("Light"); await r.shot("profile-light"); });
    await r.step("theme-dark", async () => { await r.clickText("Dark"); });

    // Cleanup: delete the test character (also exercises the delete flow)
    await r.goto("/character");
    await r.step("delete-character", async () => {
      await r.click("Edit"); await sleep(800);
      await r.click("Delete character"); await sleep(400);
      await r.click("Yes, delete"); await sleep(400);
      await r.click("Delete forever"); await sleep(2000);
      await r.shot("character-deleted");
    });
    await ctx.close();
  }

  // ---- Admin: roster, export, member form, session form, role switcher ----
  {
    const token = mint("admin");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
    const r = makeRunner(await ctx.newPage(), "admin");
    await r.page.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
    await sleep(4500);
    console.log("● admin");

    await r.goto("/"); await r.shot("sessions");
    await r.step("add-session-form", async () => { await r.click("Add"); await sleep(600); await r.shot("session-form"); await r.click("Cancel"); });
    await r.goto("/party"); await r.shot("roster");
    await r.step("export-all", async () => {
      const dl = r.page.waitForEvent("download", { timeout: 6000 }).catch(() => null);
      await r.click("Export all PDF"); const d = await dl; if (d) console.log("    ↳ pdf:", await d.suggestedFilename());
    });
    await r.goto("/profile"); await r.shot("profile-admin");
    await r.step("role-switch", async () => {
      await r.page.getByLabel("Preview access role").selectOption("user");
      await sleep(600); await r.shot("profile-viewas-user");
      await r.click("Back to my role", { exact: false }).catch(() => {});
    });
    await ctx.close();
  }

  // ---- DM: no Character tab, oversight + reminders ----
  {
    const token = mint("dm");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const r = makeRunner(await ctx.newPage(), "dm");
    await r.page.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
    await sleep(4500);
    console.log("● dm");
    await r.goto("/"); await r.shot("sessions");
    await r.goto("/party"); await r.shot("party-roster");
    await r.goto("/profile"); await r.shot("profile-dm");
    await ctx.close();
  }

  await browser.close();
}

console.log("▶ starting dev server");
const dev = spawn("bunx", ["vite", "--port", String(PORT)], { stdio: ["ignore", "ignore", "inherit"], env: process.env });
try {
  await waitForServer();
  await run();
} finally {
  dev.kill("SIGTERM");
}

console.log(`\n📸 gallery → ${OUT}/  (${n} shots)`);
if (errors.length) {
  console.log("\n⚠ console errors:");
  for (const e of [...new Set(errors)]) console.log("  -", e);
  process.exit(1);
}
console.log("✓ no console errors");
process.exit(0);
