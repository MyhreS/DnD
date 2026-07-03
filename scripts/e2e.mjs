// End-to-end self-QA. Signs in for real (agent-test custom tokens) and drives
// Playwright through the app's CURRENT flows — campaign create/join, the full
// 5-step character builder, the play sheet (trackers, wear/take-off, the
// drop-confirm + recently-dropped loop), in-campaign sessions RSVP, party,
// the DM control board (transformation editor, Add item), handbook and
// profile — writing a screenshot gallery to screenshots/ and failing on any
// console/page/HTTP error.
//
// Every step is MANDATORY: a step that can't run fails the suite loudly
// (recorded error + FAIL screenshot + abort) — there is no skip-and-continue.
//
// Cleanup is part of the run: the campaign and the hunter are deleted through
// the real UI (exercising both delete flows), and an Admin-SDK safety net
// (pre-clean + finally) purges leftovers from crashed runs so back-to-back
// runs always start clean.
//
//   bun run e2e                              (mac/linux)
//   doppler run -- node scripts/e2e.mjs      (Windows — bun breaks playwright)
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs";
import { chromium } from "playwright";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PORT = 5191;
const BASE = `http://localhost:${PORT}`;
const OUT = "screenshots";

// Fixed test names: deterministic selectors + a precise cleanup target.
// The campaign is created through the "test campaign" button (same real
// createCampaign seam as the named form, plus 5 seeded bot hunters) because
// the party gallery and the DM board hide agent-owned hunters BY DESIGN
// (isTestEmail/realCards) — the bots are what gives those views content.
const CAMPAIGN = "Test Run";
const HUNTER = "Grukk the Tester";
const BOT = "Bot · Brute";
const DM_UID = "agent-dm";
const PLAYER_UID = "agent-player";

// ---------------------------------------------------------------------------
// Admin-SDK safety net: purge test data left by a crashed previous run (start)
// and anything the UI cleanup missed (finally). Scoped to OUR fixed names.
// ---------------------------------------------------------------------------
if (!process.env.AGENT_TEST_SA) {
  console.error("Missing AGENT_TEST_SA — run via: doppler run -- node scripts/e2e.mjs");
  process.exit(1);
}
const adminApp = initializeApp({ credential: cert(JSON.parse(process.env.AGENT_TEST_SA)) });
const adb = getFirestore(adminApp);
// Session ids created during THIS run — the UI's campaign delete removes the
// session docs but not their rsvps subcollection, so we purge those directly.
const runSessionIds = new Set();

