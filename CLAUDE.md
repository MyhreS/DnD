# Catacombs & Starspawns — Companion App

A mobile-first PWA for our **Catacombs & Starspawns** tabletop campaign
(a Bloodborne-flavoured dark-fantasy homebrew where adventurers are *Hunters*).
Open access: anyone signs in with Google, then creates or joins **campaigns**;
permissions are per-campaign (see "Access model & roles").

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
    users.ts  players.ts (characters)  campaigns.ts  games.ts  sessions.ts
    rsvp.ts  trades.ts  notifications.ts  allowlist.ts (legacy)
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

**Open access, per-campaign permissions.** Anyone can sign in with a verified
Google account — there is **no allowlist gate**. Permissions are scoped to each
campaign (see `firestore.rules`):

- **First login** → an **onboarding** screen captures the user's name, saved to
  `/users/{uid}` (`authStore.needsOnboarding` / `saveProfile`). Display names come
  from this profile (synthesized into `member`); a legacy `/allowlist` entry is
  used if present but never required.
- **DM** = whoever **created** a campaign (`campaign.dmUid`). `useIsDM()`
  (`features/campaigns/hooks`) gates DM controls — start/stop games, edit
  sessions, the Party roster, invites. There is no global "staff" role anymore.
- **Membership** is per-campaign: `/campaigns/{id}` + `/campaigns/{id}/members/{uid}`.
  You see/read a campaign's games/sessions/trades only if you're a member
  (`isMember`); only its DM controls it (`isCampaignDM`).
- **Super-admin** bootstrap (`SUPER_ADMIN_EMAILS`, `simonmyhre1@gmail.com`) still
  exists for the legacy `/allowlist` admin tools, but isn't needed for normal use.

**Two chromes** (`src/components/`): `MainLayout` (the main menu — account home,
**Hunters** create/manage, **Handbook**, Profile; no campaign) and `CampaignLayout`
(inside a campaign — **Play / Sessions / Party / Hunter** + a "Main menu" back
link, gated on an active campaign, with a "CAMPAIGN" badge + name).

**Characters** live in the main menu (`/character`, multiple per user). You bring
one *into* a campaign on the in-campaign **Hunter** page (`/hunter`,
`CampaignHunterPage`): it sets `membership.characterId` + `character.campaignId`
(so the campaign DM can manage it / handle death). No character creation
in-campaign; if your hunter dies you bring a fresh one (level 1).

- **Invites**: DM invites by **email** (`campaign.invitedEmails`) or shares the
  **code** (`CampaignInvitePanel`, on the Party page — copy + regenerate). Invited
  users see the campaign in the main menu and **Accept/Decline**.
- **Dev preview**: `?preview=admin.dm` (or `user.player`, …) runs as a role
  **without sign-in** — see `src/dev/preview.ts`. Preview seeds a sample campaign
  (DM-aware), so campaign chrome + DM controls render. `?preview=off` clears it.

Firestore data (all campaign data is **member-scoped** in the rules):
- `/users/{uid}` — `{ firstName, lastName, email }`. Owner only.
- `/characters/{id}` — a `HunterCard` (`ownerUid`, optional `campaignId`). Any
  signed-in user reads; owner writes; the campaign's DM may also write (death/recover).
- `/campaigns/{id}` — `{ name, dmUid, dmName, inviteCode, memberUids[],
  invitedEmails[] }` + `/members/{uid}` (`{ uid, name, email, role, characterId }`).
- `/games/{id}` (+ `/participants`, `/loot`), `/sessions/{id}` (+ `/rsvps`),
  `/trades/{id}` — all carry `campaignId` and are readable only by that campaign's
  members; games are owned/controlled by their DM.
- `/allowlist/{email}` — **legacy**, optional (super-admin only).

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

### Dev sign-in for testing (two options, both DEV-only)

