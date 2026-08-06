import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

const ADMIN_EMAIL = "simonmyhre1@gmail.com";
const CREATOR_EMAIL = "myhrefjeld@gmail.com";
const THOMAS_EMAIL = "thmyhre9@gmail.com";
const WORKSHOP_EMAILS = new Set([ADMIN_EMAIL, CREATOR_EMAIL, THOMAS_EMAIL]);
const REGION = "europe-west1";
const MAX_BODY = 8_000;
const MAX_ATTACHMENTS = 5;
const ACTION_WINDOW_MS = 60_000;
const MAX_ACTIONS_PER_WINDOW = 12;
const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!getApps().length) initializeApp();
const db = getFirestore();

type AttachmentInput = {
  name: string;
  path: string;
  contentType: string;
  size: number;
};

type WorkshopRole = "admin" | "creator";
type WorkshopUser = { uid: string; email: string; name: string; role: WorkshopRole };

function identity(request: CallableRequest): WorkshopUser {
  const uid = request.auth?.uid;
  const email = String(request.auth?.token.email ?? "").trim().toLowerCase();
  if (!uid || !email || request.auth?.token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "Sign in with a verified Google account.");
  }
  if (!WORKSHOP_EMAILS.has(email)) {
    throw new HttpsError("permission-denied", "This Google account does not have access to the Workshop.");
  }
  const requestedName = String(request.auth?.token.name ?? "").trim().slice(0, 80);
  return {
    uid,
    email,
    name: requestedName || email.split("@")[0],
    role: email === ADMIN_EMAIL ? "admin" : "creator",
  };
}

function validBody(value: unknown, hasAttachments: boolean): string {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", "Write a valid message.");
  const body = value.trim();
  if (!body && !hasAttachments) throw new HttpsError("invalid-argument", "Write a message or add an image first.");
  if (body.length > MAX_BODY) {
    throw new HttpsError("invalid-argument", `Requests may be at most ${MAX_BODY} characters.`);
  }
  return body;
}

function validId(value: unknown, label: string): string {
  const id = typeof value === "string" ? value : "";
  if (!UUID_PATTERN.test(id)) throw new HttpsError("invalid-argument", `Invalid ${label}.`);
  return id;
}

function safeAttachmentName(value: unknown): string {
  const cleaned = String(value ?? "image")
    .split("")
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join("")
    .trim()
    .slice(0, 160);
  return cleaned || "image";
}

function validAttachments(value: unknown, uid: string): AttachmentInput[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) {
    throw new HttpsError("invalid-argument", `Attach at most ${MAX_ATTACHMENTS} images.`);
  }
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") throw new HttpsError("invalid-argument", "One of the image attachments is invalid.");
    const item = raw as Partial<AttachmentInput>;
    const path = String(item.path ?? "");
    const contentType = String(item.contentType ?? "");
    const name = safeAttachmentName(item.name);
    const size = Number(item.size ?? 0);
    const parts = path.split("/");
    const pathIsValid = parts.length === 4
      && parts[0] === "workshop"
      && parts[1] === uid
      && UUID_PATTERN.test(parts[2])
      && UUID_PATTERN.test(parts[3].slice(0, 36))
      && parts[3][36] === "-";
    if (!pathIsValid || !SAFE_IMAGE_TYPES.has(contentType) || !Number.isSafeInteger(size) || size <= 0 || size > 10 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "One of the image attachments is invalid.");
    }
    return { name, path, contentType, size };
  });
}

async function assertMember(user: WorkshopUser): Promise<void> {
  const member = await db.doc(`workshopMembers/${user.uid}`).get();
  if (!member.exists || member.data()?.email !== user.email) {
    throw new HttpsError("permission-denied", "Open the Workshop before making changes.");
  }
}

