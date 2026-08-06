import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { initializeApp as initializeAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClient } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { connectStorageEmulator, getStorage, ref, uploadBytes } from "firebase/storage";
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
const thomasUid = "workshop-e2e-thomas";
const outsiderUid = "workshop-e2e-outsider";
const creatorEmail = "myhrefjeld@gmail.com";
const thomasEmail = "thmyhre9@gmail.com";

async function user(uid, email, displayName) {
  try { await auth.deleteUser(uid); } catch { /* absent */ }
  await auth.createUser({ uid, email, displayName, emailVerified: true });
  return auth.createCustomToken(uid);
}

const [simonToken, creatorToken, thomasToken, outsiderToken] = await Promise.all([
  user(simonUid, "simonmyhre1@gmail.com", "Simon Myhre"),
  user(creatorUid, creatorEmail, "Christopher Creator"),
  user(thomasUid, thomasEmail, "Thomas Myhre"),
  user(outsiderUid, "outsider-workshop@example.test", "Outside User"),
]);
await db.doc(`workshopMembers/${outsiderUid}`).set({
  email: "outsider-workshop@example.test",
  name: "Stale invited user",
  role: "creator",
});

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

function watch(page, errors, allowForbidden = false, allowMissingImage = false) {
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    const expected = message.text().includes("400")
      || (allowForbidden && message.text().includes("403"))
      || (allowMissingImage && message.text().includes("404 (Not Found)"));
    if (message.type() === "error" && !expected) errors.push(message.text());
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

async function assertScrollable(locator, label) {
  const metrics = await locator.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  if (metrics.scrollHeight <= metrics.clientHeight || !["auto", "scroll"].includes(metrics.overflowY)) {
    throw new Error(`${label} is not vertically scrollable: ${JSON.stringify(metrics)}`);
  }
  await locator.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  if (await locator.evaluate((element) => element.scrollTop) <= 0) throw new Error(`${label} did not scroll.`);
  await locator.evaluate((element) => { element.scrollTop = 0; });
}

async function pasteImages(locator, files) {
  const payload = files.map((file) => ({
    name: file.name,
    type: file.mimeType,
    base64: file.buffer.toString("base64"),
  }));
  await locator.evaluate((element, pasted) => {
    const clipboard = new DataTransfer();
    pasted.forEach((file) => {
      const bytes = Uint8Array.from(atob(file.base64), (character) => character.charCodeAt(0));
      clipboard.items.add(new File([bytes], file.name, { type: file.type }));
    });
    element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: clipboard }));
  }, payload);
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

function startManager(fixture) {
  const child = spawn("bun", ["scripts/workshop-manager.ts", `--fixture=${fixture}`], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  return {
    output: () => output,
    stop: async () => {
      child.kill("SIGTERM");
      const code = await new Promise((resolve) => child.on("exit", resolve));
      if (code !== 0) throw new Error(`Continuous fixture manager failed (${code}): ${output}`);
    },
  };
}

async function ruleClient(name, token) {
  const app = initializeClient({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    appId: process.env.VITE_FIREBASE_APP_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  }, `workshop-${name}`);
  const clientAuth = getAuth(app);
  const clientDb = getFirestore(app);
  const clientFunctions = getFunctions(app, "europe-west1");
  const clientStorage = getStorage(app);
  connectAuthEmulator(clientAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(clientDb, "127.0.0.1", 8080);
  connectFunctionsEmulator(clientFunctions, "127.0.0.1", 5001);
  connectStorageEmulator(clientStorage, "127.0.0.1", 9199);
  await signInWithCustomToken(clientAuth, token);
  return { db: clientDb, functions: clientFunctions, storage: clientStorage };
}

async function expectDenied(action, label) {
  let denied = false;
  try { await action(); } catch (error) { denied = String(error?.code ?? error).includes("permission-denied"); }
  if (!denied) throw new Error(`${label} was not denied by security rules.`);
}

async function expectCode(action, code, label) {
  let matched = false;
  let actual = "resolved successfully";
  try { await action(); } catch (error) {
    actual = String(error?.code ?? error);
    matched = actual.includes(code);
  }
  if (!matched) throw new Error(`${label} did not fail with ${code}; it ${actual}.`);
}

async function eventually(check, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await check()) return;
    await sleep(50);
  }
  throw new Error(`${label} did not become true.`);
}