- **`?preview=<role>`** — fake session, **no real data** (real Firestore calls
  fail, but Character/Party/**Play** views are seeded with mock data so the UI
  renders). Good for inspecting layout & role-gated UI without auth.
  `?preview=admin.dm`, `user.player`, `moderator.dm`, … (`?preview=off` clears it.)
- **`?testToken=<token>`** — a **REAL** Firebase session (real Firestore + rules),
  so you can test authenticated screens with live data. Mint a token with the
  `agent-test` service account (key in Doppler `AGENT_TEST_SA`):
  ```bash
  bun run token player    # or: player2 | admin | dm   → prints a custom token
  ```
  Then open `http://localhost:5173/?testToken=<token>` (it's saved to
  localStorage; `?testToken=off` clears it). Tokens last ~1h — re-mint as needed.
  The script ensures the `agent-{player,player2,admin,dm}@…` Auth user + allowlist
  entry exist. **Both paths are stripped from production builds** (gated on
  `import.meta.env.DEV`). This is the agent's "log in and test" — Google OAuth
  itself can't be automated.

### Always check BOTH mobile and desktop

The app is mobile-first **and** has a first-class desktop layout (sidebar nav,
wide two-column views). Verify every UI change at **both** sizes:

```bash
bun run scripts/shots.mjs                       # default routes, preview mode
bun run scripts/shots.mjs /character /handbook  # specific routes
BASE=https://dandd-ea955.web.app bun run scripts/shots.mjs   # against prod
```
Screenshots each route at **iPhone 15** and **1440×900 desktop**, writes
`screenshots/<route>-{mobile,desktop}.png`, and reports console errors (the
`/sessions` + `/party` "insufficient permissions" lines are expected in preview —
no real auth). Read both images; don't trust that it merely compiles.

### Testing Play mode / multiplayer / the simulation

`?preview=` shows **mock** game data (a lobby with sample hunters) — fine for
layout, but it doesn't exercise real sync. For a real live game, drive **three**
identities with `?testToken=` in separate browser contexts (Playwright
`browser.newContext()` per identity): `dm` starts a game, `player` + `player2`
join and trade. This is also how the admin **test-run simulation** is exercised.

Two real-auth verifiers exercise the live DB + **security rules** + Cloud
Function (they sign in with custom tokens, run the flow, and clean up after):

```bash
bun run smoke       # exercises every core rule path (campaign/character/game/
                    # join/lobby) + a negative test — fast, authoritative for rules
bun run test:play   # Playwright: DM + player drive a live game through the real UI
```
Run `bun run smoke` after **any firestore.rules change** — it caught two scoping
bugs that preview/check can't (rules only deploy on merge, so preview channels
still run the old rules).

### Automated screenshot gallery (one command)

```bash
bun run e2e   # signs in (real, via testToken) as player + admin, walks every
              # page, writes screenshots/ and reports console errors. Run on
              # meaningful UI changes.
```

### A. Manual / simulator walkthrough — preferred for device-specific QA

Drive **mobile Safari** in the simulator with **Appium + WebDriverIO** (the same
stack as the tools repo's `tooling/native-screenshots`; `appium` 3.x with the
`xcuitest` driver is installed globally). Sign in with `?testToken=` (real data)
or `?preview=` (UI only):

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

The UI is fully data-driven, so content updates are localized to `src/data/`:
- `classes.ts` — the six classes: traits (incl. **Max Sanity** + **Sanity Die**),
  full 1–20 **progression tables**, level-by-level **features**, and **subclasses**.
- `rites.ts` — the Deepcaller's **Rites & Whispers**.
- `skills.ts` — the C&S skill list + each skill's governing ability.
- `armor.ts` — the armory (Main / Add-on / **Armor Upgrade** / Extra).
- `handbook.ts` — the Rules chapters (creation steps, AC, carrying, Sanity).
- `abilities.ts` — ability metadata + point-buy.

The character builder, hunter sheet and handbook screens follow automatically.
Replace the PDF in `public/handbook/` if a new one arrives.

**Source of truth.** The DM's raw material lives in `resources/` (PDFs + CSVs).
`resources/extracted/` holds the clean `pdftotext` output, the structured
`content.json`, and `gen.py`, which regenerates `classes.ts` + `rites.ts` from
`content.json` + the level-table CSVs. After a content refresh, re-run
`pdftotext`, update `content.json`, and `python3 resources/extracted/gen.py`.

> A few source tables conflict with the handbook's Class Overview; resolved in
> favour of the Overview + 5e basis: Stalker Hit Die = **d8** (per Rogue), Bloodbound
> saves = **STR/CON**, Warden has **no** tool proficiency. Confirm with the DM.

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
