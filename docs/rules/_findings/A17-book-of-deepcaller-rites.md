# A17 — Book of the Deepcaller (Rites) reconciliation

Source read in full: `docs/rules/book-of-the-deepcaller.txt` (13 pages, 21 Rites).
Code read: `src/data/codex.generated.json` (`rites[]`), `src/data/codex.ts`,
`src/data/characterOptions.ts`, `src/features/hunter/components/appsheet/AppDeepcallerReference.tsx`,
`src/features/hunter/components/character-sheet/{upgradeModel.ts,CharacterSheetUpgradeChoices.tsx,CharacterSheetResources.tsx}`,
`src/features/codex/components/CodexPage.tsx`, `src/data/classes.ts` (Deepcaller),
`scripts/generate-codex-data.mjs`, `scripts/codex-data-test.ts`, `scripts/character-automation-test.ts`.

## Headline

**The Rite *content* is already correct.** `codex.generated.json` carries exactly
the same 21 Rites as the new txt, with matching level, type, performing, range,
duration, body text, higher-Strain upgrade text, section and source pages. The
stale generated file happens to have been generated from a `master.json` whose
Rites were transcribed from the same beta PDF. Nothing in the Rites catalog
contradicts the new source.

**What is broken is the pipeline, not the data**: the generator's input
(`resources/master.json`, `resources/pdf/*`) is deleted, so `bun run codex:generate`,
`bun run test:codex` and part of `bun run test:character-automation` now throw,
and the Codex's PDF download links point at a `public/source-library/` tree that
no longer exists.

---

## Rite-by-rite comparison (txt → app)

All 21 rites are present in `codex.generated.json` → `CURRENT_RITES` →
`DEEPCALLER_RITES`. Fields compared: level, Type, Performing, Range, Duration,
body text (incl. saving throw + damage dice), higher-Strain upgrade line.

