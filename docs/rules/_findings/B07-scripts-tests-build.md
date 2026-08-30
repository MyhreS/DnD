# B07 — Scripts, tests, build & quality-gate baseline

Scope: the non-UI supporting layer — `scripts/**`, `package.json` scripts,
`knip.json`, `eslint.config.js`, `vite.config.ts`, `functions/**`,
`firestore.rules`, and every test/fixture that asserts game-rules values.
Analysis only; no source edited. All commands below were run read-only in the
worktree (nothing touching production Firestore or deploy was executed).

---

## 0. Quality-gate baseline (run 2026-08-31, worktree clean at `9ea2403`)

### `bun run check` — VERBATIM output

```
$ bun run check
$ bun run test:codex && bun run test:ability-buy && bun run test:character-automation && bun run test:game-presentation && bun run test:enemy-library && bun run test:workshop-manager && bun run test:pwa-update-policy && tsc -b && eslint . && knip
$ bun scripts/codex-data-test.ts
 6 | import { CODEX_ENTRIES, CODEX_SOURCES, CODEX_SOURCE_BY_ID, CODEX_TOPICS } from "../src/data/codex";
 7 | import { CONDITIONS } from "../src/data/conditions";
 8 | import { SKILLS } from "../src/data/skills";
 9 | import { searchEntries } from "../src/lib/search";
10 |
11 | const master = JSON.parse(readFileSync("resources/master.json", "utf8"));
                               ^
ENOENT: no such file or directory, open 'resources/master.json'
    path: "resources/master.json",
 syscall: "open",
   errno: -2,
    code: "ENOENT"

      at /Users/simonmyhre/workdir/gitdir/DnD/.claude/worktrees/cs-beta-release-integration-be1e76/scripts/codex-data-test.ts:11:27
      at loadAndEvaluateModule (2:1)

Bun v1.3.10 (macOS arm64)
error: script "test:codex" exited with code 1
error: script "check" exited with code 1
```

`check` exits **1 at its very first step** and never reaches `tsc`, `eslint` or
`knip`. Because `&&`-chained, it is currently a *one-assertion* gate.

### Per-gate baseline (each run individually)

| Gate | Exit | Result |
|---|---|---|
| `bun run test:codex` | 1 | ENOENT `resources/master.json` (line 11) |
| `bun run test:ability-buy` | 1 | ENOENT `resources/master.json` (line 27) |
| `bun run test:character-automation` | 1 | ENOENT `resources/master.json` (line 230) — **the 229 lines before it all pass** |
| `bun run test:game-presentation` | 0 | `Game presentation edge tests passed.` |
| `bun run test:enemy-library` | 0 | `enemy library: ok` |
| `bun run test:workshop-manager` | 0 | `Workshop manager tests passed` |
| `bun run test:pwa-update-policy` | 0 | `PWA update policy tests passed.` |
| `bun run typecheck` (`tsc -b`) | **0** | clean, no output |
| `bun run lint` (`eslint .`) | **0** | `✖ 1 problem (0 errors, 1 warning)` — the single warning is `react-hooks/set-state-in-effect` at `src/features/play/…:210` (`setDismissedBattleKey(null)` inside an effect, dep `[selected?.combat?.active]`) |
| `bun run deadcode` (`knip`) | **1** | see below |

`knip` verbatim:

```
Unused devDependencies (1)
eslint  package.json:73:6
Unlisted binaries (4)
tsc     package.json
vite    package.json
eslint  package.json
knip    package.json
```

**Baseline summary for later work:** `tsc -b` is green; `eslint .` is green with
exactly 1 pre-existing warning; `knip` is red with exactly 1 unused devDependency
+ 4 unlisted binaries (all pre-existing, all unrelated to the beta swap); three
`master.json`-fed tests are hard-broken. Any *new* tsc error, any *second*
eslint warning, or any knip finding beyond those five is newly introduced.

### Not run (and why)

- `bun run smoke` / `bun run test:game-sessions` (`scripts/smoke-rules.mjs`) —
  writes to **live** Firestore via Doppler credentials.
- `bun run e2e*`, `bun run qa`, `bun run token`, `migrate:*`, `deploy*` —
  require Doppler/Firebase credentials, emulators, or write to production.
- `bun run codex:generate` — would throw immediately (see B07-1); not run to
  avoid clobbering `src/data/codex.generated.json`.

