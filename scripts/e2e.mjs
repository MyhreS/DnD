// End-to-end self-QA: sign in for real (via the agent-test custom token) and
// drive Playwright through every page, writing a screenshot gallery to
// screenshots/ and reporting console errors. Run on meaningful changes.
//
//   bun run e2e            (= doppler run -- bun scripts/e2e.mjs)
//
// Needs AGENT_TEST_SA + VITE_FIREBASE_* in the env (provided by `doppler run`).
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

// Pages to capture per role: [routePath, screenshotName]
const FLOWS = {
  player: [["/", "01-sessions"], ["/character", "02-character"], ["/party", "03-party"], ["/handbook", "04-handbook"], ["/profile", "05-profile"]],
  admin: [["/profile", "06-admin-profile"], ["/party", "07-admin-party"]],
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log("▶ starting dev server");
const dev = spawn("bunx", ["vite", "--port", String(PORT)], { stdio: ["ignore", "ignore", "inherit"], env: process.env });
await waitForServer();

const browser = await chromium.launch();
const allErrors = [];
try {
  for (const [role, flow] of Object.entries(FLOWS)) {
    const token = mint(role);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") allErrors.push(`[${role}] ${m.text()}`); });
    page.on("pageerror", (e) => allErrors.push(`[${role}] ${String(e)}`));
    // sign in once (token saved to localStorage), then walk the pages
    await page.goto(`${BASE}/?testToken=${token}`, { waitUntil: "domcontentloaded" });
    await sleep(4500);
    for (const [path, name] of flow) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await sleep(2500);
      await page.screenshot({ path: `${OUT}/${name}.png` });
      console.log("  ✓", name);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  dev.kill("SIGTERM");
}

console.log(`\n📸 gallery → ${OUT}/`);
if (allErrors.length) {
  console.log("\n⚠ console errors:");
  for (const e of [...new Set(allErrors)]) console.log("  -", e);
  process.exit(1);
}
console.log("✓ no console errors");
process.exit(0);
