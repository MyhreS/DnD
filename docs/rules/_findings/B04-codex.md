# B04 — The Codex feature (Direction B)

Scope: `src/features/codex/**`, `src/data/codex.ts`, `src/data/codex.generated.json`,
`scripts/generate-codex-data.mjs`, `scripts/codex-data-test.ts`, `scripts/e2e-codex.mjs`,
`resources/`, `public/source-library/`, `package.json` scripts.

## What the Codex actually reads today

The runtime dependency chain is short and entirely static:

```
src/data/codex.generated.json   (committed, 2377 lines, schemaVersion 4)
  └─ src/data/codex.ts          (types + CODEX_SOURCES/ENTRIES/TOPICS/RITES/WHISPERS/CONDITIONS)
       └─ src/features/codex/components/CodexPage.tsx   (the only UI consumer)
            ├─ /codex             CodexPage — search + Browse
            └─ /codex/documents   CodexDocumentsPage — "Source library" + download links
```

`CodexPage.tsx` is the sole importer of `@/data/codex` in `src/`. Nothing else in
the app reads `CURRENT_RITES`, `CURRENT_WHISPERS` or `CURRENT_CONDITIONS` — those
exports exist only for the test. Routes are registered twice in `src/app/App.tsx`
(main-menu chrome and campaign chrome), both pointing at the same components.

The generated file currently holds 3 public sources, **39 entries**, 21 rites,
6 whispers, and the 6-name condition list, all derived from the now-deleted
`resources/master.json`. It is frozen: the app still renders it fine, because
JSON committed to the repo does not care that its generator input is gone.

## What is broken, dangling, or stale

### Every "Download" link on /codex/documents is a dead 404
- **app_location**: `src/features/codex/components/CodexPage.tsx` `SourceLibrary()` — `<a download href={download.publicPath}>`; also `CodexVersion()`'s "View source" link (`source.publicPath` + `#page=N`).
- **ui_or_logic_summary**: Three documents each render one download anchor at `/source-library/<id>/<slug>.pdf`, plus a per-entry "View source" deep link into the same PDF at a page anchor.
- **found_in_txt**: n/a — this is a build-artifact problem.
- **verdict**: broken
- **proposed_change**: see plan step 3. `public/source-library/` is gitignored (`.gitignore:20`) and was only ever populated by `codex:generate` copying `resources/pdf/*.pdf`. Those PDFs were deleted in `ccca065`, `codex:generate` was decoupled from dev/build in the same commit, so the directory does not exist in any working tree or deployed bundle. Every download link and every "View source" link is a 404 today, in production.
- **stored_data_impact**: none.

### `bun run codex:generate` cannot run at all
- **app_location**: `scripts/generate-codex-data.mjs` lines 16–18 — `readFileSync("resources/master.json")` at module top level.
- **ui_or_logic_summary**: The whole script is written against `master.json` schemaVersion 4: it validates exactly four PDF filenames, SHA-256s each one, wipes and recreates `public/source-library/`, and emits entries for rites/whispers/character-sheet sections/`referencedButNotSupplied`.
- **found_in_txt**: n/a.
- **verdict**: broken (dead script — throws ENOENT on line 1 of real work)
- **proposed_change**: rewrite against `docs/rules/*.txt` (plan step 2) or delete. It cannot be left as-is: `package.json` still exposes `"codex:generate"`, and `resources/README.md` already documents it as non-functional.
- **stored_data_impact**: none.

### `bun run check` fails on its first command
- **app_location**: `package.json` `"check": "bun run test:codex && …"`; `scripts/codex-data-test.ts` line 11.
- **ui_or_logic_summary**: `test:codex` reads `resources/master.json`, then re-runs the generator and diffs its output, then asserts the four PDFs exist with matching hashes, then asserts three files under `public/source-library/`. Verified by running it: `ENOENT: no such file or directory, open 'resources/master.json'`.
- **found_in_txt**: n/a.
- **verdict**: broken
- **proposed_change**: The quality gate the whole repo depends on is red before any of this reconciliation work starts. Fixing this is the highest-priority item in the Codex scope — see plan step 4. Note ~45 of the test's ~60 assertions are assertions about `master.json` itself (rite counts, hidden-sheet sections, point-buy budgets, `referencedButNotSupplied` counts) and simply have no successor; only the assertions about `CODEX_*` shape, the hidden-source exclusion, and the search behaviour survive.
- **stored_data_impact**: none.

