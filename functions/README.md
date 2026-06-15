# Functions — Catacombs & Starspawns backend

Firebase Cloud Functions (Node 20, v2). Provides email notifications and any
server-side party logic. Requires the project to be on the Blaze plan (it is).

## What's here

- **`onAllowlistInvite`** — Firestore `onCreate` trigger on `/allowlist/{email}`.
  When the admin adds someone (in the app's Profile screen), they get an
  invite email with the app link + how to sign in. Skips `addedBy: "bootstrap"`.
- **`resendInvite`** — callable (staff only): resend an invite to an email.
- **`sendReminders`** — callable (staff only): email reminders for a session.
  - `{ kind: "character" }` → players who haven't made a hunter card.
  - `{ kind: "rsvp", sessionId }` → members who haven't answered for that session.

## Email setup (one-time)

Email is sent via **Gmail SMTP** from `GMAIL_SENDER` (default
`simonmyhre1@gmail.com`). You need a **Google App Password** for that account:

1. Google Account → Security → enable **2-Step Verification** (if not already).
2. Security → **App passwords** → create one (name it "C&S app"). Copy the
   16-character password.
3. Store it as a Functions secret:
   ```bash
   firebase functions:secrets:set GMAIL_APP_PASSWORD --account simonmyhre1@gmail.com
   # paste the app password when prompted
   ```
4. (Optional) change the sender or app URL by setting params at deploy time, or
   edit the defaults in `src/config.ts`.

To swap providers later (e.g. SendGrid/Resend), only `src/email.ts` changes.

## Develop & deploy

```bash
cd functions && npm install && npm run build       # typecheck/compile
firebase deploy --only functions --account simonmyhre1@gmail.com
```

Secrets live in **Firebase Secret Manager** (not Doppler) because that's what the
Functions runtime reads. Doppler is only for the frontend build vars.
