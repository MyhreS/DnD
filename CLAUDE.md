# Catacombs & Starspawns companion app

This public repository contains the React/Firebase companion app and the D&D
Workshop coordinator. Never commit secrets or private player resources.

Read `AGENTS.md` before work. Any task involving Christoffer's separate private
app must also follow `skills/protect-christoffer-private-app/SKILL.md` in full.
That private app and its real resources must not be added to this repository or
the main Firebase project.

## Current product

The main app has these routes:

- `/` — public landing or signed-in main menu.
- `/character` — Hunter list and the single current manual character sheet.
- `/game` — standalone game lobbies, live sessions, notes, items, enemy library,
  and battle controls.
- `/codex` and `/codex/documents` — searchable current content and four PDFs;
  both are public.
- `/profile` — account and app settings.
- `/status` — chrome-free table display.

Old handbook, rules, reference, and game-card URLs redirect to the Codex without
reviving removed source filters.

## Non-negotiable game-source contract

The current source set is exactly:

1. `resources/pdf/C&S Book of the Deepcaller.pdf`
2. `resources/pdf/C&S Character Sheet.pdf`
3. `resources/pdf/C&S Hidden Condition Sheet.pdf`
4. `resources/pdf/C&S Whispers Sheet.pdf`

`resources/master.json` is the exact structured transcription and source
manifest. `scripts/generate-codex-data.mjs` validates the four names and hashes,
rejects missing or additional PDFs, clears the generated public source library,
copies one public PDF per source, and writes `src/data/codex.generated.json`.

When the game maker supplies replacements:

- Replace the canonical PDF; never keep old and new versions together.
- Remove game content, catalogs, choices, derived rules, assets, and logic that
  are absent from the new source set.
- Do not infer missing rules from an older document or from D&D conventions.
- Preserve existing saved user values only as inert/manual data. Never rerun
  retired automation.
- Keep unresolved references explicit rather than inventing their contents.
- Run `bun run test:codex`; it must prove exactly four unique source PDFs.

The current character editor is deliberately manual. It records the supplied
sheet's fields and current Whisper selections. Combat reads recorded values; it
does not calculate a class, background, armor, weapon, feat, progression,
point-buy, carrying, rest, madness, or transformation system.

## Architecture

```text
src/
  app/                  routing, authentication gate, PWA updates
  api/                  all Firestore and callable-Function access
  components/           shared shell and controls
  data/                 generated Codex plus current source-bound data
  dev/                  synthetic preview fixtures
  features/
    auth/               public landing and sign-in
    campaigns/          main menu and retained campaign support
    codex/              search and source library
    game/               lobby, live session, enemy, item and battle UI
    hunter/             Hunter list and manual source sheet
    play/               synchronized game/character/combat stores
    profile/            account settings
    status/             table display
  hooks/                shared hooks
  lib/                  cross-feature helpers
  types.ts              shared persisted and UI types
functions/src/          callable session, Workshop and email functions
resources/              canonical source PDFs and master.json
scripts/                generators, tests, E2E and Workshop manager
```

Use the `@/` alias for `src/`. Keep Firebase access in `src/api/` or Functions,
not in components. Put effects in hooks. Prefer small components and pure
helpers; split large UI when it improves ownership and testing.

## Local workflow

Work from a dedicated worktree created from fresh `origin/main`. Existing
uncommitted work belongs to its owner. Do not reset, clean, move, or kill another
agent's branch, worktree, files, or processes.

The Workshop manager owns its ticket worktrees and workers. Before broad work,
inspect its live state. If a Workshop ticket overlaps, let that worker finish,
then base or reconcile this work with its result. Never stop the manager or a
worker merely to free a port or checkout.

Windows notes:

- Use `bun`, `firebase.cmd`, and `npm.cmd` when PowerShell shims are blocked.
- Firebase emulators require Java 21 or newer.
- Use the Firebase account `simonmyhre1@gmail.com` explicitly when commands can
  select among signed-in accounts.
- Keep private credentials local; Firebase web configuration is public metadata
  and is fetched by the existing helper scripts.

## Required checks

Install root dependencies with `bun install --frozen-lockfile` and Functions
dependencies with `npm.cmd ci --prefix functions` on Windows.

```text
bun run check
npm.cmd --prefix functions run build
bun run build:ci
bun run build:workshop:ci
bun run e2e:game
bun run e2e:character-sheet
bun run e2e:codex
bun run e2e:audit
bun run test:game-sessions
bun run e2e:battle
```

`test:game-sessions` and `e2e:battle` use the Auth, Firestore, and Functions
emulators and must run serially. Browser acceptance covers authenticated preview
fixtures and signed-out public routes at narrow phone through wide desktop
sizes. Use only synthetic fixtures.

Before a PR, verify the source inventory and search for references to retired
documents or catalogs. Do not weaken a negative test merely to pass a check.

## Git and release

For implementation work:

1. Commit the dedicated worktree and push its branch.
2. Open a pull request into `main` and wait for required checks.
3. Merge the pull request.
4. The `Deploy` workflow deploys Hosting, Firestore/Storage rules, and Cloud
   Functions from `main`. Its production concurrency group is non-cancelling.
5. Wait for the production workflow to finish, then verify the real app rather
   than treating a merge or running workflow as deployment proof.
6. Check public desktop/mobile routes and an authenticated flow when the change
   affects signed-in screens. Confirm the four source PDF URLs return PDFs.

Manual production runs are permitted only from `main`. Never print, replace, or
copy protected deployment secrets. The main production URL is
`https://dandd-ea955.web.app`; Workshop has its own build and deploy workflow.
