import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { initializeApp as initializeAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClient } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { chromium } from "playwright";

const PORT = 5202;
const BASE = `http://127.0.0.1:${PORT}`;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) throw new Error("Missing Firebase test configuration.");

const admin = initializeAdmin({ projectId }, "workshop-e2e");
const auth = getAdminAuth(admin);
const db = getAdminFirestore(admin);
const simonUid = "workshop-e2e-simon";
const creatorUid = "workshop-e2e-creator";
const outsiderUid = "workshop-e2e-outsider";
const creatorEmail = "christopher-workshop@example.test";

async function user(uid, email, displayName) {
  try { await auth.deleteUser(uid); } catch { /* absent */ }
  await auth.createUser({ uid, email, displayName, emailVerified: true });
  return auth.createCustomToken(uid);
}

const [simonToken, creatorToken, outsiderToken] = await Promise.all([
  user(simonUid, "simonmyhre1@gmail.com", "Simon Myhre"),
  user(creatorUid, creatorEmail, "Christopher Creator"),
  user(outsiderUid, "outsider-workshop@example.test", "Outside User"),
]);

const server = spawn("bunx", ["vite", "--config", "vite.workshop.config.ts", "--host", "127.0.0.1", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, VITE_FIREBASE_EMULATORS: "1" },
});

async function ready() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* starting */ }
    await sleep(200);
  }
  throw new Error("Workshop Vite server did not start.");
}

function watch(page, errors, allowForbidden = false) {
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("400") && !(allowForbidden && message.text().includes("403"))) errors.push(message.text());
  });
}

async function openAs(browser, token, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${BASE}/?testToken=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" });
  return { context, page };
}

async function waitForWorkspace(page, label) {
  try {
    await page.getByRole("heading", { name: "What should we improve?" }).waitFor();
  } catch (error) {
    const body = await page.locator("body").innerText().catch(() => "<unreadable>");
    throw new Error(`${label} did not enter the Workshop. Page text:\n${body}\n${error}`);
  }
}

async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (size.scroll > size.client) throw new Error(`${label} horizontally overflows: ${JSON.stringify(size)}`);
}