| # | Rite (txt) | pg | Lvl | Type | In app | Level | Perform | Range | Duration | Body/save/damage | Upgrade line | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Eldritch Rebuke | 2 | 1 | Evocation | `eldritch-rebuke` | ✓1 | ✓Reaction (full clause) | ✓60 ft | ✓Instantaneous | ✓Dex save, 2d10 Fire | ✓+1d10/Strain>1 | match |
| 2 | Eldritch Chain of Bolts | 2 | 1 | Evocation | `eldritch-chain-of-bolts` | ✓1 | ✓Action | ✓60 ft | ✓Conc. 10 rounds | ✓ranged Rite attack, 2d12 Lightning, 1d12 bonus-action | ✓+1d12/Strain>1 | match |
| 3 | Darkness | 2 | 2 | Evocation | `darkness` | ✓2 | ✓Action | ✓60 ft | ✓Conc. 20 rounds | ✓15-ft-radius Sphere | ✓none | match |
| 4 | Armor of the Drowned Star | 3 | 1 | Protection | `armor-of-the-drowned-star` | ✓1 | ✓Bonus Action | ✓Self | ✓20 rounds | ✓5 Temp HP, 5 Cold | ✓+5/+5 per Strain>1 | match |
| 5 | Shattered Reflection | 3 | 2 | Illusion | `shattered-reflection` | ✓2 | ✓Action | ✓Self | ✓10 rounds | ✓3 duplicates, d6 ≥3 | ✓none | match |
| 6 | Misty Step | 3 | 4 | Traversal | `misty-step` | ✓4 | ✓Bonus Action | ✓Self | ✓Instantaneous | ✓30 ft, 3 Madness | ✓none | match |
| 7 | Mindgrab | 4 | 2 | Mind Influence | `mindgrab` | ✓2 | ✓Action | ✓120 ft | ✓Concentration (no cap) | ✓Wis save, 3d8 Mind | ✓+1d8/Strain>2 | match |
| 8 | Enthrall | 4 | 2 | Mind Influence | `enthrall` | ✓2 | ✓Action | ✓60 ft | ✓Conc. 10 rounds | ✓Wis save, −10 Perception, 2 Madness | ✓none | match |
| 9 | Eldritch Cacophony | 4 | 5 | Mind Influence | `eldritch-cacophony` | ✓5 | ✓Action | ✓120 ft | ✓Instantaneous | ✓Int save, 8d6 Mind, muddled 10 rounds, −1d6 | ✓+2d6/Strain>5 | match |
| 10 | Detect Eldritch Presence | 5 | 1 | Detection | `detect-eldritch-presence` | ✓1 | ✓Action | ✓Self | ✓Conc. 20 rounds | ✓30 ft, Close/Away/Far | ✓none | match |
| 11 | Eldritch Eye | 5 | 1 | Detection | `eldritch-eye` | ✓1 | ✓Three Actions | ✓Self | ✓Conc. 20 rounds | ✓Wis save + both modifier tables (+5/+0/−5; −2/−4/−10) | ✓none | match |
| 12 | Arms of Hastur | 6 | 1 | Summoning | `arms-of-hastur` | ✓1 | ✓Action | ✓Self | ✓Instantaneous | ✓10-ft Emanation, Str save, 2d6 Acid | ✓+1d6/Strain>1 | match |
| 13 | Grasp of Yog-Sothoth | 6 | 2 | Summoning | `grasp-of-yog-sothoth` | ✓2 | ✓Action | ✓60 ft | ✓Conc. 10 rounds | ✓Str save, 2d6 Bludgeoning, Restrained, "f a creature dies" typo repaired | ✓+1d6/Strain>2 | match |
| 14 | Unknown Realm | 7 | 3 | Summoning | `unknown-realm` | ✓3 | ✓Action | ✓120 ft | ✓Conc. 10 rounds | ✓30-ft Cube, Wis save, 2 Madness, Incapacitated, Speed 0 | ✓none | match |
| 15 | Grasp of the Starless Deep | 7 | 4 | Summoning | `grasp-of-the-starless-deep` | ✓4 | ✓Action | ✓90 ft | ✓Conc. 10 rounds | ✓20-ft square, Str save, 3d6 Bludgeoning, Restrained, Athletics vs Rite DC | ✓none | match |
| 16 | Call Lesser Starborn | 8 | 6 | Summoning | `call-lesser-starborn` | ✓6, `section:"Hidden Truths"` | ✓Action | ✓90 ft | ✓Conc. 20 rounds | ✓Lesser Starborn stat block | ✓10 Temp HP per Strain>5 | match |
| 17 | True Seeing | 9 | 6 | Detection | `true-seeing` | ✓6, Hidden Truths | ✓Action | ✓Touch | ✓20 rounds | ✓Truesight 120 ft, 4 Madness | ✓none | match |
| 18 | Plane Shift | 9 | 7 | Traversal | `plane-shift` | ✓7, Hidden Truths | ✓Action | ✓Touch | ✓Instantaneous | ✓truncated text + `sourceNote` recording the ellipsis | ✓none | match |
| 19 | Mind Shatter | 10 | 8 | Mind Influence | `mind-shatter` | ✓8, Hidden Truths | ✓Action | ✓150 ft | ✓Instantaneous | ✓Int save, 10d12 Mind, no Rites 10 rounds, INT/WIS/CHA mods −5, 3 Madness | ✓none | match |
| 20 | Foresight | 10 | 9 | Protection | `foresight` | ✓9, Hidden Truths | ✓Three Actions | ✓Touch | ✓10 rounds | ✓Advantage on all D20 Tests, Disadv. against | ✓none | match |
| 21 | Call Starborn Horror | 11 | 9 | Summoning | `call-starborn-horror` | ✓9, Hidden Truths | ✓Action | ✓120 ft | ✓5 rounds | ✓30-ft Sphere, Wis save, 10d10 Mind, 10/5/4/10 Madness, behaviour table | ✓none | match |

**Reverse direction:** every rite the app currently has (all 21 ids above, in
`codex.generated.json`, `CODEX_ENTRIES` group `"Rites"`, and `DEEPCALLER_RITES`)
still appears in the new txt. **No orphan rites, no extra rites, no renames.**
`Hidden Truths` section count is 6 in both. Damage types used across the 21 rites
are exactly Fire, Lightning, Cold, Acid, Bludgeoning, Mind — all covered by
`DAMAGE_PATTERN` in `characterOptions.ts`.