async function purgeTestData(tag) {
  const gone = [];
  const camps = await adb
    .collection("campaigns")
    .where("dmUid", "==", DM_UID)
    .where("name", "==", CAMPAIGN)
    .get();
  for (const c of camps.docs) {
    for (const coll of ["games", "sessions", "trades", "shopListings", "sellRequests"]) {
      const snap = await adb.collection(coll).where("campaignId", "==", c.id).get();
      for (const d of snap.docs) await adb.recursiveDelete(d.ref); // incl. rsvps/participants/…
    }
    // Un-bind real players' hunters, drop seeded bots — mirrors deleteCampaign.
    const bound = await adb.collection("characters").where("campaignId", "==", c.id).get();
    for (const d of bound.docs) {
      if (String(d.data().ownerUid ?? "").startsWith("bot-")) await d.ref.delete();
      else await d.ref.set({ campaignId: null }, { merge: true });
    }
    await adb.recursiveDelete(c.ref);
    gone.push(`campaign ${c.id}`);
  }
  const chars = await adb
    .collection("characters")
    .where("ownerUid", "==", PLAYER_UID)
    .where("name", "==", HUNTER)
    .get();
  for (const d of chars.docs) { await d.ref.delete(); gone.push(`character ${d.id}`); }
  // Deleting a hunter archives a copy (DM recovery) — purge our test copies.
  const arch = await adb.collection("archive").where("card.name", "==", HUNTER).get();
  for (const d of arch.docs) { await d.ref.delete(); gone.push(`archive ${d.id}`); }
  // Orphaned rsvps under sessions this run created (parent doc already gone).
  for (const sid of runSessionIds) {
    for (const r of await adb.collection("sessions").doc(sid).collection("rsvps").listDocuments()) {
      await r.delete();
      gone.push(`rsvp ${sid}/${r.id}`);
    }
  }
  if (gone.length) console.log(`  🧹 ${tag}: removed ${gone.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
function mint(role) {
  const r = spawnSync(process.execPath, ["scripts/mint-test-token.mjs", role], { encoding: "utf8", env: process.env });
  if (r.status !== 0) throw new Error(`mint ${role} failed: ${r.stderr}`);
  return r.stdout.trim().split("\n").pop().trim();
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error("dev server did not start");
}

const errors = [];
// Non-fatal, always-reported notes (e.g. firebase-js-sdk internal assertion
// crashes — an SDK watch-stream bug, not app code; see makeRunner).
const warnings = [];
let n = 0;

// Firestore's realtime channel + analytics/installations occasionally 4xx and
// the SDK just retries — those aren't app bugs, so don't fail the run on them.
const BENIGN = /google-analytics|googletagmanager|firebaseinstallations|firebaselogging|firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel|identitytoolkit.*getProjectConfig/i;

/** Thrown when a mandatory step fails — aborts the run (cleanup still runs). */
class StepFailed extends Error {}

// The firebase-js-sdk occasionally trips its own watch-stream bookkeeping
// under rapid listen churn ("INTERNAL ASSERTION FAILED: Unexpected state
// (ID: ca9/b815)") and wedges that page's client — writes stop acking. It's an
// SDK bug (nothing this app does wrong), so it's reported as a WARNING, and
// the steps hardened with `retry: true` recover from it with a reload (what a
// real user does to a wedged page). If the flow still can't complete, the
// step itself fails the run.
const SDK_INTERNAL = /INTERNAL ASSERTION FAILED/;

function makeRunner(page, role) {
  // Real JS exceptions always fail (except the SDK-internal assertion above).
  page.on("pageerror", (e) => {
    const t = String(e).split("\n")[0].slice(0, 200);
    if (SDK_INTERNAL.test(t)) return warnings.push(`[${role}] sdk: ${t}`);
    errors.push(`[${role}] pageerror: ${t}`);
  });
  // console.error from our code fails; generic "failed to load resource" is a
  // network message handled by the response listener below.
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (t.includes("Failed to load resource")) return;
    if (SDK_INTERNAL.test(t)) return warnings.push(`[${role}] sdk: ${t.slice(0, 160)}`);
    // Transient realtime-listener race while the suite rapidly creates/enters/
    // deletes campaigns: a subscription briefly targets a campaign whose
    // membership context is mid-resolution (same allowance as qa-crawl.mjs,
    // verified there to NOT be a rules bug). Real WRITE permission failures
    // aren't "subscription failed" lines, so they still flag.
    if (/subscription failed.*(insufficient permissions|permission-denied)/i.test(t)) return;
    errors.push(`[${role}] console: ${t.slice(0, 200)}`);
  });
  // Non-benign 4xx/5xx responses fail.
  page.on("response", (res) => {
    if (res.status() < 400) return;
    if (BENIGN.test(res.url())) return;
    errors.push(`[${role}] HTTP ${res.status()} ${res.url().slice(0, 100)}`);
  });
  return {
    page,
    role,
    async shot(name) {
      await sleep(600);
      await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, "0")}-${role}-${name}.png` });
      console.log("  📸", name);
    },
    /** Run a MANDATORY step. Failure = recorded error + FAIL shot + abort.
     * `retry: true` (only on steps written to be IDEMPOTENT — they check
     * server/UI state before mutating, and can start from the main menu)
     * allows one rerun from a freshly-loaded main menu, which replaces a page
     * whose Firestore client the SDK bug above has wedged. */
    async must(label, fn, { retry = false } = {}) {
      for (let attempt = 1; ; attempt++) {
        try {
          await fn();
          console.log("  ✓", label);
          return;
        } catch (e) {
          if (retry && attempt === 1) {
            console.log(`  ↻ ${label} failed (${String(e).split("\n")[0].slice(0, 80)}) — retrying from the main menu`);
            await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
            await sleep(3000);
            continue;
          }
          errors.push(`[${role}] FAILED ${label}: ${String(e).split("\n")[0].slice(0, 180)}`);
          await page.screenshot({ path: `${OUT}/FAIL-${role}-${label}.png` }).catch(() => {});
          throw new StepFailed(`${role}/${label}`);
        }
      }
    },
    async goto(path) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await sleep(1500);
    },
    /** Assert a download really happens (jsPDF export). */
    async download(buttonName) {
      const dl = page.waitForEvent("download", { timeout: 15000 });
      await page.getByRole("button", { name: buttonName }).first().click({ timeout: 4000 });
      const d = await dl;
      console.log("    ↳ download:", await d.suggestedFilename());
    },
    click: (name, opts) => page.getByRole("button", { name, ...opts }).first().click({ timeout: 5000 }),
    see: (text, timeout = 10000) => page.getByText(text).first().waitFor({ state: "visible", timeout }),
  };
}