---

## 1. Broken / vacuous scripts

### `codex:generate` is dead code — every input it reads was deleted

- **txt_section**: n/a (infrastructure); sources replaced by `docs/rules/*.txt`
- **rule_summary**: The generator's entire contract (four PDFs, SHA-256 pinning,
  `schemaVersion: 4` master) describes a document set that no longer exists.
- **code_location**: `scripts/generate-codex-data.mjs:12-60`
  (`MASTER_PATH = "resources/master.json"`, `PDF_ROOT = "resources/pdf"`,
  `PUBLIC_DOCUMENT_ROOT = "public/source-library"`); `package.json:"codex:generate"`
- **app_location**: build tooling only; output feeds `src/data/codex.generated.json`
- **ui_or_logic_summary**: logic — produces the Codex index, the condition name
  list, and the public PDF download copies.
- **found_in_txt**: no (the PDF/hash pipeline is not a game rule and has no
  successor in the txt set)
- **verdict**: no_longer_a_rule
- **proposed_change**: remove — delete `scripts/generate-codex-data.mjs` and the
  `codex:generate` npm script, **or** rewrite it to read `docs/rules/*.txt`.
  It must not be left as a command that throws. If rewritten, it must keep the
  existing exclusion of `hidden-condition-sheet.txt` from all public output
  (`public/`, `src/data/*.generated.json`), which the old script achieved by
  emitting only the three player sources.
- **stored_data_impact**: none

### `test:codex` cannot run, and its `master.json` half is unrecoverable

- **txt_section**: n/a
- **rule_summary**: 40+ of its assertions read `master.json` fields
  (`schemaVersion`, `meta.documentCount`, `sources[].sha256`,
  `rites.entries.length === 21`, `whispers.entries.length === 6`,
  `hiddenConditionSheet.*`, `referencedButNotSupplied.length === 8`).
- **code_location**: `scripts/codex-data-test.ts:11-60`, plus `:14` which
  *executes* `scripts/generate-codex-data.mjs`, and `:26`/`:85` which assert the
  exact contents of `resources/pdf/` and `public/source-library/`.
- **app_location**: test only
- **ui_or_logic_summary**: logic — the only guard on Codex data integrity.
- **found_in_txt**: no (PDF/hash/master-schema assertions have no txt analogue)
- **verdict**: no_longer_a_rule
- **proposed_change**: remove the `master.json`, `resources/pdf`, SHA-256 and
  `public/source-library` blocks (lines 11-50, 62-89 in part). Keep and re-point
  the content assertions that *are* still rules: the condition list (see B07-6),
  the skill/ability table, the Whispers count of 6, hidden-source exclusion
  (`:118-119`), and the retired-term denylist (`:115-117`). Retarget the
  generated-file freshness check at whatever replaces `codex:generate`.
- **stored_data_impact**: none

### `test:ability-buy` — the numbers are still correct; only the fixture is gone

- **txt_section**: core-rulebook.txt [page 32] "Step 3: Determine Ability Scores",
  "Ability Score Point Costs", "Ability Score Point Costs V2"
- **rule_summary**: Verified against the beta txt — **every constant the test
  asserts is unchanged**. Standard: 27 points, scores 8-15, costs
  8:0 9:1 10:2 11:3 12:4 13:5 14:7 15:9, hard ceiling 20. Alternative: 57 points,
  scores 3-16, first/second/third-plus cost columns exactly as in
  `MADUHAUSU_COST` (14:[12,14,17], 15:[14,18,23], 16:[20,26,null]), and "your
  score total for one ability at the end of creating your level one character is
  max 17". Background adjustment: "your background lists three abilities;
  increase one of those scores by 2 and a different one by 1, or increase all
  three by 1" — matches `backgroundBonusSummary`.
- **code_location**: `scripts/ability-buy-test.ts:27-40,53,73,113-117`;
  values live in `src/data/abilities.ts:18-52`