---

### Rites catalog content matches the new source exactly

- **txt_section**: book-of-the-deepcaller.txt [pages 2–11], all 21 rite blocks
- **rule_summary**: 21 Rites, levels 1–9; 6 of them under the "Hidden Truths"
  heading (Call Lesser Starborn 6, True Seeing 6, Plane Shift 7, Mind Shatter 8,
  Foresight 9, Call Starborn Horror 9). Types: Evocation, Protection, Illusion,
  Traversal, Mind Influence, Detection, Summoning.
- **code_location**: `src/data/codex.generated.json` → `rites[]` (21 entries) and
  `entries[]` group `"Rites"` (21 entries); projected by `src/data/codex.ts`
  (`CURRENT_RITES`) into `src/data/characterOptions.ts` (`DEEPCALLER_RITES`).
- **verdict**: match
- **proposed_change**: none to the values. See the authoring finding below for
  where they should live.
- **stored_data_impact**: none. No rite id or name changed, so stored
  `HunterCard.levelChoices` values (Forbidden Revelation picks are stored by
  **rite name**, see `upgradeModel.ts` / `forbiddenRevelationOptions`) all remain
  valid. No `/characters/{id}` migration is needed for Rites.

### The Rites pipeline is dead — generator input deleted, generated file frozen

- **txt_section**: book-of-the-deepcaller.txt is now the source of record;
  `resources/README.md` states `master.json` and `resources/pdf/` are deleted.
- **rule_summary**: n/a — tooling, not a game rule.
- **code_location**: `scripts/generate-codex-data.mjs` lines 12–58 read
  `resources/master.json` and `resources/pdf` and hard-fail on a missing file /
  SHA mismatch; `scripts/codex-data-test.ts:11` and
  `scripts/character-automation-test.ts:230–241` both read `resources/master.json`.
  `src/data/codex.generated.json` (107 KB) is now an unregenerable artifact.
- **verdict**: mismatch (tooling contradicts the documented current state)
- **proposed_change**: see "Where Rites data should live" below.
- **stored_data_impact**: none.

### Codex Deepcaller PDF download links point at files that do not exist

- **txt_section**: n/a (source-set change)
- **rule_summary**: n/a
- **code_location**: `src/data/codex.generated.json` → `sources[0]`
  (`book-of-the-deepcaller`) declares
  `publicPath: "/source-library/book-of-the-deepcaller/c-s-book-of-the-deepcaller.pdf"`
  and one `downloads[]` entry; rendered by
  `src/features/codex/components/CodexPage.tsx:151, 170, 175–176, 214`.
  `public/source-library/` does not exist in the repo and is no longer produced by
  any script, so every "Download Deepcaller Book" link 404s in dev and in the
  deployed bundle.
- **verdict**: mismatch
- **proposed_change**: either (a) drop `publicPath`/`downloads` from the source
  records and let `CodexPage` render the source card without download links (the
  component already guards with `source.publicPath ?? source.downloads[0]?.publicPath`,
  and `downloads` is `[]`-safe at lines 170/175), or (b) re-add a
  `public/source-library/` copy step for the three player-facing sources. (a) is
  the minimal edit while the PDFs are absent from the repo. Also correct the
  `sourceFiles`/`fileLabels` entries, which still name
  `resources/pdf/C&S Book of the Deepcaller.pdf`. No layout change either way.
- **stored_data_impact**: none.

### Rite availability filter correctly implements the Strain rule