async function signIn(browser, role) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    acceptDownloads: true,
  });
  const r = makeRunner(await ctx.newPage(), role);
  const token = mint(role);
  await r.page.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
  // Signed-in main menu is up when "Your campaigns" renders.
  await r.page.getByText("Your campaigns").first().waitFor({ state: "visible", timeout: 25000 });
  console.log(`● ${role} signed in`);
  return { ctx, r };
}

/** Poll until `fn` is truthy — for state that settles via a Firestore round
 * trip (no @playwright/test expect() in plain playwright). */
async function eventually(fn, note, timeout = 10000) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${note}`);
    await sleep(300);
  }
}

/** datetime-local value one week out, so the session is always "next". */
function nextWeekLocal() {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T19:00`;
}

/** Enter the test campaign from the main menu (click its card → /sessions).
 * A listen opened moments after the campaign docs were written can be
 * evaluated against a slightly stale snapshot and denied (the transient race
 * qa-crawl documents) — and sessionStore keeps the dead listener, latching
 * "Could not load the schedule." until the campaign is exited. So if the
 * schedule page comes up in that state, bounce to the main menu and re-enter
 * (what a real user would do); the fresh listen resolves cleanly. */
async function enterCampaign(r) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const card = r.page.getByRole("button", { name: new RegExp(CAMPAIGN) }).first();
    await card.waitFor({ state: "visible", timeout: 15000 });
    await card.click();
    if (await scheduleSettled(r)) return;
    console.log(`  · schedule listen denied (stale-snapshot race) — re-entering (${attempt})`);
    await r.goto("/");
  }
  throw new Error("schedule failed to load after 3 campaign entries");
}

/** Wait for /sessions to settle; true = loaded (sessions or the empty state). */
async function scheduleSettled(r) {
  await r.page
    .getByText(/No sessions scheduled yet|Will you answer the call\?|Could not load the schedule\./)
    .first()
    .waitFor({ state: "visible", timeout: 15000 });
  return !(await r.page.getByText("Could not load the schedule.").isVisible());
}

/** Click a campaign-chrome tab (SPA navigation — what real users do). Cold
 * full-page loads start ~8 listens at once through a fresh WebChannel, which
 * is what tickles the SDK's watch-stream assertion (see SDK_INTERNAL); tab
 * clicks keep the working client. */
async function navTab(r, name) {
  await r.page.getByRole("link", { name }).first().click({ timeout: 5000 });
  await sleep(1200);
}