### `bun run e2e:codex` asserts the dead downloads are live PDFs
- **app_location**: `scripts/e2e-codex.mjs` — fetches every `a[download]` href and requires `content-type: application/pdf`; also waits for the text `/3 sources.*3 PDFs/`.
- **verdict**: broken
- **proposed_change**: replace the PDF-fetch assertions with whatever the retargeted downloads become (plan step 3).
- **stored_data_impact**: none.

### Both test scripts treat "Hunter Rifle" as retired content — it is current again
- **app_location**: `scripts/codex-data-test.ts` retired-content loop; `scripts/e2e-codex.mjs` (`search.fill("Hunter Rifle")` → expects `codex-empty`).
- **found_in_txt**: `core-rulebook.txt` [page 111] Martial Ranged Weapons — "Hunter Rifle 1d10 Piercing … Slow, 10 lb., Significant Item (back)"; [page 113] weapon plate.
- **verdict**: stale assertion
- **proposed_change**: remove "Hunter Rifle" from both retired lists. The other six names (Blood Frenzy, Unstable Violence, Cracked Perception, Second Threshold, Old One Vessel, Greater Dreadblood) need re-checking against the beta individually — Cracked Perception in particular is now a real rule (A03 finds it as the Insane upside).
- **stored_data_impact**: none.

### The Codex content itself is one beta behind, and 122 of 126 rulebook pages are absent
- **app_location**: `src/data/codex.generated.json` — groups are Rites (21), Whispers (6), Character Sheet (7), Source Notes (5).
- **ui_or_logic_summary**: The Browse list on `/codex` renders one button per group; the page copy says "Deepcaller Rites, Whispers, and the current printable character sheet".
- **found_in_txt**: the Rite/Whisper text is still substantially correct — A17 confirms "Rites catalog content matches the new source exactly" — but A10 flags real drift (e.g. Absolute Union says "Charmed" where the beta says "Mesmerized"). Meanwhile `core-rulebook.txt` is a **new, 126-page player-facing document that the Codex has no entries from at all**: conditions (A03: "Codex has no Conditions content at all"), the action tables, rest/transformation, mounted and obscurement rules (A02), Damaging Objects and the weapon property glossary (A15).
- **verdict**: stale + missing_in_code
- **proposed_change**: plan step 2 — regenerate from the txts and add `core-rulebook` as a fourth source.
- **stored_data_impact**: none. `codex.generated.json` is read-only reference data; no `/characters/{id}` field points into it.

### `resources/` is now a README and nothing else
- **app_location**: `resources/README.md` (the only file left in the tree).
- **verdict**: stale-but-harmless
- **proposed_change**: keep the README (it actively warns against restoring the PDFs). But `CLAUDE.md`'s "Updating game content" section still describes the four-PDF pipeline, the SHA-256 verification, and `public/source-library/` as live behaviour — it contradicts both the README and reality and must be rewritten in the same change.
- **stored_data_impact**: none.

### GM-only boundary: currently safe, and the new pipeline must keep it that way
- **app_location**: `scripts/codex-data-test.ts` — `CODEX_SOURCE_BY_ID.has("hidden-condition-sheet") === false` and no entry carries that `sourceId`.
- **found_in_txt**: `docs/rules/hidden-condition-sheet.txt` (GM-only).
- **verdict**: match (holds today because the hidden sheet was filtered out by `audience !== "player"` before generation)
- **proposed_change**: The replacement generator must read only the four player txts by an **explicit allowlist of filenames**, never by scanning `docs/rules/*.txt` and filtering — a filter is one typo away from leaking. Keep both exclusion assertions in the new test and add one that the generated JSON contains no substring from the hidden sheet.
- **stored_data_impact**: none.

