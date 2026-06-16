# Catacombs & Starspawns — Companion App

A private, mobile-first PWA for our **Catacombs & Starspawns** tabletop campaign
(a Bloodborne-flavoured dark-fantasy homebrew where adventurers are *Hunters*).
It's for Simon and friends only — access is gated by Google sign-in + an allowlist.

> This is a **public repo**. Never commit secrets. Real config/secrets live in
> **Doppler** (project `dnd`) and GitHub Actions secrets — not in the repo.

## What it does (v1)

- **Sessions** — next session with a live countdown + upcoming dates. Members
  RSVP (yes/maybe/no). Staff (admin/DM) add & edit dates. Backed by Firestore.
- **Hunter** — build & save your hunter card (class, point-buy abilities, skills,
  armor/AC, derived HP/speed). Saved per-user in Firestore.
- **Party** — gallery of everyone's hunters. Staff get a roster: who has a
  character, who's RSVP'd, with one-tap `mailto:` reminders.
- **Handbook** — browsable rules, all six classes, and the armory, plus a link to
  the full PDF. Content is data-driven (see "Updating game content").

Installable to the iPhone home screen (standalone display, custom icon, safe-area
aware, theme-colored).

## Stack

- **React 19 + TypeScript + Vite 6**, bundled/run with **Bun**.
- **React Compiler** (auto-memoisation) enabled in `vite.config.ts`.
- **Zustand** for state (stores live per-feature).
- **react-router-dom** (4 tabs + a profile route).
- **Firebase** (web SDK): Auth (Google), Firestore, **Cloud Functions**, Hosting.
- **vite-plugin-pwa** (Workbox) for the installable PWA.
- **Doppler** for frontend config/secrets injection.
- **ESLint** + **knip** (dead-code) for quality gates.

## Architecture & conventions (follow these)

**Folder structure follows features.** Each feature owns its components, hooks
and store; cross-cutting concerns are global folders.

```
src/
  app/                 App shell (App.tsx, routing/gating)
  config.ts            Constants + role model (Identity, capabilities, names)
  types.ts             Shared domain types
  api/                 ONE FILE PER API — all Firestore/Functions access
    allowlist.ts  players.ts  sessions.ts  rsvp.ts  notifications.ts
  hooks/               Shared hooks, grouped in subfolders
    auth/useAuthInit.ts   common/useNow.ts
  features/<feature>/  e.g. auth, sessions, hunter, party, handbook, profile
    components/        Feature UI (each file < 200 lines — see rule)
    hooks/             Feature hooks (every useEffect lives in a hook)
    store/             Feature Zustand store
    lib/               Feature-local pure helpers
  components/          Shared UI (Layout, Splash, ErrorBoundary, icons)
  lib/                 Pure cross-feature utils (firebase, character calc)
  data/                Premade game content (classes, armor, handbook, abilities)
  dev/                 Dev-only (preview mode)
```

Rules:
- **One file per API** under `src/api/`. No Firestore/Functions calls in
  components — go through an `api/` module.
- **Every `useEffect` lives in a hook** under a `hooks/` folder (shared in
  `src/hooks/<group>/`, feature-specific in `features/<f>/hooks/`). Components
  should read clean; side-effects are named hooks.
- **No component file over ~200 lines.** If it grows past that, split it into
  more components/files. Only a *few* deliberate exceptions are allowed (e.g.
  `features/hunter/components/CharacterEditor.tsx`, the multi-step builder).
- Imports use the `@/` alias (→ `src/`).

## Tooling / quality gates

```bash
bun run typecheck     # tsc -b
bun run lint          # eslint (incl. react-hooks + react-compiler rules)
bun run lint:fix
bun run deadcode      # knip — unused files/exports/deps
bun run deadcode:fix  # knip --fix (auto-remove dead code)
bun run check         # tsc + eslint + knip
```

Keep all three green before opening a PR.

## Access model & roles (important)

Two **independent** axes (`src/config.ts`, mirrored in `firestore.rules`):

- **accessRole**: `user` | `moderator` | `admin` — what you can *do*.
- **playerType**: `player` | `dm` — how you sit at the *table*.

Capabilities are derived in `capabilities(identity)`:
- `manageMembers` — admin only (add/remove members + roles).
- `manageSessions` — admin, moderator, or DM (edit dates).
- `email` — **admin or DM** (send invites/reminders).
- `oversight` — admin, moderator, or DM (see the Party roster).
- `needsCharacter(identity)` — true for `playerType: "player"` (players build a
  hunter; the DM doesn't, and doesn't get the Hunter tab).

