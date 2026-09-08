# C&S app — handover

Everything below is verified against `origin/main` as of 2026-09-08.

---

## 1. FIRST: your local checkout is stale

`/Users/simonmyhre/workdir/gitdir/DnD` is on `main` but **156 commits behind**
`origin/main`, and it has uncommitted changes that pre-date the beta work and
will conflict with it:

```
 M resources/master.json          <- deleted on main
 D resources/pdf/handbook/…pdf    <- directory removed on main
 M src/data/codex.generated.json  <- regenerated on main from the txts
 M src/data/gameCard.generated.json
 M src/data/items.ts              <- heavily rewritten on main
?? app-icon-1024.png              <- untracked, harmless
```

Those edits belong to the *old* master.json pipeline, which no longer exists.
Unless you know you want something in them, discard and pull:

```bash
cd /Users/simonmyhre/workdir/gitdir/DnD
git stash -u                # keeps them recoverable, or: git checkout -- .
git pull
```

Until you do, the CLAUDE.md you (and any agent) read locally is the **old**
one — it still describes Sessions, Party, the Handbook and master.json, none of
which exist any more.

---

## 2. What shipped

Four PRs, all merged and deployed to https://dandd-ea955.web.app

| PR | What |
|---|---|
| #433 | The beta reconciliation — the big one |
| #434 | Derive background/origin feat instead of storing copies |
| #435 | Match the rulebook's spelling of feature and item names |
| #436 | Repair 187 lost ligatures in the rulebook transcription |

**The source of truth is now `docs/rules/*.txt`** — five verbatim transcriptions
(153 pages). `resources/master.json` and `resources/pdf/` are gone. The Codex
regenerates from the txts via `bun run codex:generate`, which is wired into
`dev`/`build`/`build:ci`.

Headline numbers: weapons 11 → 30, conditions 6 → 26, Codex sources 3 → 4,
items +33. Hunter Cleaver and Tactical Command removed. Sanity inverted so
Madness is tracked and Insane is derived. Bloodvial purity, an Insane Quirk
picker and Battle Master maneuvers added.

All 9 stored hunters migrated (three passes, each with a verified backup in
`~/dnd-backups/`). Re-running the migration reports **0 changes**.

---

## 3. What I need from you

### a) Chris's answers

You have them — paste them in. The one that actually blocks code:

> **Deepened Pact** — the book heads it `LEVEL 3` (p60) but the Scout's own
> progression table (p57) says subclass features come at 3/7/11/15, and the
> Beast Caller would otherwise have two at level 3 and nothing at 7.
> **The app currently uses level 7.** If Chris says 3, I change
> `src/data/classes.ts` and it's a one-line fix.

The other six are naming/consistency and only affect the book:
prices (p107), Path of the Blood Drunk spelling, tool-name apostrophes
(p95 vs p115), Hunter's Mark apostrophe, Bloodvial spelling, and whether the
Current Sanity box comes off the printable character sheet.

Note: if he **renames** anything, tell me — the app currently matches the book
verbatim, including spellings that look like slips (`Vailed Truth`,
`Fragments of a Eldritch Mind`, `The Beasts Brutality`).

### b) The new handbook

Just give me the file path. What I'll do:

1. `pdfinfo` it for the true page count — **do not trust the page count the
   harness reports**, every single one was wrong last time (939 → 126, 116 → 13,
   30 → 1).
2. Extract with `pdftotext -layout` per page, then **check for lost ligatures**
   (`grep -c "Signi cant"`). The last PDF's font had no glyph mapping for
   fi/fl/ff, so 187 words came out broken mid-word. There is a repair map in
   PR #436's commit if it recurs.
3. Replace the relevant file in `docs/rules/`, re-run `bun run codex:generate`,
   and reconcile the app against it in both directions.

**Tell me whether it replaces one of the five documents or is a sixth.** If it's
a new player-facing document it must be added to the hard-coded allowlist in
`scripts/generate-codex-data.mjs` — that list is deliberately hard-coded, never a
glob, so the GM-only hidden condition sheet can't leak into the public Codex
through a typo.

---

## 4. Follow-up work, already done on this branch

Four commits on `claude/beta-followup`, all gates green:

