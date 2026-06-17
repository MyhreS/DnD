import { defineSecret, defineString } from "firebase-functions/params";

// Email transport configuration.
//   GMAIL_SENDER         the Gmail address that sends the mail (and its display)
//   GMAIL_APP_PASSWORD   a Google App Password for that account (secret)
//   APP_URL              the deployed app URL used in email links
//
// Set the secret once with:  firebase functions:secrets:set GMAIL_APP_PASSWORD
export const GMAIL_SENDER = defineString("GMAIL_SENDER", {
  default: "simonmyhre1@gmail.com",
});
export const APP_URL = defineString("APP_URL", {
  default: "https://dandd-ea955.web.app",
});
export const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

export const FROM_NAME = "Catacombs & Starspawns";

// Super-admins (mirror of the frontend allowlist bootstrap). Always treated as
// staff for callable authorization, even without an allowlist doc.
export const SUPER_ADMIN_EMAILS = ["simonmyhre1@gmail.com"];

// Agent test accounts (agent-*@dandd-ea955.web.app) are seeded into the
// allowlist by scripts/mint-test-token.mjs. They have no real mailbox, so
// emailing them bounces — never send them invites or reminders. Mirrors
// isTestEmail() in the frontend src/config.ts.
export function isTestEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@dandd-ea955.web.app");
}
