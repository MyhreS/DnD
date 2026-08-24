import { spawn, spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "dandd-ea955";
initializeApp({ projectId });
const db = getFirestore();
const activeTicket = db.doc("workshopTickets/restart-checkpoint-test");
const pendingTicket = db.doc("workshopTickets/restart-pending-test");
const activeCheckpoint = db.doc("workshopAgentCheckpoints/restart-checkpoint-test");
const pendingCheckpoint = db.doc("workshopAgentCheckpoints/restart-pending-test");
const descendantPidPath = join(tmpdir(), `dnd-workshop-restart-descendant-${process.pid}.txt`);

function startManager({ once = false, interruptAfterMs = 0 } = {}) {
  const args = ["scripts/workshop-manager.ts"];
  if (once) args.push("--once");
  args.push("--fixture=restart_checkpoint");
  const child = spawn("bun", args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      WORKSHOP_FIXTURE_MAX_CONCURRENT: "1",
      WORKSHOP_FIXTURE_DESCENDANT_PID_PATH: descendantPidPath,
      ...(interruptAfterMs ? { WORKSHOP_FIXTURE_INTERRUPT_AFTER_MS: String(interruptAfterMs) } : {}),
    },
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  const exited = new Promise((resolvePromise) => child.once("exit", (code, signal) => resolvePromise({ code, signal })));
  return { child, exited, output: () => output };
}

async function waitForExit(manager, label, timeoutMs = 30_000) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out.\n${manager.output()}`)), timeoutMs));
  const result = await Promise.race([manager.exited, timeout]);
  if (result.code !== 0) throw new Error(`${label} exited with ${result.code ?? result.signal}.\n${manager.output()}`);
}

async function eventually(check, label, timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`${label} timed out.`);
}

async function createTicket(ref, index) {
  await ref.set({
    title: index === 0 ? "Interrupt and resume checkpoint" : "Wait behind manager restart",
    status: "not_done",
    authorUid: "restart-test-owner",
    authorEmail: "simonmyhre1@gmail.com",
    authorName: "Restart Test",
    createdAt: new Date(Date.now() + index),
    updatedAt: new Date(Date.now() + index),
    revision: 1,
    nextSequence: 2,
    attachmentCount: 0,
    needsSimonReplyReceived: false,
    leasedBy: null,
    leaseExpiresAt: null,
  });
  await ref.collection("messages").doc("request").set({
    kind: "request",
    body: index === 0 ? "Keep this active across a manager update." : "Wait until checkpoint startup recovery is complete.",
    authorUid: "restart-test-owner",
    authorEmail: "simonmyhre1@gmail.com",
    authorName: "Restart Test",
    attachments: [],
    sequence: 1,
    createdAt: new Date(),
  });
}

let interruptedManager;
let resumedManager;
try {
  await Promise.all([createTicket(activeTicket, 0), createTicket(pendingTicket, 1)]);
  interruptedManager = startManager({ interruptAfterMs: 2_000 });
  await eventually(async () => {
    const [ticket, checkpoint] = await Promise.all([activeTicket.get(), activeCheckpoint.get()]);
    return ticket.data()?.status === "doing_now"
      && checkpoint.exists
      && typeof checkpoint.data()?.sessionId === "string";
  }, "Initial durable checkpoint");
  await waitForExit(interruptedManager, "Interrupted manager");

  const descendantPid = Number(await readFile(descendantPidPath, "utf8"));
  try {
    process.kill(descendantPid, 0);
    throw new Error(`Graceful stop left fixture descendant ${descendantPid} running.`);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }

  const [interrupted, pending, checkpoint] = await Promise.all([
    activeTicket.get(),
    pendingTicket.get(),
    activeCheckpoint.get(),
  ]);
  if (interrupted.data()?.status !== "doing_now" || interrupted.data()?.leasedBy !== null || !checkpoint.exists) {
    throw new Error("Graceful stop did not preserve and release the active checkpoint.");
  }
  if (pending.data()?.status !== "not_done") throw new Error("The old manager took a pending ticket while stopping.");

  resumedManager = startManager({ once: true });
  await eventually(async () => {
    const [state, resumed, waiting] = await Promise.all([
      db.doc("workshopAgent/state").get(),
      activeTicket.get(),
      pendingTicket.get(),
    ]);
    return state.data()?.lifecycle === "ready"
      && state.data()?.activeTicketIds?.[0] === activeTicket.id
      && resumed.data()?.status === "doing_now"
      && resumed.data()?.leasedBy === state.data()?.workerId
      && waiting.data()?.status === "not_done";
  }, "Checkpoint recovery before pending claims");
  await db.recursiveDelete(pendingTicket);
  await waitForExit(resumedManager, "Resumed manager");
  const [finished, clearedCheckpoint] = await Promise.all([activeTicket.get(), activeCheckpoint.get()]);
  if (finished.data()?.status !== "finished") throw new Error("The resumed checkpoint did not finish its ticket.");
  if (clearedCheckpoint.exists) throw new Error("The completed checkpoint was not cleared.");
  console.log("Workshop manager restart test passed: active work checkpointed, released, resumed first, and completed.");
} finally {
  for (const manager of [interruptedManager, resumedManager]) {
    if (manager?.child.exitCode === null && manager?.child.signalCode === null) {
      if (process.platform === "win32" && manager.child.pid) {
        spawnSync("taskkill.exe", ["/PID", String(manager.child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        manager.child.kill("SIGKILL");
      }
    }
  }
  const staleCheckpoint = await activeCheckpoint.get();
  if (staleCheckpoint.exists) {
    await activeTicket.set({ leasedBy: null, claimNonce: null, leaseExpiresAt: null }, { merge: true });
    const cleanupManager = spawn("bun", ["scripts/workshop-manager.ts", "--once", "--fixture=answered"], {
      stdio: "ignore",
      env: { ...process.env, WORKSHOP_FIXTURE_MAX_CONCURRENT: "1" },
    });
    await new Promise((resolvePromise) => cleanupManager.once("exit", resolvePromise));
  }
  try {
    const descendantPid = Number(await readFile(descendantPidPath, "utf8"));
    process.kill(descendantPid, "SIGKILL");
  } catch {
    // The expected path is that graceful shutdown already removed the fixture descendant.
  }
  await Promise.allSettled([
    db.recursiveDelete(activeTicket),
    db.recursiveDelete(pendingTicket),
    activeCheckpoint.delete(),
    pendingCheckpoint.delete(),
    db.doc("workshopAgent/state").delete(),
    db.doc("workshopAgent/config").delete(),
    rm(descendantPidPath, { force: true }),
  ]);
}
