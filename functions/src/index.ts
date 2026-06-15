import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";

import { APP_URL, GMAIL_APP_PASSWORD, SUPER_ADMIN_EMAILS } from "./config";
import { sendMail, sendMany } from "./email";
import { inviteEmail, characterReminder, rsvpReminder } from "./templates";

initializeApp();
const db = getFirestore();

setGlobalOptions({
  region: "europe-west1",
  maxInstances: 5,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Role = "admin" | "dm" | "player";

async function roleOf(email: string): Promise<Role | null> {
  if (SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return "admin";
  const snap = await db.doc(`allowlist/${email.toLowerCase()}`).get();
  if (!snap.exists) return null;
  return ((snap.data()?.role as Role) ?? "player");
}

function assertStaff(request: CallableRequest): string {
  const email = request.auth?.token.email;
  const verified = request.auth?.token.email_verified;
  if (!email || !verified) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  return email.toLowerCase();
}

function formatWhen(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(d);
}

// ---------------------------------------------------------------------------
// 1. Auto-invite: email a new allowlist member with the app link.
// ---------------------------------------------------------------------------

export const onAllowlistInvite = onDocumentCreated(
  { document: "allowlist/{email}", secrets: [GMAIL_APP_PASSWORD] },
  async (event) => {
    const data = event.data?.data();
    const email = (data?.email as string) ?? event.params.email;
    // Don't email bootstrap/seed entries (e.g. the admin themselves).
    if (!email || data?.addedBy === "bootstrap") {
      logger.info("Skipping invite", { email, addedBy: data?.addedBy });
      return;
    }
    try {
      await sendMail(inviteEmail(email, APP_URL.value()));
    } catch (err) {
      logger.error("Invite email failed", { email, err: String(err) });
    }
  },
);

// ---------------------------------------------------------------------------
// 2. Resend an invite on demand (staff only).
// ---------------------------------------------------------------------------

export const resendInvite = onCall(
  { secrets: [GMAIL_APP_PASSWORD] },
  async (request) => {
    const caller = assertStaff(request);
    const role = await roleOf(caller);
    if (role !== "admin" && role !== "dm") {
      throw new HttpsError("permission-denied", "Staff only.");
    }
    const email = String(request.data?.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    await sendMail(inviteEmail(email, APP_URL.value()));
    return { ok: true };
  },
);

// ---------------------------------------------------------------------------
// 3. Send reminders for a session (staff only).
//    kind = "character" -> players missing a hunter card
//    kind = "rsvp"      -> members who haven't answered for that session
// ---------------------------------------------------------------------------

export const sendReminders = onCall(
  { secrets: [GMAIL_APP_PASSWORD] },
  async (request) => {
    const caller = assertStaff(request);
    const role = await roleOf(caller);
    if (role !== "admin" && role !== "dm") {
      throw new HttpsError("permission-denied", "Staff only.");
    }

    const kind = String(request.data?.kind ?? "");
    const sessionId = String(request.data?.sessionId ?? "");
    const appUrl = APP_URL.value();

    const membersSnap = await db.collection("allowlist").get();
    const members = membersSnap.docs.map((d) => ({
      email: (d.data().email as string) ?? d.id,
      role: (d.data().role as Role) ?? "player",
    }));

    if (kind === "character") {
      const playersSnap = await db.collection("players").get();
      const hasCard = new Set(
        playersSnap.docs
          .map((d) => d.data())
          .filter((p) => p.classId && p.name)
          .map((p) => String(p.ownerEmail).toLowerCase()),
      );
      const targets = members.filter(
        (m) => m.role === "player" && !hasCard.has(m.email.toLowerCase()),
      );
      const result = await sendMany(targets.map((m) => characterReminder(m.email, appUrl)));
      return { ...result, targeted: targets.length };
    }

    if (kind === "rsvp") {
      if (!sessionId) throw new HttpsError("invalid-argument", "sessionId is required.");
      const sessionSnap = await db.doc(`sessions/${sessionId}`).get();
      if (!sessionSnap.exists) throw new HttpsError("not-found", "Session not found.");
      const session = sessionSnap.data()!;
      const rsvpSnap = await db.collection(`sessions/${sessionId}/rsvps`).get();
      const answered = new Set(rsvpSnap.docs.map((d) => String(d.data().email).toLowerCase()));
      const targets = members.filter(
        (m) => m.role !== "admin" && !answered.has(m.email.toLowerCase()),
      );
      const when = formatWhen(session.date as string);
      const result = await sendMany(
        targets.map((m) => rsvpReminder(m.email, appUrl, session.title as string, when)),
      );
      return { ...result, targeted: targets.length };
    }

    throw new HttpsError("invalid-argument", "kind must be 'character' or 'rsvp'.");
  },
);