## Proposed plan — regenerate from the txts, retarget downloads to text

Three options were on the table. Recommendation and reasoning:

- **(a) Scope the Codex down** (drop the Source library, keep frozen rite/whisper
  search). Rejected: it deletes a page the user has and removes the only place
  the new 126-page rulebook could ever surface. It also still leaves the dead
  generator and the red `check` gate.
- **(b) Keep the PDF pipeline, re-add PDFs.** Rejected: the PDFs are deliberately
  deleted and `resources/README.md` forbids restoring them. The 92 MB rulebook
  should not enter a public Hosting bundle regardless.
- **(c) Regenerate `codex.generated.json` from `docs/rules/*.txt`, and retarget
  the Source library's downloads at the txt files.** ← **recommended.**

(c) is the only option that keeps every existing screen working, adds the beta's
new content, and turns the gate green. It changes **no** Codex UI structure: the
same `CodexSource` / `CodexEntry` / `CodexTopic` shapes, the same search, the
same `<details>` topic rows, the same Source library cards. Only the data behind
them, and the file the download anchor points at, change.

### Step 1 — copy the player txts into the public bundle
- **proposed_change**: New generator writes `public/source-library/<id>/<id>.txt`
  for the four player documents. Keep `public/source-library/` gitignored and
  keep it generated, exactly as before. Add `bun run codex:generate` back as a
  `prebuild`/`predev` step (or call it from `build:ci`) so the directory always
  exists in a deployed bundle — its absence from the build is what made the
  current links 404 in production.
- **stored_data_impact**: none.

