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
- **Zustand** for state (`src/store`).
- **react-router-dom** (3 tabs + a profile route).
- **Firebase** (`firebase` web SDK): Auth (Google), Firestore, Hosting.
- **vite-plugin-pwa** (Workbox) for the installable PWA + service worker.
- **Doppler** for config/secrets injection.

## Project layout

```
src/
  config.ts            App constants + SUPER_ADMIN_EMAILS (keep in sync w/ rules)
  types.ts             Domain types (HunterCard, HunterClass, etc.)
  data/                Premade game content (the source of truth for v1)
    classes.ts         The six hunter classes
    armor.ts           Armory + AC category helper
    abilities.ts       Point-buy costs, modifiers
    handbook.ts        Handbook chapters (structured for in-app reading)
    sessions.ts        Upcoming session dates
  lib/
    firebase.ts        Firebase init (config from VITE_FIREBASE_* via Doppler)
    allowlist.ts       Allowlist read/admin writes
    players.ts         Hunter card read/write
    character.ts       Derived stats (HP, AC, empty card)
  store/               authStore, playerStore (Zustand)
  components/          Layout, icons, editor, card view, error boundary
  pages/               Login, Denied, Sessions, Hunter, Handbook, Profile
public/
  favicon.svg, pwa-*.png, apple-touch-icon.png   (regen: `bun run icons`)
  handbook/...pdf      Full handbook (served by Hosting)
```

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