- **txt_section**: book-of-the-deepcaller.txt supplies rite levels;
  core-rulebook Deepcaller class text is mirrored in `src/data/classes.ts:315`
  ("You can perform any Hunter Deepcaller Rite of a level equal to or lower than
  your current Strain level").
- **rule_summary**: Strain level caps at 5 (class table, `classes.ts:293–312`), so
  the six Hidden Truths rites (levels 6–9) are unreachable through Strain and are
  only obtainable via Forbidden Revelation.
- **code_location**: `AppDeepcallerReference.tsx:64`
  `DEEPCALLER_RITES.filter((rite) => rite.level <= currentStrainLevel)`; the
  Revelation path is `characterOptions.ts:99–103` `forbiddenRevelationOptions`.
- **verdict**: match (non-obvious — worth recording so it is not "fixed")
- **proposed_change**: none.
- **stored_data_impact**: none.

### Forbidden Revelation options match the class rule against the new rite set

- **txt_section**: rite levels from book-of-the-deepcaller.txt; the choice rule
  is the level-11 "Forbidden Revelation" feature text (`classes.ts:326`): a Rite
  of the Revelation's level, **or** a Level 1–5 Rite that offers a Higher-Level
  Strain option.
- **rule_summary**: against the new set that yields — Level 6: Call Lesser
  Starborn, True Seeing; Level 7: Plane Shift; Level 8: Mind Shatter; Level 9:
  Foresight, Call Starborn Horror; plus, at every Revelation level, the seven
  Level 1–5 rites that print a Higher-Level Strain line (Eldritch Rebuke,
  Eldritch Chain of Bolts, Armor of the Drowned Star, Mindgrab, Eldritch
  Cacophony, Arms of Hastur, Grasp of Yog-Sothoth).
- **code_location**: `src/data/characterOptions.ts:99–103`
- **verdict**: match
- **proposed_change**: none.
- **stored_data_impact**: none — all six Hidden Truths names and all seven
  upgradeable rite names are unchanged, so stored `levelChoices` Revelation picks
  stay valid.

### Higher-Strain damage projection matches every printed upgrade line

- **txt_section**: the seven "Using (a) Higher-Level Strain" lines
  (pages 2, 3, 4, 6) plus Call Lesser Starborn's Temp-HP upgrade (page 8).
- **rule_summary**: Rebuke +1d10/Strain>1 (base 2d10); Chain of Bolts +1d12/>1
  (base 2d12 initial, flat 1d12 ongoing); Armor of the Drowned Star +5 Temp HP
  and +5 Cold per Strain>1 (base 5); Mindgrab +1d8/>2 (base 3d8); Cacophony
  +2d6/>5 (base 8d6); Arms of Hastur +1d6/>1 (base 2d6); Grasp of Yog-Sothoth
  +1d6/>2 (base 2d6).
- **code_location**: `src/data/characterOptions.ts:116–128` `riteDamageAtStrain`.
  Verified arithmetic at base level: rebuke `strain+1`→2d10 ✓; chain `strain+1`→
  2d12 + 1d12 ongoing ✓; armor `strain*5`→5 ✓; mindgrab `strain+1`→3d8 ✓;
  cacophony `8 + max(0,strain−5)*2`→8d6 ✓; arms `strain+1`→2d6 ✓; grasp
  `strain`→2d6 ✓. All other rites fall through to the parsed printed dice.
- **verdict**: match
- **proposed_change**: none. (Note the *source itself* is internally inconsistent
  on Call Lesser Starborn: the rite is Level 6 but its upgrade says "for each
  Strain level above 5". The app does not compute it — it shows the line verbatim
  in the "At higher level Strain" row of `AppDeepcallerReference` — which is the
  right handling. Flag to the game maker rather than "fixing" it in code.)
- **stored_data_impact**: none.

### Zealot Whispers cannot select Level 1 Rites in the app

- **txt_section**: book-of-the-deepcaller.txt supplies the seven Level 1 Rites
  (Eldritch Rebuke, Eldritch Chain of Bolts, Armor of the Drowned Star, Detect
  Eldritch Presence, Eldritch Eye, Arms of Hastur — and note the Zealot feature
  "Carved Armor of The Drowned Star" names one of them directly). The rule is in
  the Hunter Zealot Prestige Class, mirrored at `src/data/classes.ts:342`
  ("when you prepare Whispers, you can choose from both normal Whispers **and
  Level 1 Hunter Deepcaller Rites**"; prepared count = Deepcaller count **+1**).
- **rule_summary**: a Level 1 Rite prepared this way becomes a Zealot Whisper: no
  Book, no Strain, no Madness, cannot use Higher-Level Strain, normal Rite Save
  DC / attack modifier.
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetUpgradeChoices.tsx:41`
  offers only `DEEPCALLER_WHISPERS` (the 6 Whispers-sheet entries); the whisper
  limit at `src/features/hunter/lib/characterAutomation.ts:257` has no Zealot +1.
  `card.preparedWhispers` is a plain id list (`src/types.ts:552`), so it can already
  hold rite ids without a schema change.
- **verdict**: missing_in_code
- **proposed_change**: when the hunter is in the Zealot prestige path, extend the
  existing choice list with `DEEPCALLER_RITES.filter(r => r.level === 1)` and add
  +1 to `whisperLimit`. Same `ChoiceToggle` component, same page — no new UI.
  (Cross-check with whoever owns the Zealot/core-rulebook findings before acting;
  the trigger condition lives in the class data, not this document.)
- **stored_data_impact**: none for existing records (no Zealot hunter can
  currently have stored a rite id). If implemented, `preparedWhispers` gains
  possible values from the rite id space — any reader must tolerate an id that is
  not in `DEEPCALLER_WHISPERS`. `AppDeepcallerReference.tsx:61–63` already
  silently drops unknown ids, so it degrades safely.

---

## Where Rites data should live (recommendation)

**Principle to preserve:** the rite text is authored **once**, and both the Codex
and the Hunter sheet project from that one place. That principle is currently
satisfied in shape (`codex.generated.json` → `codex.ts` → `characterOptions.ts` →
UI) but broken in substance, because the one place is now an unregenerable blob
whose upstream is deleted.

**Recommendation — make `docs/rules/book-of-the-deepcaller.txt` the generator's
input, and keep everything downstream exactly as it is.**

1. Keep `src/data/codex.generated.json` as the single build artifact and keep its
   `rites[]` shape byte-compatible with today's. `src/data/codex.ts`,
   `characterOptions.ts`, `AppDeepcallerReference.tsx`, `upgradeModel.ts` and
   `CodexPage.tsx` then need **no changes at all** — the whole UI, and the
   `Level N Rite / school / damage` projection, keeps working untouched.
2. Rewrite `scripts/generate-codex-data.mjs` to parse the `docs/rules/*.txt`
   transcriptions instead of `resources/master.json` + PDF hashes. The Deepcaller
   file is trivially machine-readable: `[page N]` markers, `# Hidden Truths`
   section headings, `## RITE NAME` + `Level N`, then the four labelled lines
   `Type:` / `Performing:` / `Range:` / `Duration:`, then body paragraphs, with
   the `Using (a) Higher-Level Strain.` paragraph split off into `upgrade` and
   Markdown pipe-tables (Eldritch Eye) into `tables`. Ids stay the existing
   `slug(name)` values, so nothing stored or linked changes.
3. Replace the PDF SHA-256 gate with a **SHA-256 of each `docs/rules/*.txt`**
   recorded in the generated file, so an edited transcription still fails the
   check loudly. Drop the "exactly four PDFs in `resources/pdf`" assertion and the
   `public/source-library/` copy step; drop `publicPath`/`downloads`/`sourceFiles`
   from the source records (or repoint them at the txts) — see the broken-download
   finding.
4. Point `scripts/codex-data-test.ts` and `scripts/character-automation-test.ts`
   at `src/data/codex.generated.json` (or at a parsed `docs/rules/` fixture)
   instead of `resources/master.json`, keeping the same assertions: 21 rites,
   6 Hidden Truths, Plane Shift's ellipsis `sourceNote`, no invented Whisper
   levels, and the `riteDamageAtStrain` spot checks.
5. Keep the GM-only `hidden-condition-sheet.txt` explicitly excluded from the
   generator's input list, with a test asserting no phrase from it reaches
   `codex.generated.json`.

**Rejected alternatives.** Hand-writing a `src/data/rites.ts` catalog would
re-create the second hand-maintained copy CLAUDE.md forbids, and would drift from
the txt the moment the game maker ships a new beta. Reviving `resources/master.json`
would re-introduce a hand-maintained intermediate between the source and the
build — the exact layer that just went stale. Parsing the txt at runtime in the
browser would ship the transcriptions (and the parser) to the client and risks
leaking the GM-only file into the bundle.
