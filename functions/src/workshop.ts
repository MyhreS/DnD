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
  return {
    uid,
    email,
    name: String(request.auth?.token.name ?? email.split("@")[0]),
    role: email === ADMIN_EMAIL ? "admin" : "creator",
  };
}

function validBody(value: unknown): string {
  const body = String(value ?? "").trim();
  if (!body) throw new HttpsError("invalid-argument", "Write a request first.");
  if (body.length > MAX_BODY) {
    throw new HttpsError("invalid-argument", `Requests may be at most ${MAX_BODY} characters.`);
  }
  return body;
}

function validAttachments(value: unknown, uid: string): AttachmentInput[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) {
    throw new HttpsError("invalid-argument", `Attach at most ${MAX_ATTACHMENTS} images.`);
  }
  return value.map((raw) => {
    const item = raw as Partial<AttachmentInput>;
    const path = String(item.path ?? "");
    const contentType = String(item.contentType ?? "");
    const name = String(item.name ?? "image").slice(0, 160);
    const size = Number(item.size ?? 0);
    if (!path.startsWith(`workshop/${uid}/`) || !contentType.startsWith("image/") || size <= 0 || size > 10 * 1024 * 1024) {
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
  } else if (member.data()?.email !== user.email || member.data()?.role !== user.role) {
    await memberRef.set({ email: user.email, name: user.name, role: user.role }, { merge: true });
  }
  return { ok: true, role: user.role };
});

export const createWorkshopTicket = onCall({ region: REGION }, async (request) => {
  const user = identity(request);
  await assertMember(user);
  await checkRateLimit(user.uid);
  const body = validBody(request.data?.body);
  const attachments = validAttachments(request.data?.attachments, user.uid);
  const ticketRef = db.collection("workshopTickets").doc();
  const messageRef = ticketRef.collection("messages").doc();
  const ackRef = ticketRef.collection("messages").doc();
  const batch = db.batch();
  batch.set(ticketRef, {
    title: body.split(/\n/)[0].slice(0, 96),
    status: "not_done",
    authorUid: user.uid,
    authorEmail: user.email,
    authorName: user.name,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    revision: 1,
    nextSequence: 3,
    attachmentCount: attachments.length,
    needsSimonApproved: false,
    leasedBy: null,
    leaseExpiresAt: null,
  });
  batch.set(messageRef, messageData("request", body, user, 1, attachments));
  batch.set(ackRef, messageData("system", "Received. I’ll pick this up when the Workshop agent is online.", null, 2));
  await batch.commit();
  return { ok: true, ticketId: ticketRef.id };
});

export const replyWorkshopTicket = onCall({ region: REGION }, async (request) => {
  const user = identity(request);
  await assertMember(user);
  await checkRateLimit(user.uid);
  const ticketId = String(request.data?.ticketId ?? "");
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(ticketId)) {
    throw new HttpsError("invalid-argument", "Invalid ticket.");
  }
  const body = validBody(request.data?.body);
  const attachments = validAttachments(request.data?.attachments, user.uid);
  const ticketRef = db.doc(`workshopTickets/${ticketId}`);
  await db.runTransaction(async (tx) => {
    const ticket = await tx.get(ticketRef);
    if (!ticket.exists) throw new HttpsError("not-found", "Ticket not found.");
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
        ? "Simon answered. The agent will reread the whole thread."
        : "Update received. This task is still waiting for Simon to reply in this thread."
      : "Update received. The agent will reread the whole thread.";
    tx.set(ticketRef.collection("messages").doc(), messageData("follow_up", body, user, sequence, attachments));
    tx.set(ticketRef.collection("messages").doc(), messageData("system", acknowledgement, null, sequence + 1));
    tx.update(ticketRef, {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
      nextSequence: sequence + 2,
      attachmentCount: FieldValue.increment(attachments.length),
      ...(waitingForSimon ? { needsSimonApproved: answeredBySimon } : {}),
    });
  });
  return { ok: true };
});