Other notes:
- Must sign in with Google **and** be on the allowlist (`/allowlist/{email}`).
- **Super-admin** bootstrap (`SUPER_ADMIN_EMAILS`) is always allowed and can
  manage members. First admin `simonmyhre1@gmail.com`; first DM Christoffer
  (`myhrefjeld@gmail.com`). Change the email in **both** `config.ts` and
  `firestore.rules`.
- **Names**: members have `firstName`/`lastName` (required when adding). Show
  `displayName(member, all)` — first name only, last name added on collision.
- **Role switcher**: admins (and dev preview) get a "View as" switcher on the
  Profile screen (`setViewAs`) to preview any role. Real Firestore writes are
  still governed by actual permissions.
- **Dev preview (for local AI navigation)**: in `bun run dev`, open
  `?preview=admin.dm` (or `user.player`, `moderator`, `dm`, …) to run as any role
  **without Google sign-in** — see `src/dev/preview.ts`. `?preview=off` clears it.
  Data calls hit Firestore and may show empty states; it's for inspecting
  layout & role-gated UI.

Firestore data:
- `/allowlist/{email}` — `{ email, firstName, lastName, accessRole, playerType,
  addedBy, addedAt }`. Admin writes only; staff read the roster.
- `/players/{uid}` — a `HunterCard`. Any member reads; owner writes.
- `/sessions/{id}` — `{ title, date, location, notes, createdBy }`. Members read;
  staff write.
- `/sessions/{id}/rsvps/{uid}` — `{ uid, name, email, status, at }`. You write
  your own; the party reads.

## Access model (important)

- Must sign in with Google **and** be on the allowlist to use the app.
- The allowlist is the Firestore collection `/allowlist/{email}`, each with a
  **role**: `admin` | `dm` | `player`. "Staff" = admin or dm.
- **Super-admins** (`SUPER_ADMIN_EMAILS` in `src/config.ts`, mirrored in
  `firestore.rules`) are always allowed and can add/remove members + set roles
  from the **Profile** screen. First/bootstrap admin: `simonmyhre1@gmail.com`.
  First DM: `myhrefjeld@gmail.com` (Christoffer).
- Roles drive the UI: players build a hunter and RSVP; **DM/admin** don't need a
  character, get the **Party roster**, can edit session dates and send reminders.
- Security is enforced in `firestore.rules`, not just the client. If you change
  the super-admin email, change it in **both** `src/config.ts` and
  `firestore.rules` (the `isSuperAdmin()` list).

Firestore data:
- `/allowlist/{email}` — `{ email, role, addedBy, addedAt }`. Super-admin writes
  only; staff can read the whole roster.
- `/players/{uid}` — a `HunterCard`. Readable by any party member, writable by owner.
- `/sessions/{id}` — a session `{ title, date, location, notes, createdBy }`.
  Readable by all members; writable by staff.