- **app_location**: `src/features/hunter/lib/abilityBuy.ts`
- **ui_or_logic_summary**: logic — point-buy validation used by the builder.
- **found_in_txt**: yes (values match)
- **verdict**: match (values) / mismatch (fixture wiring)
- **proposed_change**: update — drop the `master`/`rules`/`standard`/`maduhausu`
  fixture reads and inline the beta table as literals (or assert directly against
  `src/data/abilities.ts`). Lines 32-40 and 53, 73, 114-117 are the only ones
  that need rewriting; the exhaustive 262,144 + 27,132 case sweeps stay as-is.
  **Naming caveat:** the beta text calls this "Alternative point buy" / the
  "Ability Score Point Costs **V2**" table and **never uses the word
  "Maduhausu"** anywhere in `docs/rules/*.txt`. Renaming
  `MADUHAUSU_*` / `abilityMode: "maduhausu"` would be a stored-data change —
  see stored_data_impact.
- **stored_data_impact**: none if the identifier is kept. If the constants and
  the `abilityMode` union are renamed to match the beta wording, every
  `/characters/{id}` with `abilityMode: "maduhausu"` must be remapped (and
  `normalizeCard` given a back-compat branch). Recommendation: keep the stored
  value `"maduhausu"`, change only user-visible labels — that is a UI concern
  for B01, not a data migration.

### `test:character-automation` — 229 lines pass, then it dies on the fixture

- **txt_section**: multiple; see per-assertion notes below
- **rule_summary**: Everything up to line 229 executes and passes today. The
  failure is `scripts/character-automation-test.ts:230`. Six assertions depend on
  `master`: the two point-buy budgets (`:231-232`, both still correct — 27/57),
  the Whisper-name list (`:233`), and the Rite-id list (`:234`).
- **code_location**: `scripts/character-automation-test.ts:230-234`
- **app_location**: `src/features/hunter/lib/characterAutomation.ts`,
  `src/data/characterOptions.ts`
- **ui_or_logic_summary**: logic — the widest rules regression net in the repo.
- **found_in_txt**: changed — the Rite/Whisper corpus now lives in
  `book-of-the-deepcaller.txt` and `whispers-sheet.txt`; `master.json`'s
  21-Rite / 6-Whisper snapshot is no longer authoritative.
- **verdict**: mismatch (fixture); the surviving assertions are match
- **proposed_change**: update — replace the `master` reads with assertions
  against `src/data/characterOptions.ts` cross-checked to
  `docs/rules/book-of-the-deepcaller.txt` and `docs/rules/whispers-sheet.txt`.
  Do **not** simply delete lines 230-234: `:233-234` are the only guard that the
  Rite/Whisper catalog has no duplicates and matches the source.
- **stored_data_impact**: none directly, but any Rite/Whisper renamed or dropped
  by the beta Deepcaller book invalidates stored
  `sheetAutomation.levelChoices["…forbidden revelation…"]` values on
  `/characters/{id}` (A10/A17 own the name diff; the migration must clear or
  remap choices that no longer resolve).

### `e2e:codex` will fail at runtime — the public PDFs it fetches no longer exist

- **txt_section**: n/a
- **rule_summary**: The test navigates to `/codex/documents`, requires exactly
  three `codex-document` cards titled "C&S Book of the Deepcaller", "C&S
  Character Sheet", "C&S Whispers Sheet", then `GET`s each `a[download]` href and
  asserts a `200` with `content-type: application/pdf`.
- **code_location**: `scripts/e2e-codex.mjs:79-98`
- **app_location**: `src/features/codex/**`, data from
  `src/data/codex.generated.json` (`publicPath: "/source-library/…"`)
- **ui_or_logic_summary**: UI — the Codex "Source library" download page.
- **found_in_txt**: no (there is no PDF to serve any more)
- **verdict**: mismatch
- **proposed_change**: remove the download-link block (`:91-97`) and the
  three-document assertions once the Codex is re-pointed at `docs/rules/*.txt`.
  Keep the search assertions and the two negative checks ("Hunter Rifle",
  "Old One Vessel" must return `codex-empty`) — the latter is a GM-leak guard.
- **stored_data_impact**: none

### Stale shipped artifact: `src/data/codex.generated.json` advertises dead downloads

- **txt_section**: n/a
- **rule_summary**: `public/source-library/` was removed (it is gitignored and
  only ever created by `codex:generate`), but `src/data/codex.generated.json`
  (107 KB, committed) still carries
  `"publicPath": "/source-library/book-of-the-deepcaller/c-s-book-of-the-deepcaller.pdf"`
  and two siblings, and `src/data/codex.ts:1` imports it. `.github/workflows/deploy.yml`
  runs only `bun run test:workshop-manager` + `build:ci` — it does **not** run
  `bun run check`, so nothing stops this shipping.