- **eslint is completely clean now** — zero warnings for the first time. The one
  remaining `set-state-in-effect` was a real sync-in-effect; the reset it does is
  genuinely needed (continuing an encounter reuses its `encounterId`), so it moved
  into render, which is React's documented pattern.
- **The nine pointer-only Codex entries now have real prose** — Difficulty
  Classes, Mounted Combat, Obscurement & Senses, Difficult Shots, Damaging
  Objects, Improvised Weapons, The Madness Die, Unsafe Rest Checks, Rest
  Interruption, including five proper tables. Hand-transcribed and de-interleaved
  from the two-column source. Nothing stayed a pointer.
- **The two oversized components are split.** `CodexPage.tsx` 251 → 119 (+4 small
  files); `AppEditStage.tsx` 246 → 9, with its state machine moved into
  `hooks/useAppEditStageValue.ts` per the every-useEffect-in-a-hook rule. Verified
  by byte-comparing before/after screenshots at both viewports — pixel-identical.
  Only the two documented exceptions (`GamePage.tsx`, `CharacterAutomationProvider.tsx`)
  are now over the cap.
- **A misleading report was corrected.** The migration called hunters with
  unstowed items "OVER-SLOTTED" with a warning sign, which read as breakage. It
  is not: the sheet already labels these "Unassigned", and Significant/Oversized
  items always sit there until the player picks a slot. Only the count went up.

## 5. Genuinely still open — needs a decision from you

**The death / Favor flow is unreachable.** `charactersStore.killCharacter` has no
call sites, because the DM death-confirmation surface it hangs off does not
exist. Building one is new UI and needs your call on where it lives, so it was
left alone.

There is a real bug inside it for whenever it does get wired up: it
unconditionally drops the dead hunter's gear as claimable loot, which
contradicts the Favor rule on p44–45 — if the player expends a Favor, *"your
body and everything you were wearing or carrying disappear from the world"* and
returns with them after the Band's next Long Rest. So the loot drop must become
conditional on the Favor not being spent.

---

## 6. Gotchas worth knowing

- **knip lies inside a git worktree.** A worktree without its own populated
  `node_modules/.bin` makes knip report five phantom findings (`eslint` unused +
  four "unlisted binaries"). They vanish with `bun install` in the worktree. This
  cost time twice; it's now documented in CLAUDE.md.
- **Doppler auth is path-scoped, and sibling worktrees do not inherit it.** The
  working token is scoped to exactly `/Users/simonmyhre/workdir/gitdir/DnD`, so a
  worktree at `../DnD-something` cannot see the `dnd` project and `bun run dev`,
  `codex:generate` and the migration all fail with "Could not find requested
  project". Worktrees created *inside* `DnD/.claude/worktrees/` inherit it and
  just work. Either put worktrees there, or run `doppler login` for the new path.
- **The migration is dry-run by default.** `bun run migrate:stored-characters`
  never writes. Writing needs `--apply` **and** `--backup=<file>` covering every
  document, and `bun run export:characters -- --out=<file>` makes that backup.
  Keep backups outside the repo — it's public and those are real characters.
- **Derived sheet values self-heal.** `sheet.ac`, `weight`, `speed`, `features1`
  etc. recompute on read, so stale stored copies need no migration.
- **`bun run check`** runs 8 test suites then tsc, eslint and knip, stopping at
  the first failure.

---

## 7. Where to continue

A worktree is ready and branched from `origin/main`:

```
/Users/simonmyhre/workdir/gitdir/DnD-beta-followup   branch: claude/beta-followup
```

It carries the four follow-up commits above on top of `1bd34aa` (PR #436), with
all five source transcriptions in place. Run `bun install` in it before trusting
`bun run check` — see the knip gotcha below — and note the Doppler path-scoping
gotcha, which affects this directory specifically.

Point the next agent at that directory. Everything it needs is on the branch;
nothing depends on the old `cs-beta-release-integration` worktree, which has
been deleted (its three branches survive on the remote for history:
`claude/cs-beta-release-integration-be1e76`, `claude/legacy-field-derivation`,
`claude/repair-rulebook-ligatures`).

## 8. Backups

Kept outside the repo in `~/dnd-backups/` — this repo is public and these are
real characters:

- `characters-backup-*.json` — three point-in-time exports of all 9 hunters,
  one before each migration pass
- `for-chris-book-questions.md` — the list sent to Chris