- `/sessions/{id}/rsvps/{uid}` — `{ uid, name, email, status, at }`. You write
  your own; everyone in the party can read (so the DM sees who's missing).

## Working in this repo (agent workflow)

These conventions keep parallel agents from colliding and keep `main` clean.

1. **Always use a git worktree.** Never edit directly in the shared checkout —
   another agent may be running. Create an isolated worktree per task, e.g.
   `git worktree add ../DnD-<task> -b <task>` (or use the harness's worktree
   isolation). Do your work there and remove it when done.
2. **Branch → PR → merge.** After changes: commit on the task branch, push, open
   a PR (`gh pr create`), let checks pass, then merge it (`gh pr merge --squash`).
   Don't push straight to `main`.
3. **Always visually verify the UI.** This is a UI-heavy app — don't trust that
   it compiles. Use **Playwright** to actually load the app, screenshot it at
   phone size, click through the flows, and read the screenshots. If it doesn't
   look right, fix it and re-check. Handy starter: `bun run scripts/shoot.mjs
   <url> <out.png>` (screenshots + reports console errors). For local runs use
   `bun run dev` and shoot `http://localhost:5173`. Most screens are behind
   Google sign-in, so to inspect them either test locally with the Auth emulator
   or drive a signed-in session in Playwright.
4. **Keep secrets out of git** (they live in Doppler / GitHub Actions secrets).

## Testing on the iOS Simulator

This is a phone app — for anything layout/safe-area/PWA related, verify on a real
iOS simulator, not just Playwright (Playwright's `env(safe-area-inset-*)` is 0, so
it can't show the notch/home-indicator behaviour).

### A. Automated walkthrough (no login) — preferred for self-QA

Drive **mobile Safari** in the simulator with **Appium + WebDriverIO** (the same
stack as the tools repo's `tooling/native-screenshots`; `appium` 3.x with the
`xcuitest` driver is installed globally). Use the **dev preview** to skip Google
login entirely:

1. Boot a sim: `xcrun simctl boot 'iPhone 17'`
2. Run the app in dev (preview only works in dev): `bun run dev` (binds localhost;
   the simulator shares the host's localhost).
3. Appium session with `browserName: "Safari"`, `appium:udid` of the booted sim;
   `driver.url("http://localhost:5173/<path>?preview=user.player")` (or
   `admin.player`, `moderator.dm`, …). Click tabs / `driver.execute` to scroll,
   `driver.saveScreenshot(...)`. Pin the status bar with
   `xcrun simctl status_bar <udid> override --time 9:41 …` for clean shots.

This is the **only** way to inspect authenticated screens automatically:
production has no preview bypass, and Google OAuth can't be scripted.

### B. Manual full journey (real login + installed app) — the real path

Some things (real Google login, Add-to-Home-Screen, standalone/home-indicator
behaviour) can't be automated — do them by hand each meaningful change:

1. Simulator Safari → open `https://dandd-ea955.web.app`.
2. **Sign in with Google** (real account).
3. Click through Sessions / Character / Party / Handbook.
4. **Add to Home Screen**: Share → Add to Home Screen → Add.
5. Open the **home-screen app** (standalone), sign in if asked, and click through
   again — checking the change you made, and especially standalone-only behaviour
   (safe-area / home indicator, redirect sign-in, no re-prompt on relaunch).

## Commands

```bash
bun install
bun run dev          # doppler run -- vite   (needs `doppler setup` once)
bun run build        # tsc + vite build (via Doppler)
bun run preview
bun run icons        # regenerate PWA icons from scripts/generate-icons.mjs
bun run deploy       # build + firebase deploy   (run locally)
bun run deploy:rules # firebase deploy --only firestore:rules
```

Firebase project: **`dandd-ea955`**. Simon has two Firebase/gcloud accounts;
**this project uses `simonmyhre1@gmail.com`**. Pass `--account simonmyhre1@gmail.com`
to firebase commands so the other project's login isn't disturbed.

## Secrets & config (Doppler)

Config lives in Doppler project **`dnd`** (configs: `dev`, `stg`, `prd`).
`VITE_FIREBASE_*` values are stored there and injected at build via `doppler run`.
(They're public Firebase web-config values — not truly secret — but kept out of
git anyway.) First-time on a new machine: `doppler login && doppler setup -p dnd -c dev`.

## Deployment

- **Locally:** `bun run deploy` (hosting + whatever's configured) as the
  `simonmyhre1` account.
- **CI (GitHub Actions):** `.github/workflows/deploy.yml` builds and deploys on
  push to `main` (live) and on PRs (preview channel). Requires two repo secrets:
  - `DOPPLER_TOKEN` — Doppler **service token** for `dnd`/`prd`.
  - `FIREBASE_SERVICE_ACCOUNT` — service-account JSON with Hosting + Firestore
    deploy perms (`firebase init hosting:github` generates one).

## Updating game content

The handbook/classes/character-creation will be **updated later** (Simon will
provide a new table). The UI is fully data-driven, so updates are localized:
edit `src/data/classes.ts`, `src/data/armor.ts`, `src/data/handbook.ts`,
`src/data/abilities.ts`. The character builder and handbook screens follow
automatically. Replace the PDF in `public/handbook/` if a new one arrives.

## One-time manual setup (Firebase console)

- **Enable Google sign-in:** Authentication → Get started → Sign-in method →
  Google → Enable (set a support email) → Save. This is the only step that can't
  be scripted (it provisions an OAuth client). Until done, sign-in will fail.

## Roadmap / later ideas

Admin page (broader), atmospheric music, email reminders to make cards / before
sessions (Cloud Functions on Blaze + scheduled triggers), session log, party
view, AI narration / voice. A native iOS shell using Apple's on-device
Foundation Models is a possible future direction. None of these are built yet.
```