/** Open /sessions inside the campaign — via the tab when the chrome is up,
 * else from the main menu — healing the dead-listener latch (enterCampaign). */
async function openSchedule(r) {
  const tab = r.page.getByRole("link", { name: "Sessions" }).first();
  if (await tab.isVisible().catch(() => false)) {
    await navTab(r, "Sessions");
    if (await scheduleSettled(r)) return;
    console.log("  · schedule listen denied (stale-snapshot race) — re-entering");
  }
  await r.goto("/");
  await enterCampaign(r);
}

/** Land on the campaign's Party page from wherever the runner currently is. */
async function gotoParty(r) {
  if (!(await r.page.getByRole("link", { name: "Party" }).first().isVisible().catch(() => false))) {
    await r.goto("/");
    await enterCampaign(r); // lands on a settled /sessions, chrome up
  }
  await navTab(r, "Party");
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------
async function run(browser) {
  // ---- Signed out: public landing ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const r = makeRunner(await ctx.newPage(), "anon");
    await r.goto("/");
    await r.must("landing", () => r.see("Catacombs"));
    await r.shot("login");
    await ctx.close();
  }

  // ---- DM + player drive one real campaign together ----
  const dm = await signIn(browser, "dm");
  const pl = await signIn(browser, "player");

  // DM: create the bot-seeded test campaign (drops the DM straight into
  // /play), schedule a session, grab the invite code.
  await dm.r.shot("main-menu");
  await dm.r.must("create-campaign", async () => {
    // Idempotent under retry: sweep any half-seeded campaign and start over.
    await purgeTestData("reset");
    await dm.r.goto("/");
    await dm.r.page.getByRole("button", { name: /Create a test campaign/ }).click();
    // Seeding the 5 bots takes a few writes, then it navigates to Play.
    await dm.r.page.getByText("Start a game").first().waitFor({ state: "visible", timeout: 40000 });
    await sleep(2500); // let the fresh docs age (see enterCampaign)
  }, { retry: true });
  await dm.r.shot("play");
  await dm.r.must("add-session", async () => {
    await openSchedule(dm.r);
    const camp = await adb.collection("campaigns").where("dmUid", "==", DM_UID).where("name", "==", CAMPAIGN).get();
    const cid = camp.docs[0]?.id;
    if (!cid) throw new Error("campaign doc not found server-side");
    // Idempotent under retry: only create the session if it isn't there yet.
    let ss = await adb.collection("sessions").where("campaignId", "==", cid).get();
    if (ss.empty) {
      await dm.r.click("Add");
      await dm.r.page.locator("#s-title").fill("E2E Session");
      await dm.r.page.locator("#s-date").fill(nextWeekLocal());
      await dm.r.page.locator("#s-loc").fill("The Sunless Vault");
      await dm.r.click("Save");
      // The Save promise resolves (and the modal closes) only on SERVER ack —
      // the session card behind the modal is just the local echo, so wait for
      // the close before believing anything.
      await dm.r.page.getByText("New session").waitFor({ state: "hidden", timeout: 30000 });
      ss = await adb.collection("sessions").where("campaignId", "==", cid).get();
    }
    // Confirm the doc really committed server-side, and stash its id (the
    // rsvp check + the orphaned-rsvps cleanup both need it).
    if (ss.empty) throw new Error("session doc not found server-side after save");
    for (const s of ss.docs) runSessionIds.add(s.id);
    await dm.r.see("E2E Session");
    await dm.r.see("Will you answer the call?");
  }, { retry: true });
  await dm.r.shot("sessions");
  let inviteCode = "";
  await dm.r.must("invite-code", async () => {
    await gotoParty(dm.r);
    const code = dm.r.page.locator(".invite-code").first();
    await code.waitFor({ state: "visible", timeout: 10000 });
    inviteCode = (await code.innerText()).trim();
    if (!/^[A-Z0-9]{4,8}$/i.test(inviteCode)) throw new Error(`bad invite code "${inviteCode}"`);
  }, { retry: true });
  await dm.r.shot("party-dm-empty");
  // Park the DM on the quiet main menu while the player runs their leg: idling
  // on /party keeps ~6 live listeners hot, and the player's join writes have
  // crashed that idle watcher's SDK once (INTERNAL ASSERTION ca9 — a
  // firebase-js-sdk bug, not app code). The menu holds one listener.
  await navTab(dm.r, "Main menu");

  // Player: forge a hunter through the full five-step builder.
  await pl.r.must("builder-class-skills", async () => {
    await pl.r.page.getByRole("link", { name: "Create hunter" }).click();
    await pl.r.see("Step 1 · Class");
    await pl.r.page.getByRole("button", { name: /^Scout/ }).first().click();
    await pl.r.see("0 of 3 chosen");
    for (const skill of ["Animal Handling", "Athletics", "Investigation"]) {
      await pl.r.page.getByRole("button", { name: skill, exact: true }).click();
    }
    await pl.r.see("✓ 3 of 3 chosen"); // the skill-pick counter completes
    await pl.r.shot("builder-class");
    await pl.r.click("Next");
  });
  await pl.r.must("builder-background", async () => {
    await pl.r.see("Step 2 · Background");
    await pl.r.page.getByRole("button", { name: /^Merchant/ }).first().click();
    await pl.r.shot("builder-background");
    await pl.r.click("Next");
  });
  await pl.r.must("builder-abilities", async () => {
    await pl.r.see("Step 3 · Ability scores");
    // Point buy: all six start at 10 (12 of 27 spent). Raising three to 14
    // costs 5 each — exactly the 15 left.
    for (const ability of ["Dexterity", "Wisdom", "Constitution"]) {
      const inc = pl.r.page.getByLabel(`increase ${ability} base score`);
      for (let i = 0; i < 4; i++) await inc.click();
    }
    await pl.r.see("✓ all spent");
    // Background bonus (+2/+1) on Merchant's eligible abilities (gold tokens).
    await pl.r.page.getByLabel(/Constitution background bonus/).click();
    await pl.r.page.getByLabel(/Constitution background bonus/).click();
    await pl.r.page.getByLabel(/Intelligence background bonus/).click();
    await pl.r.see("✓ 3/3 used");
    await pl.r.shot("builder-abilities");
    await pl.r.click("Next");
  });
  await pl.r.must("builder-armor", async () => {
    await pl.r.see("Step 4 · Armor");
    await pl.r.page.locator("select.select").first().selectOption("hunter-leather-vest");
    await pl.r.see("Open Movement"); // the picked piece's Special text renders
    await pl.r.shot("builder-armor");
    await pl.r.click("Next");
  });
  await pl.r.must("builder-save", async () => {
    await pl.r.see("Step 5 · Details");
    await pl.r.page.locator("#hunter-name").fill(HUNTER);
    await pl.r.see(`${HUNTER}`); // "At a glance" review
    await pl.r.shot("builder-details");
    await pl.r.click("Save hunter");
    // Saved → the play sheet renders.
    await pl.r.page.getByRole("button", { name: "Export PDF" }).waitFor({ state: "visible", timeout: 20000 });
  });
  await pl.r.shot("character-sheet");

  // Player: sheet interactions — trackers, wear/take-off, drop lifecycle.
  await pl.r.must("trackers", async () => {
    await pl.r.page.getByLabel("decrease Hit Points").first().click();
    await pl.r.page.getByLabel("decrease Sanity").first().click();
    await pl.r.see("Madness 1"); // sanity → derived madness
    await pl.r.shot("trackers");
    await pl.r.page.getByLabel("increase Sanity").first().click();
    await pl.r.see("Madness 0");
    await pl.r.page.getByLabel("increase Hit Points").first().click();
    // Tracker edits are FULL-card saves; on ack, playerStore.save() replaces
    // the local card with its own click-time snapshot. A gear patch inside
    // that round-trip window gets its local echo clobbered (UI-only stale
    // state — the server applies both writes fine). Real users click seconds
    // apart; give the last save its round trip before touching gear.
    await sleep(2500);
  });
  await pl.r.must("armor-takeoff-wear", async () => {
    await pl.r.click("Take off"); // the worn vest → inventory
    const wear = pl.r.page.getByRole("button", { name: "Wear" }).first();
    await wear.waitFor({ state: "visible", timeout: 10000 });
    await pl.r.shot("armor-taken-off");
    await wear.click(); // back on the body
    await pl.r.page.getByRole("button", { name: "Take off" }).first().waitFor({ state: "visible", timeout: 10000 });
  });
  await pl.r.must("drop-cancel-confirm-pickup", async () => {
    // − on the LAST unit asks first (#136): cancel keeps it…
    await pl.r.page.getByLabel("remove one Pistol").click();
    await pl.r.see("Drop Pistol?");
    await pl.r.click("Keep it");
    await pl.r.page.getByText("Drop Pistol?").waitFor({ state: "hidden", timeout: 5000 });
    // …confirm moves it to "Recently dropped" (15-min recovery)…
    await pl.r.page.getByLabel("remove one Pistol").click();
    await pl.r.click("Drop it");
    await pl.r.see("Recently dropped");
    await pl.r.shot("recently-dropped");
    // …and Pick up returns it.
    await pl.r.click("Pick up");
    await pl.r.page.getByText("Recently dropped").waitFor({ state: "hidden", timeout: 10000 });
    await pl.r.page.getByLabel("remove one Pistol").waitFor({ state: "visible", timeout: 10000 });
  });
  await pl.r.must("export-pdf", () => pl.r.download("Export PDF"));

  // Player: main-menu hunter card, handbook, profile theme.
  await pl.r.must("main-menu-hunter-card", async () => {
    await pl.r.goto("/");
    await pl.r.page.getByRole("button", { name: `Open ${HUNTER}` }).waitFor({ state: "visible", timeout: 10000 });
  });
  await pl.r.shot("main-menu-hunters");
  await pl.r.must("handbook", async () => {
    await pl.r.goto("/handbook");
    await pl.r.see("Player's Handbook");
    await pl.r.shot("handbook-rules");
    await pl.r.click("Classes");
    await pl.r.page.getByRole("button", { name: /^Scout/ }).first().click();
    await pl.r.see("Hunter's Mark"); // class detail opened
    await pl.r.shot("handbook-class");
    await pl.r.click("Armory");
    await pl.r.see("Main Armor");
    await pl.r.shot("handbook-armory");
  });
  await pl.r.must("profile-theme", async () => {
    await pl.r.goto("/profile");
    await pl.r.see("Appearance");
    await pl.r.page.getByRole("button", { name: /Light/ }).click();
    await pl.r.shot("profile-light");
    await pl.r.page.getByRole("button", { name: /Dark/ }).click();
  });

  // Player: join the DM's campaign with the code, bring the hunter, RSVP.
  await pl.r.must("join-campaign", async () => {
    await pl.r.goto("/");
    await pl.r.click("Join with a code");
    await pl.r.page.locator("#camp-code").fill(inviteCode);
    await pl.r.click("Join", { exact: true });
    await pl.r.page.getByRole("button", { name: new RegExp(CAMPAIGN) }).first()
      .waitFor({ state: "visible", timeout: 15000 });
    await sleep(2000); // let the fresh membership age (see enterCampaign)
    await enterCampaign(pl.r);
    await pl.r.see("E2E Session"); // the DM's session, inside the campaign
  });
  await pl.r.must("rsvp", async () => {
    await pl.r.click("I'm in");
    // Agent accounts are deliberately filtered OUT of the on-screen RSVP list
    // (isTestEmail — so e2e runs don't inflate the "X in" counts), which means
    // the "You're in" echo never renders for us. Assert the real thing
    // instead: the rules-checked rsvp doc must land in Firestore.
    const sid = [...runSessionIds][0];
    if (!sid) throw new Error("no session id recorded for the rsvp check");
    let ok = false;
    for (let i = 0; i < 20 && !ok; i++) {
      const d = await adb.doc(`sessions/${sid}/rsvps/${PLAYER_UID}`).get();
      ok = d.exists && d.data().status === "yes";
      if (!ok) await sleep(500);
    }
    if (!ok) throw new Error("rsvp write did not land in Firestore");
    await pl.r.shot("sessions-rsvp");
  });
  await pl.r.must("bring-hunter-in", async () => {
    await pl.r.goto("/hunter");
    await pl.r.see("Bring a hunter in");
    await pl.r.page.getByRole("button", { name: `Open ${HUNTER}` }).click();
    await pl.r.see(`Your hunter in ${CAMPAIGN}`);
    await pl.r.shot("campaign-hunter");
  });
  await pl.r.must("party-player", async () => {
    await pl.r.goto("/party");
    await pl.r.see("Meet your fellow hunters.");
    // The gallery hides agent-owned hunters by design — expand a bot's card.
    await pl.r.page.getByRole("button", { name: new RegExp(BOT) }).first().click();
    await pl.r.see("Worn armor");
    await pl.r.shot("party-expanded");
  });

  // DM: oversight — roster, DM character control (transformation, Add item,
  // Blood Tinge), export-all.
  await dm.r.must("dm-board", async () => {
    await gotoParty(dm.r);
    await dm.r.see("Characters · DM control");
    await dm.r.see(BOT);
    // The player's hunter must stay hidden from real views (isTestEmail) —
    // assert the by-design filtering actually holds.
    if ((await dm.r.page.getByText(HUNTER).count()) > 0) {
      throw new Error("agent-owned hunter leaked into the DM party view");
    }
    await dm.r.shot("party-roster");
  }, { retry: true });
  // One idempotent step for the whole DM control board: every sub-action
  // checks state first, so a reload-retry never double-applies anything.
  const dmBoard = dm.r.page.locator(".card").filter({ hasText: "Characters · DM control" }).first();
  await dm.r.must("dm-control", async () => {
    // (A retry restarts from the main menu — get back to the board first.)
    if (!(await dmBoard.isVisible().catch(() => false))) await gotoParty(dm.r);
    // (Re)open the first bot row's editor if it isn't open.
    const inc = dm.r.page.getByLabel("increase Transformation");
    if (!(await inc.isVisible().catch(() => false))) {
      await dmBoard.getByRole("button", { name: "Edit", exact: true }).first().click();
      await inc.waitFor({ state: "visible", timeout: 8000 });
    }
    // Transformation is DM-owned: step the level to 2, paced on the OBSERVED
    // value (each + computes from the card, which advances on the round trip).
    const value = inc.locator("xpath=preceding-sibling::span[1]");
    const at = async (v) => (await value.innerText()).trim().startsWith(String(v));
    for (let i = 0; i < 6 && !(await at(2)); i++) {
      await inc.click();
      await sleep(900);
    }
    await eventually(() => at(2), "transformation level 2");
    // Record a rolled persistent result (skipped when a retry already did).
    if (!(await dmBoard.getByText("Mutated Arm").first().isVisible().catch(() => false))) {
      await dm.r.page.getByLabel("record a rolled Transformation").selectOption("mutatedArm");
      await dm.r.see("Mutated Arm");
    }
    // Blood Tinge: grant it ("● Held" = already granted).
    const held = dm.r.page.getByRole("button", { name: "● Held" }).first();
    if (!(await held.isVisible().catch(() => false))) {
      await dm.r.page.getByRole("button", { name: "○ Grant" }).first().click();
      await held.waitFor({ state: "visible", timeout: 8000 });
    }
    // Add an item from the DM catalog (skipped when it already landed).
    if (!(await dmBoard.getByText("Rope", { exact: true }).first().isVisible().catch(() => false))) {
      await dm.r.click("Add item");
      await dm.r.page.getByPlaceholder("Search items…").fill("rope");
      await dm.r.page.getByRole("button", { name: /^Rope/ }).first().click();
      await dm.r.click("Done");
    }
    await dmBoard.getByText("Rope", { exact: true }).first().waitFor({ state: "visible", timeout: 10000 });
    await dm.r.shot("dm-control");
  }, { retry: true });
  await dm.r.must("export-all-pdf", async () => {
    if (!(await dmBoard.isVisible().catch(() => false))) await gotoParty(dm.r);
    await dm.r.download("Export all PDF");
  }, { retry: true });

  // Cleanup through the real UI. Player first (and close their context before
  // the campaign dies, so no live subscriptions get yanked mid-flight).
  await pl.r.must("delete-hunter", async () => {
    await pl.r.goto("/character");
    await pl.r.click("Edit", { exact: true });
    await pl.r.page.getByLabel("Step 5: Details").click();
    await pl.r.click("Delete character");
    await pl.r.click("Yes, delete");
    await pl.r.click("Delete forever");
    await pl.r.see("No hunter yet", 15000);
    await pl.r.shot("hunter-deleted");
  });
  await pl.ctx.close();

  await dm.r.must("delete-campaign", async () => {
    const exists = async () =>
      !(await adb.collection("campaigns").where("dmUid", "==", DM_UID).where("name", "==", CAMPAIGN).get()).empty;
    // Idempotent under retry: a previous attempt may have already deleted it.
    if (await exists()) {
      if (!(await dm.r.page.getByText("Characters · DM control").isVisible().catch(() => false))) {
        await gotoParty(dm.r);
      }
      await dm.r.click("Delete this campaign…");
      await dm.r.click("Continue…");
      await dm.r.page.getByLabel("Type the campaign name to confirm deletion").fill(CAMPAIGN);
      await dm.r.click("Delete forever");
      // Purging bots + scoped docs takes a moment, then it lands on the menu.
      await dm.r.see("Your campaigns", 40000);
    }
    if (await exists()) throw new Error("campaign still exists server-side after delete");
    await dm.r.goto("/");
    const stillThere = await dm.r.page.getByRole("button", { name: new RegExp(`^${CAMPAIGN}`) }).count();
    if (stillThere > 0) throw new Error("campaign card still present after delete");
    await dm.r.shot("campaign-deleted");
  }, { retry: true });
  await dm.ctx.close();
}