- **code_location**: `src/data/codex.generated.json:13,36,59`;
  `src/data/codex.ts:1`; `.github/workflows/deploy.yml:60,88`
- **app_location**: Codex "Source library" page
- **ui_or_logic_summary**: UI — live production almost certainly serves three
  download links that 404.
- **found_in_txt**: no
- **verdict**: mismatch
- **proposed_change**: update — as part of the Codex rewire (B04), regenerate or
  hand-replace this file so no `publicPath`/`downloads` entry survives without a
  real asset. Verified clean on the security side: `grep` finds **zero**
  hidden-condition content in `codex.generated.json` (no "Second Threshold",
  "Old One Vessel", "twice their Max Sanity"; the only "Hidden" hits are the
  legitimate Deepcaller "Hidden Truths" section and a Rite's "hidden from you").
- **stored_data_impact**: none

---

## 2. Tests asserting rules values the beta changed

### `codex-data-test.ts:50-51` pins a 6-condition list the beta contradicts

- **txt_section**: core-rulebook.txt [page 21] "Conditions: IMPAIRMENTS" and
  "Conditions: HAZARDS & AFFLICTIONS"; [page 22] "Conditions: BATTLEFIELD
  STATES"; [page 23] "Insane Condition"
- **rule_summary**: The beta prints a full conditions appendix.
  **Impairments:** Blinded, Deafened, Mesmerized, Frightened, Incapacitated,
  Paralyzed, Restrained, Stunned, Unconscious.
  **Hazards & afflictions:** Dying, Exhaustion, Poisoned, Sleepless,
  Suffocating, Underwater.
  **Battlefield states:** Blood-Tensed, Demoralized, Flanked, Grappled,
  High Ground, Invisible, Prone, Aiming Prone, Surrounded, Taunted.
  Plus **Insane** (Madness-driven, page 23). That is ~26 conditions.
  The test asserts exactly
  `["Blinded","Frightened","Incapacitated","Insane","Invisible","Restrained"]`
  and further asserts `CONDITIONS` equals it — so the assertion actively blocks
  any correction of the combat condition picker.
- **code_location**: `scripts/codex-data-test.ts:50-51`;
  `src/data/conditions.ts:11` (`CONDITIONS`, derived from
  `CURRENT_CONDITIONS` = `src/data/codex.ts:74` = `codex.generated.json`)
- **app_location**: `src/features/game/**` combat condition selectors
- **ui_or_logic_summary**: logic + UI — the list of conditions a DM can apply to
  a combatant.
- **found_in_txt**: changed
- **verdict**: mismatch
- **proposed_change**: update — the expected list must become the beta appendix
  (A03 should own the exact final set and whether battlefield states belong in
  the picker). Note `CONDITIONS` is *generated* data, so the fix is upstream of
  the test: `CURRENT_CONDITIONS` must stop coming from
  `codex.generated.json.conditionsNamedByCurrentSources`.
- **stored_data_impact**: `/games/{id}` combatants store
  `conditions: string[]` + `conditionSince` keyed by slug id
  (`src/features/game/lib/enemies.ts`, exercised in
  `scripts/enemy-library-test.ts:36-37` with `"poisoned"` — an id the current
  6-item `CONDITIONS` cannot even produce). Widening the list is purely
  additive; no stored value is invalidated. Any condition **renamed** by the
  beta would strand stored slugs on live combatants.

### Confirmed non-obvious match: Insight → level table is unchanged

- **txt_section**: core-rulebook.txt [page 46] "Character Advancement"
- **rule_summary**: Level/Insight = 1:0, 2:6, 3:15, 4:30, 5:50, 6:75, 7:105,
  8:140, 9:180, 10:225, 11:275, 12:330, 13:390, 14:455, 15:525, 16:600, 17:680,
  18:765, 19:855, 20:950.
- **code_location**: `src/lib/insight.ts:2` (`INSIGHT_BY_LEVEL`);
  asserted at `scripts/character-automation-test.ts:25-28`
- **app_location**: `src/features/hunter/lib/insightAward.ts`, upgrade model
- **ui_or_logic_summary**: logic — level earned from accumulated Insight.
- **found_in_txt**: yes — byte-for-byte identical
- **verdict**: match
- **proposed_change**: none. (One nuance for A06/B01, not for the tests: the
  beta adds "you reach the corresponding level **only after a Long Rest**",
  which `levelForInsight` does not model.)
- **stored_data_impact**: none

### `src/data/abilities.ts:72` comment is now factually wrong

- **txt_section**: core-rulebook.txt [page 32] "Ability Scores and Modifiers"
- **rule_summary**: The beta *does* print the modifier table
  (3 → −4; 4-5 → −3; 6-7 → −2; 8-9 → −1; 10-11 → +0; 12-13 → +1; 14-15 → +2;
  16-17 → +3; 18-19 → +4; 20 → +5), which is exactly `floor((score − 10) / 2)`.
- **code_location**: `src/data/abilities.ts:71-74` — comment reads "The
  replacement source set names Modifier fields but does not define a modifier
  formula."
- **app_location**: everywhere modifiers are derived
- **ui_or_logic_summary**: logic — the formula itself is correct.
- **found_in_txt**: changed (absent before, printed now)
- **verdict**: match (code) / mismatch (comment)
- **proposed_change**: update the comment to cite core-rulebook.txt [page 32].
  No behavioural change.
- **stored_data_impact**: none

---

## 3. `functions/` and `firestore.rules`

### Cloud Functions contain no game-rules logic beyond a level clamp

- **txt_section**: core-rulebook.txt [page 46] "Character Advancement" (level cap 20)
- **rule_summary**: Max character level is 20 (the advancement table ends at 20;
  every class table has a "LEVEL 20" capstone).
- **code_location**: `functions/src/gameSessions.ts:57`
  (`level: Math.max(1, Math.min(20, Number(data.level) || 1))`)
- **app_location**: `functions/src/gameSessions.ts` `participantFrom`
- **ui_or_logic_summary**: logic — participant roster snapshot.
- **found_in_txt**: yes
- **verdict**: match
- **proposed_change**: none. Surveyed all of `functions/src/` (`gameSessions.ts`,
  `trades.ts`, `email.ts`, `templates.ts`, `workshop.ts`, `config.ts`,
  `index.ts`): no HP/AC/Sanity/Insight/Rite math, no condition list, no
  reference to `resources/` or `master.json`. The beta swap does not touch
  Cloud Functions.
- **stored_data_impact**: none

### `firestore.rules` constrains only `transformationLevel` / `activeTransformations` — still a beta rule

- **txt_section**: core-rulebook.txt [page 26] "Gaining Transformation Level" /
  "Reducing Transformation Level" (lines 1227-1258)
- **rule_summary**: Transformation Level survives into the beta. Gaining one
  rolls on the Transformation Table; "Active Transformations do not stack";
  it "is reduced only when" resting — reduce by 1 and lose all active
  Transformations. The rules file's model (DM may raise; owner may only lower
  the level and only clear the list) is consistent with that.
