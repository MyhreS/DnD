import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export interface ReminderResult {
  sent: number;
  failed: number;
  targeted: number;
}

const sendRemindersFn = httpsCallable<
  { kind: "character" | "rsvp"; sessionId?: string },
  ReminderResult
>(functions, "sendReminders");

/** Staff only — email players who haven't built a hunter card. */
export async function remindMissingCharacters(): Promise<ReminderResult> {
  const res = await sendRemindersFn({ kind: "character" });
  return res.data;
}

/** Staff only — email members who haven't RSVP'd to a session. */
export async function remindMissingRsvps(sessionId: string): Promise<ReminderResult> {
  const res = await sendRemindersFn({ kind: "rsvp", sessionId });
  return res.data;
}