// ---------------------------------------------------------------------------
console.log("▶ starting dev server");
// process.execPath = whatever runtime is running this script (node on Windows,
// where Bun breaks firebase/playwright; bun elsewhere) — keeps the spawn portable.
const dev = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(PORT)], { stdio: ["ignore", "ignore", "inherit"], env: process.env });
let browser;
try {
  await waitForServer();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  await purgeTestData("pre-clean");
  browser = await chromium.launch();
  await run(browser);
} catch (e) {
  if (!(e instanceof StepFailed)) errors.push(`fatal: ${String(e).split("\n")[0].slice(0, 200)}`);
} finally {
  await browser?.close();
  dev.kill("SIGTERM");
  try { await purgeTestData("post-clean"); } catch (e) { errors.push(`cleanup failed: ${String(e).slice(0, 200)}`); }
}

console.log(`\n📸 gallery → ${OUT}/  (${n} shots)`);
if (warnings.length) {
  console.log("\nℹ warnings (non-fatal — see SDK_INTERNAL note):");
  for (const w of [...new Set(warnings)]) console.log("  -", w);
}
if (errors.length) {
  console.log("\n⚠ failures:");
  for (const e of [...new Set(errors)]) console.log("  -", e);
  process.exit(1);
}
console.log("✓ all steps passed, no console/page/HTTP errors");
process.exit(0);