async function checkRateLimit(uid: string): Promise<void> {
  const ref = db.doc(`workshopRateLimits/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data();
    const started = data?.windowStartedAt instanceof Timestamp ? data.windowStartedAt.toMillis() : 0;
    const withinWindow = now - started < ACTION_WINDOW_MS;
    const count = withinWindow ? Number(data?.count ?? 0) : 0;
    if (count >= MAX_ACTIONS_PER_WINDOW) {
      throw new HttpsError("resource-exhausted", "Too many updates. Wait a minute and try again.");
    }
    tx.set(ref, {
      count: count + 1,
      windowStartedAt: withinWindow ? data?.windowStartedAt : Timestamp.fromMillis(now),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

function messageData(
  kind: "request" | "follow_up" | "system",
  body: string,
  author: { uid: string; email: string; name: string } | null,
  sequence: number,
  attachments: AttachmentInput[] = [],
) {
  return {
    kind,
    body,
    attachments,
    sequence,
    authorUid: author?.uid ?? "system",
    authorEmail: author?.email ?? null,
    authorName: author?.name ?? "Workshop agent",
    createdAt: FieldValue.serverTimestamp(),
  };
}

export const claimWorkshopAccess = onCall({ region: REGION }, async (request) => {
  const user = identity(request);
  const memberRef = db.doc(`workshopMembers/${user.uid}`);
  const member = await memberRef.get();
  if (!member.exists) {
    await memberRef.set({
      email: user.email,
      name: user.name,
      role: user.role,
      joinedAt: FieldValue.serverTimestamp(),
      access: "fixed-account-list",
    });
  } else {
    await memberRef.set({ email: user.email, name: user.name, role: user.role }, { merge: true });
  }
  return { ok: true, role: user.role };
});

export const createWorkshopTicket = onCall({ region: REGION }, async (request) => {
  const user = identity(request);
  await assertMember(user);
  const attachments = validAttachments(request.data?.attachments, user.uid);
  const body = validBody(request.data?.body, attachments.length > 0);
  const submissionId = validId(request.data?.submissionId, "submission");
  const ticketRef = db.collection("workshopTickets").doc(submissionId);
  const existing = await ticketRef.get();
  if (existing.exists) {
    if (existing.data()?.authorUid !== user.uid) throw new HttpsError("already-exists", "This submission is already in use.");
    return { ok: true, ticketId: ticketRef.id };
  }
  await checkRateLimit(user.uid);
  await db.runTransaction(async (tx) => {
    const ticket = await tx.get(ticketRef);
    if (ticket.exists) {
      if (ticket.data()?.authorUid !== user.uid) throw new HttpsError("already-exists", "This submission is already in use.");
      return;
    }
    tx.set(ticketRef, {
      title: body.split(/\n/)[0].slice(0, 96) || "Image request",
      status: "not_done",
      authorUid: user.uid,
      authorEmail: user.email,
      authorName: user.name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      readAtBy: { [user.uid]: FieldValue.serverTimestamp() },
      revision: 1,
      nextSequence: 3,
      attachmentCount: attachments.length,
      needsSimonReplyReceived: false,
      automaticRetryCount: 0,
      leasedBy: null,
      leaseExpiresAt: null,
    });
    tx.set(ticketRef.collection("messages").doc(`${submissionId}-request`), messageData("request", body, user, 1, attachments));
    tx.set(ticketRef.collection("messages").doc(`${submissionId}-ack`), messageData("system", "Received. The Workshop agent will start automatically when it is online.", null, 2));
  });
  return { ok: true, ticketId: ticketRef.id };
});

export const replyWorkshopTicket = onCall({ region: REGION }, async (request) => {
  const user = identity(request);
  await assertMember(user);
  const ticketId = String(request.data?.ticketId ?? "");
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(ticketId)) {
    throw new HttpsError("invalid-argument", "Invalid ticket.");
  }
  const attachments = validAttachments(request.data?.attachments, user.uid);
  const body = validBody(request.data?.body, attachments.length > 0);
  const submissionId = validId(request.data?.submissionId, "submission");
  const ticketRef = db.doc(`workshopTickets/${ticketId}`);
  const messageRef = ticketRef.collection("messages").doc(submissionId);
  const existing = await messageRef.get();
  if (existing.exists) {
    if (existing.data()?.authorUid !== user.uid) throw new HttpsError("already-exists", "This submission is already in use.");
    return { ok: true };
  }
  await checkRateLimit(user.uid);
  await db.runTransaction(async (tx) => {
    const ticket = await tx.get(ticketRef);
    if (!ticket.exists) throw new HttpsError("not-found", "Ticket not found.");
    const duplicate = await tx.get(messageRef);
    if (duplicate.exists) {
      if (duplicate.data()?.authorUid !== user.uid) throw new HttpsError("already-exists", "This submission is already in use.");
      return;
    }
    const data = ticket.data()!;
    const sequence = Number(data.nextSequence ?? 1);
    const waitingForSimon = data.status === "needs_simon";
    const answeredBySimon = user.email === ADMIN_EMAIL;
    const nextStatus = data.status === "doing_now"
      ? "doing_now"
      : waitingForSimon && !answeredBySimon
        ? "needs_simon"
        : "not_done";
    const acknowledgement = waitingForSimon
      ? answeredBySimon
        ? "Simon replied. The agent will reread the whole thread."
        : "Update received. This task is still waiting for Simon to reply in this thread."
      : "Update received. The agent will reread the whole thread.";
    tx.set(messageRef, messageData("follow_up", body, user, sequence, attachments));
    tx.set(ticketRef.collection("messages").doc(`${submissionId}-ack`), messageData("system", acknowledgement, null, sequence + 1));
    tx.update(ticketRef, {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
      readAtBy: { ...(data.readAtBy ?? {}), [user.uid]: FieldValue.serverTimestamp() },
      revision: FieldValue.increment(1),
      nextSequence: sequence + 2,
      attachmentCount: FieldValue.increment(attachments.length),
      automaticRetryCount: 0,
      retryAfter: FieldValue.delete(),
      ...(waitingForSimon ? {
        needsSimonReplyReceived: answeredBySimon,
        needsSimonApproved: FieldValue.delete(),
      } : {}),
    });
  });
  return { ok: true };
});

export const markWorkshopTicketRead = onCall({ region: REGION }, async (request) => {
  const user = identity(request);
  await assertMember(user);
  const ticketId = String(request.data?.ticketId ?? "");
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(ticketId)) throw new HttpsError("invalid-argument", "Invalid ticket.");
  const ticketRef = db.doc(`workshopTickets/${ticketId}`);
  await db.runTransaction(async (tx) => {
    const ticket = await tx.get(ticketRef);
    if (!ticket.exists) throw new HttpsError("not-found", "Ticket not found.");
    const data = ticket.data()!;
    tx.update(ticketRef, {
      readAtBy: { ...(data.readAtBy ?? {}), [user.uid]: FieldValue.serverTimestamp() },
    });
  });
  return { ok: true };
});
