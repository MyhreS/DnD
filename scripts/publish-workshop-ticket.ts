import { applicationDefault, cert, getApps, initializeApp, type Credential } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "dandd-ea955";
const SIMON_EMAIL = "simonmyhre1@gmail.com";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function localGoogleCredential(): Credential {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();
  const encoded = process.env.WORKSHOP_SERVICE_ACCOUNT || process.env.AGENT_TEST_SA;
  if (encoded) return cert(JSON.parse(encoded));
  const credentialsDb = join(homedir(), ".config", "gcloud", "credentials.db");
  const result = spawnSync("sqlite3", [credentialsDb, `select value from credentials where account_id='${SIMON_EMAIL}';`], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`Sign in to gcloud as ${SIMON_EMAIL} or set WORKSHOP_SERVICE_ACCOUNT.`);
  }
  const value = JSON.parse(result.stdout) as { type?: string; refresh_token?: string };
  if (value.type !== "authorized_user" || !value.refresh_token) throw new Error("The stored D&D gcloud login is incomplete.");
  const folder = mkdtempSync(join(tmpdir(), "dnd-workshop-publisher-"));
  const credentialPath = join(folder, "authorized-user.json");
  writeFileSync(credentialPath, result.stdout, { mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
  process.once("exit", () => rmSync(folder, { recursive: true, force: true }));
  return applicationDefault();
}

const bodyArgument = argument("--body");
const bodyFile = argument("--body-file");
if ((bodyArgument ? 1 : 0) + (bodyFile ? 1 : 0) !== 1) {
  throw new Error("Pass exactly one of --body or --body-file.");
}
const body = (bodyFile ? readFileSync(bodyFile, "utf8") : bodyArgument ?? "").trim();
if (!body || body.length > 8_000) throw new Error("Workshop task text must contain 1 to 8,000 characters.");
const submissionId = argument("--submission-id") ?? crypto.randomUUID();
if (!UUID_PATTERN.test(submissionId)) throw new Error("--submission-id must be a UUID.");

if (!getApps().length) initializeApp({ credential: localGoogleCredential(), projectId: PROJECT_ID });
const db = getFirestore();
const members = await db.collection("workshopMembers").where("email", "==", SIMON_EMAIL).limit(1).get();
const member = members.docs[0];
if (!member) throw new Error("Simon must sign in to the Workshop once before Codex can publish tasks for him.");
const author = {
  uid: member.id,
  email: SIMON_EMAIL,
  name: String(member.data().name || "Simon Myhre").slice(0, 80),
};
const ticketRef = db.doc(`workshopTickets/${submissionId}`);
await db.runTransaction(async (tx) => {
  const existing = await tx.get(ticketRef);
  if (existing.exists) {
    if (existing.data()?.authorUid !== author.uid || existing.data()?.submittedVia !== "codex-skill") {
      throw new Error("That submission id already belongs to another Workshop task.");
    }
    return;
  }
  const now = FieldValue.serverTimestamp();
  tx.set(ticketRef, {
    title: body.split(/\n/)[0].slice(0, 96),
    status: "not_done",
    authorUid: author.uid,
    authorEmail: author.email,
    authorName: author.name,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    readAtBy: { [author.uid]: now },
    revision: 1,
    nextSequence: 3,
    attachmentCount: 0,
    needsSimonReplyReceived: false,
    automaticRetryCount: 0,
    leasedBy: null,
    claimNonce: null,
    leaseExpiresAt: null,
    lastCompletedSequence: 0,
    submittedVia: "codex-skill",
  });
  tx.set(ticketRef.collection("messages").doc(`${submissionId}-request`), {
    kind: "request",
    body,
    attachments: [],
    sequence: 1,
    authorUid: author.uid,
    authorEmail: author.email,
    authorName: author.name,
    createdAt: now,
  });
  tx.set(ticketRef.collection("messages").doc(`${submissionId}-ack`), {
    kind: "system",
    body: "Received. The Workshop agent will start automatically when it is online.",
    attachments: [],
    sequence: 2,
    authorUid: "system",
    authorEmail: null,
    authorName: "Workshop agent",
    createdAt: now,
  });
});

console.log(JSON.stringify({
  ok: true,
  ticketId: submissionId,
  workshopUrl: "https://dandd-ea955-workshop.web.app",
}));