### Step 2 — rewrite `scripts/generate-codex-data.mjs` against the txts
- **proposed_change**: Replace the `master.json` reader with a hard-coded
  four-entry source table:

  | id | file | shortLabel | pageCount |
  |---|---|---|---|
  | `core-rulebook` | `docs/rules/core-rulebook.txt` | Core Rulebook | 126 |
  | `book-of-the-deepcaller` | `docs/rules/book-of-the-deepcaller.txt` | Book of the Deepcaller | 13 |
  | `character-sheet` | `docs/rules/character-sheet.txt` | Character Sheet | 11 |
  | `whispers` | `docs/rules/whispers-sheet.txt` | Whispers Sheet | 2 |

  `hidden-condition-sheet.txt` is **not in the table** and is never opened.
  Parse `[page N]` markers to populate the existing `sourcePages` field (which
  already drives the "PDF pp. N–M" locator line — relabel that string to
  "pp." since it is no longer a PDF). Emit entries per section heading, using
  the `add({ term, aliases, paragraphs, tables, group, sourceId, locator,
  sourcePages })` helper unchanged. Keep the `Rites` and `Whispers` groups
  (regenerated from `book-of-the-deepcaller.txt` / `whispers-sheet.txt` so
  A10's Mesmerized/Charmed drift is fixed at the source), keep `Character
  Sheet`, and add groups from the rulebook — at minimum `Conditions`,
  `Equipment`, `Combat`, `Rest & Transformation`. Drop the `Source Notes` group
  and `referencedButNotSupplied` entirely: it was a property of `master.json`
  and has no successor.
- **stored_data_impact**: none — `codex.generated.json` is reference data only.

### Step 3 — retarget the download and "View source" links
- **app_location**: `CodexPage.tsx` `SourceLibrary()` and `CodexVersion()`.
- **proposed_change**: The `download` / `publicPath` fields keep their names and
  shape; only their values change from `.pdf` to `.txt`. Three copy edits, no
  structural change: `SourceLibrary`'s `` `${item.downloads.length} downloadable
  PDF` `` → "document"; `CodexHome`'s `` `${…} PDFs` `` → "documents"; the
  documents-page subheading "The three current player documents" → "four". The
  `#page=N` fragment on "View source" is meaningless for a `.txt` and should be
  dropped (a plain link to the file). `DOCUMENT_SOURCE_ORDER` gains
  `"core-rulebook"` at the front.
- **stored_data_impact**: none.

### Step 4 — rewrite the two test scripts
- **proposed_change**: `scripts/codex-data-test.ts` keeps the "regenerate and
  diff" staleness check (repointed), the per-entry integrity loop, the
  `CONDITIONS` and `SKILLS` cross-checks (now sourced from the generated data
  rather than `master.json`), the search assertions, and **both** hidden-source
  exclusions plus the new no-hidden-substring assertion. Everything asserting
  `master.json` internals, PDF filenames, and SHA-256 hashes is deleted. Update
  the source count 3 → 4 and the entry count. `scripts/e2e-codex.mjs`: drop the
  `application/pdf` content-type check (assert `200` + non-empty body instead),
  update `/3 sources.*3 PDFs/` and the three expected titles to four, and remove
  "Hunter Rifle" from the retired-content probe.
- **stored_data_impact**: none.

### Step 5 — documentation
- **proposed_change**: Rewrite `CLAUDE.md` "Updating game content" to describe
  the txt pipeline (four player sources + one GM-only source, no hashes, no
  PDFs) and update `resources/README.md`'s paragraph saying the pipeline "no
  longer runs".

### Explicitly out of scope
No change to the Codex's visual design, routing, search algorithm
(`src/lib/search.ts`), or the `CodexSource`/`CodexEntry`/`CodexTopic` type
shapes. `src/data/codex.ts` needs at most a comment fix ("PDF" → "document").

---

## Direction A coverage check

**A real gap existed.** The A01–A17 numbering skips A15, and a section/page map
of `core-rulebook.txt` shows it corresponds to genuinely uncovered source.

Method: `core-rulebook.txt` carries 126 `[page N]` markers; I built the
page→heading map and extracted every `page N` citation from A01–A17. The union
of cited pages covers 3–106 and 114–124 with no meaningful holes (the uncited
pages inside that span are full-page artwork plates and blank pages — 4, 36–37,
39, 48, 55, 62, 68, 79, 86, 112–113, 125–126 — plus a handful of pages folded
into a neighbour's finding).

The one uncovered stretch of rules content is **[page 107] – [page 111]**:
Chapter 6's opening (Types of Equipment, Coins, Bullets, the Weapons-table
preamble defining Category / Melee-or-Ranged / Damage / Properties / Mastery),
Damaging Objects, Improvised Weapons, Weapon Proficiency, the eleven weapon
Properties, the eight Mastery Properties, and the 29-row Weapons table itself.
A16 begins Chapter 6 at [page 114] (Armor) and runs to [page 124]; A01, A02 and
A08 touch `src/data/weapons.ts` only in passing (Unarmed Strike, `Nick`,
proficiency-adds-to-attack-not-damage, the Trained Pistol's Close Range). No
finding analysed the Weapons table or the property glossaries.

Written up as **`docs/rules/_findings/A15-weapons-properties-mastery.md`** (12
findings). The headline items: the app catalogs 10 of the source's 29 weapons;
`Hunter Rifle` is flagged `unique: true` in `src/data/items.ts` and asserted as
*retired content* by `scripts/codex-data-test.ts`, yet it is a plain Martial
Ranged weapon on [page 111]; weapon Category (Simple/Martial) is absent from
`WeaponFacts`, which is the missing field A09's mastery-picker finding needs;
there is no property glossary to match the existing `WEAPON_MASTERY_DESCRIPTIONS`;
and Heavy's new "Strength/Dexterity 13" gate is unimplemented. The eight mastery
definitions and all ten catalogued weapons' damage/properties/weights are
confirmed exact matches and should be left alone.

The other four txts are fully covered: `book-of-the-deepcaller.txt` by A17 and
A10, `whispers-sheet.txt` by A10, `character-sheet.txt` by A03/A06, and
`hidden-condition-sheet.txt` deliberately only as a boundary (A04's "GM-only
boundary: LOST").