- **code_location**: `firestore.rules:180-205` (`ownerTransformationOk`)
- **app_location**: rest/transformation flows in `src/features/play/**`
- **ui_or_logic_summary**: logic — server-side write authorisation.
- **found_in_txt**: yes
- **verdict**: match
- **proposed_change**: none. No other `/characters/{id}` field is constrained by
  the rules file, so **any HunterCard field rename or removal the reconciliation
  produces needs no `firestore.rules` change** — but `bun run smoke` must still
  be re-run after any edit to that file, per CLAUDE.md.
- **stored_data_impact**: none

---

## 4. Process finding

### `bun run check` masks the three healthy gates, and CI never runs it

- **code_location**: `package.json:"check"`; `.github/workflows/deploy.yml:60,88`
- **rule_summary**: `check` is a single `&&` chain starting with the broken
  `test:codex`, so `tsc`/`eslint`/`knip` are unreachable locally; and CI runs
  only `test:workshop-manager` before `build:ci`, so nothing gates a deploy on
  them either. CLAUDE.md already documents the breakage (lines ~348-360) and
  tells agents to run `tsc -b`, `eslint .` and `knip` directly.
- **found_in_txt**: no (tooling)
- **verdict**: mismatch
- **proposed_change**: once the three `master.json` tests are repaired, no change
  is needed. Until then, use the per-gate baseline in section 0 rather than
  `bun run check` to judge regressions.
- **stored_data_impact**: none
