import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const resendInviteFn = httpsCallable<{ email: string }, { ok: boolean }>(
  functions,
  "resendInvite",
);

/** Admin/DM — (re)send an app invite to an email (handy for testing). */
export async function sendInvite(email: string): Promise<void> {
  await resendInviteFn({ email });
}