async function runManager(fixture) {
  const child = spawn("bun", ["scripts/workshop-manager.ts", "--once", `--fixture=${fixture}`], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  const code = await new Promise((resolve) => child.on("exit", resolve));
  if (code !== 0) throw new Error(`Fixture manager failed (${code}): ${output}`);
}

async function ruleClient(name, token) {
  const app = initializeClient({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    appId: process.env.VITE_FIREBASE_APP_ID,
  }, `workshop-${name}`);
  const clientAuth = getAuth(app);
  const clientDb = getFirestore(app);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
  await signInWithCustomToken(clientAuth, token);
  return clientDb;
}

async function expectDenied(action, label) {
  let denied = false;
  try { await action(); } catch (error) { denied = String(error?.code ?? error).includes("permission-denied"); }
  if (!denied) throw new Error(`${label} was not denied by security rules.`);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
let ticketId;
try {
  await ready();
  const simon = await openAs(browser, simonToken, { width: 1440, height: 900 });
  watch(simon.page, errors);
  await waitForWorkspace(simon.page, "Simon");
  await simon.page.getByRole("button", { name: "Invite someone" }).click();
  await simon.page.getByTestId("invite-email").fill(creatorEmail);
  await simon.page.getByTestId("invite-submit").click();
  await simon.page.getByText(`${creatorEmail} can now sign in.`).waitFor();

  const outsider = await openAs(browser, outsiderToken, { width: 390, height: 844 });
  watch(outsider.page, errors, true);
  await outsider.page.getByRole("heading", { name: "D&D Workshop" }).waitFor();
  await outsider.page.getByText("has not been invited").waitFor();

  const creator = await openAs(browser, creatorToken, { width: 390, height: 844 });
  watch(creator.page, errors);
  await waitForWorkspace(creator.page, "Creator");
  await creator.page.getByTestId("agent-presence").getByText("Agent offline").waitFor();
  await creator.page.getByText("Ask Simon to start the Workshop agent.").waitFor();
  await creator.page.getByTestId("ticket-body").fill("Make the game page calmer\nOnly show the most important action first.");
  await creator.page.locator('.composer input[type="file"]').setInputFiles({
    name: "game-page.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await creator.page.getByTestId("send-ticket").click();
  const detail = creator.page.getByTestId("ticket-detail");
  await detail.waitFor();
  await detail.getByText("Received. I’ll pick this up").waitFor();
  ticketId = (await db.collection("workshopTickets").where("authorUid", "==", creatorUid).limit(1).get()).docs[0]?.id;
  if (!ticketId) throw new Error("Ticket was not created.");
  if (await detail.getByRole("button", { name: /delete|edit/i }).count()) throw new Error("Thread exposes destructive edit/delete controls.");
  await detail.getByRole("button", { name: "Close thread" }).click();
  await noOverflow(creator.page, "Workshop mobile");
  await creator.page.screenshot({ path: "screenshots/workshop-mobile.png", fullPage: true });

  const creatorDb = await ruleClient("creator", creatorToken);
  const outsiderDb = await ruleClient("outsider", outsiderToken);
  if (!(await getDoc(doc(creatorDb, "workshopTickets", ticketId))).exists()) throw new Error("Invited creator cannot read the ticket.");
  await expectDenied(() => updateDoc(doc(creatorDb, "workshopTickets", ticketId), { title: "edited" }), "Ticket edit");
  await expectDenied(() => deleteDoc(doc(creatorDb, "workshopTickets", ticketId)), "Ticket deletion");
  await expectDenied(() => getDoc(doc(outsiderDb, "workshopTickets", ticketId)), "Outsider ticket read");

  await runManager("finished");
  await creator.page.getByTestId("agent-presence").getByText("Agent online").waitFor();
  await creator.page.getByText("Finished", { exact: true }).waitFor();
  await creator.page.getByTestId(`ticket-${ticketId}`).click();
  await creator.page.getByText("requested test update is available now", { exact: false }).waitFor();
  await creator.page.getByTestId("ticket-reply").fill("Please also reduce the number of buttons.");
  await creator.page.getByTestId("send-reply").click();
  await creator.page.getByText("Update received. The agent will reread").waitFor();
  await creator.page.getByRole("button", { name: "Close thread" }).click();
  await creator.page.getByText("Not done", { exact: true }).waitFor();

  await runManager("needs_simon");
  await creator.page.getByText("Needs Simon", { exact: true }).waitFor();
  await creator.page.getByTestId(`ticket-${ticketId}`).click();
  await creator.page.getByText("I need Simon to decide one thing", { exact: false }).waitFor();

  await creator.page.setViewportSize({ width: 1440, height: 900 });
  await creator.page.getByRole("button", { name: "Close thread" }).click();
  await noOverflow(creator.page, "Workshop desktop");
  await creator.page.screenshot({ path: "screenshots/workshop-desktop.png", fullPage: true });
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Workshop E2E passed: invite gate, image ticket, immutable thread UI, heartbeat, finished/reopened/Needs Simon flow, and responsive layout.");
  await Promise.all([simon.context.close(), creator.context.close(), outsider.context.close()]);
} finally {
  await browser.close();
  server.kill("SIGTERM");
  const tickets = await db.collection("workshopTickets").get();
  await Promise.allSettled([
    ...tickets.docs.map((item) => db.recursiveDelete(item.ref)),
    db.doc(`workshopMembers/${simonUid}`).delete(),
    db.doc(`workshopMembers/${creatorUid}`).delete(),
    db.doc(`workshopInvites/${creatorEmail}`).delete(),
    db.doc("workshopAgent/state").delete(),
    auth.deleteUser(simonUid),
    auth.deleteUser(creatorUid),
    auth.deleteUser(outsiderUid),
  ]);
}
process.exit(0);