const browser = await chromium.launch({ headless: true });
const errors = [];
let ticketId;
try {
  await ready();
  const simon = await openAs(browser, simonToken, { width: 1440, height: 900 });
  watch(simon.page, errors);
  await waitForWorkspace(simon.page, "Simon");
  if (await simon.page.getByRole("button", { name: /invite/i }).count()) throw new Error("Workshop still exposes invitations.");

  const outsider = await openAs(browser, outsiderToken, { width: 390, height: 844 });
  watch(outsider.page, errors, true);
  await outsider.page.getByRole("heading", { name: "D&D Workshop" }).waitFor();
  await outsider.page.getByText("does not have access to the Workshop").waitFor();
  await noOverflow(outsider.page, "Denied Workshop mobile");
  await outsider.page.screenshot({ path: "screenshots/workshop-denied-mobile.png", fullPage: true });

  const thomas = await openAs(browser, thomasToken, { width: 1440, height: 900 });
  watch(thomas.page, errors);
  await waitForWorkspace(thomas.page, "Thomas");
  await noOverflow(thomas.page, "Thomas Workshop desktop");
  await thomas.page.screenshot({ path: "screenshots/workshop-thomas-desktop.png", fullPage: true });

  const creator = await openAs(browser, creatorToken, { width: 390, height: 844 });
  watch(creator.page, errors, false, true);
  await waitForWorkspace(creator.page, "Creator");
  await creator.page.getByTestId("workshop-tip").getByText("Paste screenshots directly with ⌘V or Ctrl+V.", { exact: false }).waitFor();
  await creator.page.getByTestId("agent-presence").getByText("Agent offline").waitFor();
  await creator.page.getByText("Ask Simon to start the Workshop agent.").waitFor();
  if (await creator.page.getByTestId("agent-countdown").count()) throw new Error("Workshop still shows a polling countdown.");

  const triggerManager = startManager("finished");
  try {
    await eventually(async () => {
      const state = (await db.doc("workshopAgent/state").get()).data();
      return state?.watchingChanges === true
        && state?.triggerMode === "realtime_with_fallback"
        && state?.fallbackIntervalMs === 5 * 60_000;
    }, "Real-time request listener");
    await creator.page.getByTestId("agent-presence").getByText("Agent online").waitFor();
    const triggerProbe = db.doc("workshopTickets/realtime-trigger-probe");
    const triggerStartedAt = Date.now();
    await triggerProbe.set({
      title: "Real-time trigger probe",
      status: "not_done",
      authorUid: creatorUid,
      authorEmail: creatorEmail,
      authorName: "Christopher Creator",
      createdAt: new Date(),
      updatedAt: new Date(),
      readAtBy: {},
      revision: 1,
      nextSequence: 1,
      attachmentCount: 0,
      needsSimonApproved: false,
      leasedBy: null,
      leaseExpiresAt: null,
    });
    await eventually(async () => (await triggerProbe.get()).data()?.status === "finished", "Immediate request trigger");
    if (Date.now() - triggerStartedAt > 5_000) throw new Error("Workshop request waited instead of triggering immediately.");

    await creator.page.getByTestId("ticket-realtime-trigger-probe").click();
    await creator.page.getByTestId("ticket-reply").fill("Start this follow-up without waiting for the recovery check.");
    const replyStartedAt = Date.now();
    await creator.page.getByTestId("ticket-reply").press("Enter");
    await creator.page.getByTestId("send-reply").getByText("Sent ✓", { exact: true }).waitFor();
    await eventually(async () => {
      const ticket = (await triggerProbe.get()).data();
      return ticket?.status === "finished" && ticket?.lastCompletedRevision === 2;
    }, "Immediate reply trigger");
    if (Date.now() - replyStartedAt > 5_000) throw new Error("Workshop reply waited instead of triggering immediately.");
    await creator.page.getByRole("button", { name: "Close thread" }).click();
    await db.recursiveDelete(triggerProbe);
  } catch (error) {
    throw new Error(`${error}\nManager output:\n${triggerManager.output()}`);
  } finally {
    await triggerManager.stop();
  }
  const composerFileInput = creator.page.locator('.composer input[type="file"]');
  await composerFileInput.setInputFiles({ name: "unsafe.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await creator.page.getByText("Use JPG, PNG, WebP, or GIF images.", { exact: true }).waitFor();
  if (await creator.page.getByTestId("attachment-previews").count()) throw new Error("Unsafe image appeared in the preview list.");
  await creator.page.getByTestId("ticket-body").fill("Make the game page calmer");
  await creator.page.getByTestId("ticket-body").press("Shift+Enter");
  await creator.page.getByTestId("ticket-body").pressSequentially("Only show the most important action first.");
  const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const ticketBody = creator.page.getByTestId("ticket-body");
  await pasteImages(ticketBody, [{ name: "pasted-game-page.png", mimeType: "image/png", buffer: tinyPng }]);
  await creator.page.getByRole("button", { name: "Remove pasted-game-page.png" }).waitFor();
  await pasteImages(ticketBody, Array.from({ length: 5 }, (_, index) => ({ name: `too-many-${index}.png`, mimeType: "image/png", buffer: tinyPng })));
  await creator.page.getByText("Add up to 5 images.", { exact: true }).waitFor();
  if (await creator.page.getByTestId("attachment-previews").locator(".attachment-preview").count() !== 1) throw new Error("Invalid clipboard batch changed the selected images.");
  await composerFileInput.setInputFiles({ name: "remove-me.png", mimeType: "image/png", buffer: tinyPng });
  await creator.page.getByTestId("attachment-previews").locator(".attachment-preview").nth(1).waitFor();
  await creator.page.getByRole("button", { name: "Remove remove-me.png" }).click();
  if (await creator.page.getByTestId("attachment-previews").locator(".attachment-preview").count() !== 1) throw new Error("Selected image was not removed.");
  await creator.page.evaluate(() => {
    Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });
  await creator.page.getByText("Offline · your draft is saved", { exact: true }).waitFor();
  if (await creator.page.getByTestId("send-ticket").isEnabled()) throw new Error("Offline composer remained enabled.");
  await creator.page.screenshot({ path: "screenshots/workshop-offline-draft-mobile.png", fullPage: true });
  await creator.page.evaluate(() => {
    Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => true });
    window.dispatchEvent(new Event("online"));
  });
  await creator.page.getByText("Draft saved", { exact: true }).waitFor();
  await creator.page.getByTestId("ticket-body").press("Enter");
  await creator.page.getByTestId("send-ticket").getByText("Sent ✓", { exact: true }).waitFor();
  const detail = creator.page.getByTestId("ticket-detail");
  await detail.waitFor();
  await detail.getByText("Received. The Workshop agent").waitFor();
  await creator.page.keyboard.press("Shift+Tab");
  if (await creator.page.evaluate(() => document.activeElement?.getAttribute("data-testid")) !== "ticket-reply") throw new Error("Dialog focus did not wrap to its last control.");
  await creator.page.keyboard.press("Tab");
  if (await creator.page.evaluate(() => document.activeElement?.getAttribute("aria-label")) !== "Close thread") throw new Error("Dialog focus escaped into the page behind it.");
  ticketId = (await db.collection("workshopTickets").where("authorUid", "==", creatorUid).limit(1).get()).docs[0]?.id;
  if (!ticketId) throw new Error("Ticket was not created.");
  await eventually(async () => Boolean((await db.doc(`workshopTickets/${ticketId}`).get()).data()?.readAtBy?.[creatorUid]), "Creator read receipt");
  await simon.page.getByTestId(`ticket-${ticketId}`).waitFor();
  if (!(await simon.page.getByTestId(`ticket-${ticketId}`).getAttribute("aria-label"))?.includes("unread")) throw new Error("Simon did not see the new request as unread.");
  await simon.page.getByTestId(`ticket-${ticketId}`).click();
  await simon.page.getByRole("button", { name: "Close thread" }).click();
  await eventually(async () => Boolean((await db.doc(`workshopTickets/${ticketId}`).get()).data()?.readAtBy?.[simonUid]), "Simon read receipt");
  await eventually(async () => !(await simon.page.getByTestId(`ticket-${ticketId}`).getAttribute("aria-label"))?.includes("unread"), "Read marker clearing");
  if (await detail.getByRole("button", { name: /delete|edit/i }).count()) throw new Error("Thread exposes destructive edit/delete controls.");
  await detail.getByRole("button", { name: "Close thread" }).click();
  await pasteImages(ticketBody, [{ name: "pasted-image-only.png", mimeType: "image/png", buffer: tinyPng }]);
  await ticketBody.press("Enter");
  await creator.page.getByRole("heading", { name: "Image request" }).waitFor();
  const imageOnlyTicket = (await db.collection("workshopTickets").where("title", "==", "Image request").limit(1).get()).docs[0];
  if (!imageOnlyTicket || imageOnlyTicket.data().attachmentCount !== 1) throw new Error("Image-only request was not created correctly.");
  const imageOnlyMessages = await imageOnlyTicket.ref.collection("messages").orderBy("sequence", "asc").get();
  if (imageOnlyMessages.docs[0]?.data().body !== "") throw new Error("Image-only request stored unexpected text.");
  await creator.page.getByRole("button", { name: "Close thread" }).click();
  await imageOnlyTicket.ref.update({ status: "finished" });

  const longThreadId = "long-conversation";
  const longThreadRef = db.doc(`workshopTickets/${longThreadId}`);
  await longThreadRef.set({
    title: "Long conversation with an image problem",
    status: "finished",
    authorUid: creatorUid,
    authorEmail: creatorEmail,
    authorName: "Christopher Creator",
    createdAt: new Date(Date.now() - 3_600_000),
    updatedAt: new Date(),
    readAtBy: {},
    revision: 1,
    nextSequence: 31,
    attachmentCount: 1,
    needsSimonApproved: false,
    leasedBy: null,
    leaseExpiresAt: null,
  });
  await Promise.all(Array.from({ length: 30 }, (_, index) => longThreadRef.collection("messages").doc(`message-${String(index + 1).padStart(2, "0")}`).set({
    kind: index === 0 ? "request" : "follow_up",
    body: `Conversation note ${index + 1}`,
    authorUid: creatorUid,
    authorName: "Christopher Creator",
    attachments: index === 4 ? [{
      name: "missing-image.png",
      path: `workshop/${creatorUid}/${crypto.randomUUID()}/${crypto.randomUUID()}-missing-image.png`,
      contentType: "image/png",
      size: 42,
    }] : [],
    sequence: index + 1,
    createdAt: new Date(Date.now() - (30 - index) * 30_000),
  })));
  await Promise.all(Array.from({ length: 16 }, (_, index) => db.collection("workshopTickets").doc(`scroll-fixture-${index}`).set({
    title: `History request ${index + 1}`,
    status: "doing_now",
    authorUid: "scroll-fixture",
    authorEmail: "scroll-fixture@example.test",
    authorName: "History fixture",
    createdAt: new Date(Date.now() - (index + 1) * 60_000),
    updatedAt: new Date(Date.now() - (index + 1) * 60_000),
    revision: 1,
    nextSequence: 1,
    attachmentCount: 0,
    needsSimonApproved: false,
    leasedBy: null,
    leaseExpiresAt: null,
  })));
  const requestList = creator.page.getByTestId("ticket-list");
  await requestList.locator("li").nth(18).waitFor();
  await assertScrollable(requestList, "Workshop mobile request list");
  const requestSearch = creator.page.getByTestId("ticket-search");
  await requestSearch.fill("History request 9");
  await creator.page.getByRole("button", { name: /History request 9/ }).waitFor();
  if (await creator.page.getByTestId("ticket-list").locator("li").count() !== 1) throw new Error("Request search returned unrelated results.");
  await requestSearch.fill("nothing matches this phrase");
  await creator.page.getByTestId("empty-search").waitFor();
  await requestSearch.fill("");
  await requestList.locator("li").nth(18).waitFor();
  await noOverflow(creator.page, "Workshop mobile");
  await creator.page.screenshot({ path: "screenshots/workshop-long-list-mobile.png", fullPage: true });
  await creator.page.screenshot({ path: "screenshots/workshop-mobile.png", fullPage: true });

  await requestSearch.fill("Long conversation");
  await creator.page.getByTestId(`ticket-${longThreadId}`).click();
  await creator.page.getByText("Conversation note 30", { exact: true }).waitFor();
  const messageList = creator.page.getByTestId("message-list");
  await eventually(async () => messageList.evaluate((element) => element.scrollTop > 0 && element.scrollHeight > element.clientHeight), "Conversation opening at latest message");
  await creator.page.getByText("Image unavailable", { exact: true }).waitFor();
  await creator.page.getByRole("button", { name: "Try again" }).click();
  await creator.page.getByText("Image unavailable", { exact: true }).waitFor();
  await messageList.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event("scroll")); });
  await longThreadRef.collection("messages").doc("message-31").set({
    kind: "agent",
    body: "A new reply arrived while reading older messages.",
    authorUid: "workshop-agent",
    authorName: "Workshop agent",
    attachments: [],
    sequence: 31,
    createdAt: new Date(),
  });
  await longThreadRef.update({ updatedAt: new Date(), nextSequence: 32 });
  await creator.page.getByRole("button", { name: "New message ↓" }).waitFor();
  await creator.page.screenshot({ path: "screenshots/workshop-long-thread-mobile.png", fullPage: true });
  await creator.page.getByRole("button", { name: "New message ↓" }).click();
  await eventually(async () => messageList.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight < 90), "Jump to latest message");
  const ticketReply = creator.page.getByTestId("ticket-reply");
  await pasteImages(ticketReply, [{ name: "pasted-reply-image.png", mimeType: "image/png", buffer: tinyPng }]);
  await ticketReply.press("Enter");
  await creator.page.getByTestId("send-reply").getByText("Sent ✓", { exact: true }).waitFor();
  const longMessages = await longThreadRef.collection("messages").get();
  const imageOnlyReply = longMessages.docs.map((item) => item.data()).find((message) => message.kind === "follow_up" && message.sequence === 32);
  if (!imageOnlyReply || imageOnlyReply.body !== "" || imageOnlyReply.attachments?.length !== 1) throw new Error("Image-only reply was not stored correctly.");
  await longThreadRef.update({ status: "finished" });
  await creator.page.keyboard.press("Escape");
  await requestSearch.fill("");

  const creatorClient = await ruleClient("creator", creatorToken);
  const thomasClient = await ruleClient("thomas", thomasToken);
  const outsiderClient = await ruleClient("outsider", outsiderToken);
  if (!(await getDoc(doc(creatorClient.db, "workshopTickets", ticketId))).exists()) throw new Error("Invited creator cannot read the ticket.");
  if (!(await getDoc(doc(thomasClient.db, "workshopTickets", ticketId))).exists()) throw new Error("Thomas cannot read Workshop tickets.");
  await expectDenied(() => updateDoc(doc(creatorClient.db, "workshopTickets", ticketId), { title: "edited" }), "Ticket edit");
  await expectDenied(() => deleteDoc(doc(creatorClient.db, "workshopTickets", ticketId)), "Ticket deletion");
  await expectDenied(() => getDoc(doc(outsiderClient.db, "workshopTickets", ticketId)), "Outsider ticket read");

  const createDirect = httpsCallable(creatorClient.functions, "createWorkshopTicket");
  const duplicateSubmissionId = crypto.randomUUID();
  const duplicatePayload = { body: "Retry-safe request", attachments: [], submissionId: duplicateSubmissionId };
  await createDirect(duplicatePayload);
  await createDirect(duplicatePayload);
  const duplicateTicket = await db.doc(`workshopTickets/${duplicateSubmissionId}`).get();
  const duplicateMessages = await duplicateTicket.ref.collection("messages").get();
  if (!duplicateTicket.exists || duplicateMessages.size !== 2) throw new Error("Retry created duplicate Workshop content.");
  const replyDirect = httpsCallable(creatorClient.functions, "replyWorkshopTicket");
  const duplicateReplyId = crypto.randomUUID();
  const duplicateReply = { ticketId: duplicateSubmissionId, body: "Retry-safe reply", attachments: [], submissionId: duplicateReplyId };
  await replyDirect(duplicateReply);
  await replyDirect(duplicateReply);
  const afterDuplicateReply = await duplicateTicket.ref.get();
  const afterDuplicateMessages = await duplicateTicket.ref.collection("messages").get();
  if (afterDuplicateReply.data()?.revision !== 2 || afterDuplicateMessages.size !== 4) throw new Error("Reply retry created duplicate Workshop content.");
  await duplicateTicket.ref.update({ status: "finished" });

  const unsafeDraftId = crypto.randomUUID();
  const unsafeFileId = `${crypto.randomUUID()}-unsafe.svg`;
  await expectCode(() => createDirect({
    body: "Unsafe attachment",
    submissionId: crypto.randomUUID(),
    attachments: [{ name: "unsafe.svg", path: `workshop/${creatorUid}/${unsafeDraftId}/${unsafeFileId}`, contentType: "image/svg+xml", size: 6 }],
  }), "invalid-argument", "Unsafe callable attachment");
  await expectCode(() => uploadBytes(
    ref(creatorClient.storage, `workshop/${creatorUid}/${unsafeDraftId}/${unsafeFileId}`),
    new Blob(["<svg/>"]),
    { contentType: "image/svg+xml" },
  ), "unauthorized", "Unsafe Storage upload");
  await runManager("finished");
  await creator.page.getByTestId("agent-presence").getByText("Agent online").waitFor();
  await creator.page.getByTestId(`ticket-${ticketId}`).getByText("Finished", { exact: true }).waitFor();
  await creator.page.getByTestId(`ticket-${ticketId}`).click();
  await creator.page.getByText("requested test update is available now", { exact: false }).waitFor();
  if (await creator.page.getByText("Received. The Workshop agent will start automatically when it is online.", { exact: true }).count()) {
    throw new Error("The initial queue acknowledgement remained visible after the agent picked up the request.");
  }
  await creator.page.getByTestId("ticket-reply").fill("Keep this unsent draft when I close the thread.");
  await creator.page.getByText("Draft saved", { exact: true }).waitFor();
  await creator.page.keyboard.press("Escape");
  await creator.page.getByTestId(`ticket-${ticketId}`).click();
  if (await creator.page.getByTestId("ticket-reply").inputValue() !== "Keep this unsent draft when I close the thread.") throw new Error("Reply draft was lost when the thread closed.");
  await creator.page.getByTestId("ticket-reply").fill("Please also reduce the number of buttons.");
  await creator.page.getByTestId("ticket-reply").press("Enter");
  await creator.page.getByTestId("send-reply").getByText("Sent ✓", { exact: true }).waitFor();
  await creator.page.getByText("Update received. The agent will reread").waitFor();
  await creator.page.screenshot({ path: "screenshots/workshop-sent-feedback-mobile.png", fullPage: true });
  await creator.page.getByRole("button", { name: "Close thread" }).click();
  await creator.page.getByText("Not done", { exact: true }).waitFor();

  await runManager("needs_simon");
  await creator.page.getByText("Needs Simon", { exact: true }).waitFor();
  await creator.page.getByTestId(`ticket-${ticketId}`).click();
  await creator.page.getByText("I need Simon to decide one thing", { exact: false }).waitFor();
  await creator.page.getByText("Only Simon’s reply in this thread can restart this task.", { exact: true }).waitFor();
  await creator.page.locator(".detail-backdrop").evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });
  await creator.page.screenshot({ path: "screenshots/workshop-needs-simon-mobile.png", fullPage: true });

  await creator.page.getByTestId("ticket-reply").fill("Please reconsider this with the new information.");
  await creator.page.getByTestId("send-reply").click();
  await creator.page.getByTestId("send-reply").getByText("Sent ✓", { exact: true }).waitFor();
  await creator.page.getByText("still waiting for Simon to reply in this thread", { exact: false }).waitFor();
  await creator.page.getByRole("button", { name: "Close thread" }).click();
  await creator.page.getByText("Needs Simon", { exact: true }).waitFor();
  const afterCreatorReply = (await db.doc(`workshopTickets/${ticketId}`).get()).data();
  if (afterCreatorReply?.status !== "needs_simon" || afterCreatorReply?.needsSimonApproved === true) {
    throw new Error("Christopher incorrectly unblocked a Needs Simon task.");
  }

  await simon.page.getByTestId(`ticket-${ticketId}`).click();
  await simon.page.getByText("Only Simon’s reply in this thread can restart this task.", { exact: true }).waitFor();
  await simon.page.getByTestId("ticket-reply").fill("Simon approves continuing with the updated request.");
  await simon.page.getByTestId("send-reply").click();
  await simon.page.getByText("Simon answered. The agent will reread the whole thread.", { exact: true }).waitFor();
  await simon.page.getByRole("button", { name: "Close thread" }).click();
  await creator.page.getByText("Not done", { exact: true }).waitFor();
  const afterSimonReply = (await db.doc(`workshopTickets/${ticketId}`).get()).data();
  if (afterSimonReply?.status !== "not_done" || afterSimonReply?.needsSimonApproved !== true) {
    throw new Error("Simon did not unblock the Needs Simon task.");
  }

  await runManager("declined");
  if ((await db.doc(`workshopTickets/${ticketId}`).get()).data()?.needsSimonApproved !== false) {
    throw new Error("Simon approval was not consumed after the next agent run.");
  }
  await creator.page.getByText("Declined", { exact: true }).waitFor();
  await creator.page.getByTestId(`ticket-${ticketId}`).click();
  await creator.page.getByText("Declined — This test request cannot be completed safely.", { exact: true }).waitFor();
  await creator.page.locator(".detail-backdrop").evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished));
  });
  await noOverflow(creator.page, "Declined Workshop mobile");
  await creator.page.screenshot({ path: "screenshots/workshop-mobile.png", fullPage: true });

  await creator.page.setViewportSize({ width: 1440, height: 900 });
  await creator.page.getByRole("button", { name: "Close thread" }).click();
  await assertScrollable(requestList, "Workshop desktop request list");
  await noOverflow(creator.page, "Workshop desktop");
  await creator.page.screenshot({ path: "screenshots/workshop-desktop.png", fullPage: true });
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  console.log("Workshop E2E passed: screenshot paste in requests and replies, clipboard limits, rotating tip, immediate Firestore wake-up, fixed three-account gate with Thomas access, secure images, offline drafts, idempotency, read receipts, long-thread behavior, Needs Simon/declined flows, and responsive mobile/desktop layout.");
  await Promise.all([simon.context.close(), creator.context.close(), thomas.context.close(), outsider.context.close()]);
} finally {
  await browser.close();
  server.kill("SIGTERM");
  const tickets = await db.collection("workshopTickets").get();
  await Promise.allSettled([
    ...tickets.docs.map((item) => db.recursiveDelete(item.ref)),
    db.doc(`workshopMembers/${simonUid}`).delete(),
    db.doc(`workshopMembers/${creatorUid}`).delete(),
    db.doc(`workshopMembers/${thomasUid}`).delete(),
    db.doc(`workshopMembers/${outsiderUid}`).delete(),
    db.doc("workshopAgent/state").delete(),
    auth.deleteUser(simonUid),
    auth.deleteUser(creatorUid),
    auth.deleteUser(thomasUid),
    auth.deleteUser(outsiderUid),
  ]);
}
process.exit(0);
