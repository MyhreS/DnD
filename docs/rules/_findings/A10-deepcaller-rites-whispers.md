# A10 — Hunter Deepcaller, Rites & Whispers

Scope: `core-rulebook.txt` [pages 69–78] (Deepcaller class, Rites system, Zealot
Prestige Class) + `whispers-sheet.txt` (all 6 Whispers) + `book-of-the-deepcaller.txt`
(21 Rites, used as the cross-check for the app's Rite catalog).

Headline: the **Rite/Whisper content** in `src/data/codex.generated.json` is
verbatim-accurate against the new beta txts (all 21 Rites + 6 Whispers match
name, level, type, performing, range, duration, upgrade and body text — the only
diffs found by a normalized full-text comparison were the Unicode ellipsis in
Plane Shift and the em dash in Minor Illusion). The problem is **provenance**:
that file's generator input is deleted, so the value is orphaned. The genuine
rule mismatches are all in `src/data/classes.ts` (class/subclass feature text).

---

### Rites & Whispers data is orphaned — generator input deleted

- **txt_section**: book-of-the-deepcaller.txt (whole file, 21 Rites); whispers-sheet.txt (whole file, 6 Whispers)
- **rule_summary**: The Rites and Whispers are now defined only by the two txt transcriptions. `book-of-the-deepcaller.txt` supplies 21 Rites (Eldritch Rebuke L1 … Call Starborn Horror L9, with a `Hidden Truths` section from Call Lesser Starborn onward); `whispers-sheet.txt` supplies exactly 6 Whispers (Eldritch Blast, Eldritch Strike, Eldritch Lightning, Mindcrack, Minor Illusion, Third Hand).
- **code_location**: `src/data/codex.generated.json` (`rites`, `whispers`) → `src/data/codex.ts` (`CURRENT_RITES`, `CURRENT_WHISPERS`) → `src/data/characterOptions.ts` (`DEEPCALLER_RITES`, `DEEPCALLER_WHISPERS`, `WHISPERS`) → `src/features/hunter/components/appsheet/AppDeepcallerReference.tsx`, `src/features/hunter/components/character-sheet/CharacterSheetUpgradeChoices.tsx`, `src/features/codex/components/CodexPage.tsx`. Generator: `scripts/generate-codex-data.mjs` line 12 `const MASTER_PATH = "resources/master.json"`.
- **verdict**: mismatch (provenance, not content)
- **rule_summary detail**: `resources/` now contains only `README.md`. `bun run codex:generate` throws immediately (missing `resources/master.json`, and the PDF filename/SHA-256 verification at lines 41–54 has no PDFs to verify). So the single largest block of Deepcaller data in the app can no longer be regenerated or corrected, even though its current contents happen to be correct.
- **proposed_change**: Repoint `scripts/generate-codex-data.mjs` at `docs/rules/*.txt` as the source of truth — parse `book-of-the-deepcaller.txt` (`## NAME` + `Level N` + `Type/Performing/Range/Duration` + body + `Using ... Higher-Level Strain.` line) and `whispers-sheet.txt` (`## NAME` + the `| Field | Value |` table + body + `**Whisper Upgrade.**`), emitting the same `rites`/`whispers` shape so `codex.ts`/`characterOptions.ts` are untouched. Keep the `Hidden Truths` section marker and the Plane Shift `sourceNote`. Keep the hidden-condition source excluded. Until the generator is repointed, `codex.generated.json` must be treated as frozen hand-maintained data, which contradicts CLAUDE.md ("Never hand-edit generated Codex data").
- **stored_data_impact**: none — rite/whisper ids are unchanged, so `preparedWhispers` string ids on `/characters/{id}` stay valid.

### Codex source PDFs (and their download links) no longer exist

- **txt_section**: n/a — the beta release replaced the PDFs with the txts
- **rule_summary**: The three player-facing PDFs the Codex offers for download were deleted with `resources/pdf/`; `docs/rules/core-rulebook.txt` (126 pages) is a new source the Codex does not know about at all.
- **code_location**: `src/data/codex.generated.json` `sources[]` — every entry has `publicPath`/`downloads[].publicPath` under `/source-library/...`; `public/source-library/` does not exist in the tree and is regenerated only by the now-broken generator.
- **verdict**: mismatch
- **proposed_change**: Either regenerate downloadable artifacts from the new sources or drop `publicPath`/`downloads` from the source records so the Codex renders text-only entries instead of dead links; add a `core-rulebook` source id when the generator is repointed. (Overlaps the Codex-focused finding set — coordinate rather than duplicate the edit.)
- **stored_data_impact**: none

### "Break the Limits of Your Mind" — the printed rule changed and the code text is now wrong

- **txt_section**: core-rulebook.txt [page 71] "Break the Limits of Your Mind" (lines 3177–3186)
- **rule_summary**: "You may expend a Strain to perform a Rite from your Book **above** your current Strain Level. If the Rite is **exactly one level higher**, immediately after it is performed you gain Madness equal to your **Max Sanity**. If it is **two or more levels higher**, you instead gain Madness equal to **twice your Max Sanity**. The Rite otherwise uses its **printed level**."
- **code_location**: `src/data/classes.ts` → `deepcaller` → `features[]`, the level 1 `Eldritch Comprehension` entry, final paragraph: "If you perform a Rite using a Strain level higher than your current Strain level, you suffer Madness equal to your maximum Sanity immediately after the Rite is performed. This is not recommended."
- **verdict**: mismatch
- **proposed_change**: Replace that final paragraph with the new two-tier wording (1 level higher = Max Sanity; 2+ levels higher = twice Max Sanity; the Rite uses its printed level). Drop the editorializing "This is not recommended." sentence, which is not in the source.
- **stored_data_impact**: none (feature text is read from the catalog, not stored on the card).

### Zealot entry rule: "only the listed Zealot features", not a feature-for-feature swap

- **txt_section**: core-rulebook.txt [page 71] "LEVEL 3: THE HUNTER ZEALOT PRESTIGE CLASS" (lines 3169–3186) and [page 75] "LEVEL 3: BURN THE BOOK" (lines 3396–3413)
- **rule_summary**: "retain the base Deepcaller elements listed under **Burn the Book** and gain **only the Zealot features explicitly listed for your level**. A level with no listed Zealot feature grants no Prestige feature." Burn the Book: "Whenever you would gain a Hunter Deepcaller **level**, you only gain the features listed under the Hunter Zealot Prestige class."
- **code_location**: `src/data/classes.ts` — `deepcaller.features` level 3 "The Hunter Zealot Prestige Class" and `subclasses[0].features` level 3 "Burn the Book". Both currently read "whenever you would gain a Hunter Deepcaller feature, you gain the **corresponding** feature from the Zealot Prestige Class."
- **verdict**: mismatch — "corresponding feature" is the old rule; the beta explicitly says empty levels grant nothing.
- **proposed_change**: Rewrite both paragraphs to the beta wording. Add the sentence "A level with no listed Zealot feature grants no Prestige feature." to the level 3 Deepcaller feature text.
- **stored_data_impact**: none

### Chosen of One Patron — "certain Rites", not "Whispers"

- **txt_section**: core-rulebook.txt [page 76] "LEVEL 3: CHOSEN OF ONE PATRON" (lines 3417–3423)
- **rule_summary**: "You no longer require a Book of the Deepcaller to preform **certain Rites**. The words you once read from the book is now carved into your mind, blood, and flesh."
- **code_location**: `src/data/classes.ts` `subclasses[0].features` level 3 "Chosen of One Patron" — currently "to perform **Whispers**. The words **of your Patron are** carved into…"
- **verdict**: mismatch
- **proposed_change**: Restore the source wording ("certain Rites"). Note this matters mechanically: Whispers already never require the Book (page 71), so the code's version makes the feature a no-op.
- **stored_data_impact**: none

### Zealot Whispers — "retain the ability to perform Whispers"

- **txt_section**: core-rulebook.txt [page 76] "LEVEL 3: ZEALOT WHISPERS" (lines 3425–3444)
- **rule_summary**: "You **retain the ability to perform Whispers**." Plus: prepared Whispers may be chosen from normal Whispers **and Level 1 Hunter Deepcaller Rites**; a Level 1 Rite so prepared becomes a Zealot Whisper (no Book, no Strain, no Madness, cannot use Higher-Level Strain, normal Rite Save DC / attack modifier); "You prepare a number of Whispers equal to the number shown for a Hunter Deepcaller of your level, **plus one additional Whisper**."
- **code_location**: `src/data/classes.ts` — text currently reads "You retain the Whispers you knew before entering this Prestige Class."
- **verdict**: mismatch (text) + missing_in_code (mechanics, see next finding)
- **proposed_change**: Change the first sentence to the source wording.
- **stored_data_impact**: none

### Zealot Whisper preparation mechanics are not implemented

- **txt_section**: core-rulebook.txt [page 76] "ZEALOT WHISPERS", "CARVED ELDRITCH STRIKE"; [page 77] "CARVED ARMOR OF THE DROWNED STAR"
- **rule_summary**: A Zealot's prepared-Whisper limit is the Deepcaller table number **+1**; the pick list also includes **Level 1 Hunter Deepcaller Rites** (Eldritch Rebuke, Eldritch Chain of Bolts, Armor of the Drowned Star, Detect Eldritch Presence, Eldritch Eye, Arms of Hastur); **Eldritch Strike** and **Armor of The Drowned Star** are always prepared and **do not count** against the limit.
- **code_location**: `src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx:185` (`whisperLimit` = table column only, subclass never consulted); `src/features/hunter/lib/characterAutomation.ts:256` (`allowed` = table column + `Listener` feat only); `src/features/hunter/components/character-sheet/CharacterSheetUpgradeChoices.tsx:41` (choice list is `DEEPCALLER_WHISPERS`, the 6 sheet Whispers, with no Level 1 Rites).
- **verdict**: missing_in_code
- **proposed_change**: In `whisperLimit`/`allowed`, add +1 when the card's subclass is `hunter-zealot`; in the `whispers` choice page, append `DEEPCALLER_RITES.filter(r => r.level === 1)` for a Zealot, labelled "Zealot Whisper"; force-include `eldritch-strike` and `armor-of-the-drowned-star` as always-prepared, excluded from the count. All fit the existing `ChoiceToggle` list and `AppDeepcallerReference` row rendering — no new screens.
- **stored_data_impact**: `preparedWhispers` on a Zealot card may now hold Rite ids (e.g. `"eldritch-rebuke"`); both consumers already look up by id across the relevant catalog, but `AppDeepcallerReference` prepared lookup (`DEEPCALLER_WHISPERS.find`) must be widened to search Rites too or those entries silently vanish. No backfill needed for existing cards.

### Absolute Union: "Mesmerized", not "Charmed"

- **txt_section**: core-rulebook.txt [page 78] "LEVEL 20: ABSOLUTE UNION" → Unshaken Vessel (line 3544–3546)
- **rule_summary**: "You cannot be **Frightened, Mesmerized, Paralyzed, or Stunned**." The beta renames the Charmed condition to **Mesmerized** throughout (see [page 21] line 932 condition entry, and lines 3778/4027).
- **code_location**: `src/data/classes.ts:353` Absolute Union — "Frightened, **Charmed**, Paralyzed, or Stunned". (Same rename also outstanding at `classes.ts:427` Mindless Blood Frenzy and `classes.ts:499` Counter — other agents' sections, flagged for coordination.)
- **verdict**: mismatch
- **proposed_change**: Replace `Charmed` with `Mesmerized` in the Absolute Union text.
- **stored_data_impact**: If any HunterCard stores an applied-condition name string `"Charmed"`, remap to `"Mesmerized"` — belongs with the conditions-catalog finding, not this one.

### Deepcaller starting equipment is missing the Cowl

- **txt_section**: core-rulebook.txt [page 69] Core Hunter Deepcaller Traits → Starting Equipment (lines 3082–3087)
- **rule_summary**: "Sickle, Dagger, Bloodvial (1), Toolbelt, Book of the Deepcaller and Deepcallers Robe, **Cowl**"
- **code_location**: `src/data/classes.ts:286` `startingEquipment: ["Sickle", "Dagger", "1 Blood vial", "Tool Belt", "Book of the Deepcaller", "Deepcallers Robe"]`
- **verdict**: missing_in_code
- **proposed_change**: Append `"Cowl"`. Verify the item resolves in `src/lib/startingEquipment.ts` / `src/data/items.ts`; if absent, add it there as the armour/clothing companion to the Deepcallers Robe.
- **stored_data_impact**: none for saved cards (starting equipment is applied at creation); existing Deepcallers simply won't have it.

### Feature-name spellings drift from the printed table

- **txt_section**: core-rulebook.txt [page 70] Hunter Deepcaller Features table (lines 3122–3145), [page 71] "LEVEL 2: VAILED TRUTH", [page 72] "LEVEL 10: FRAGMENTS OF A ELDRITCH MIND"
- **rule_summary**: The beta prints **"Vailed Truth"** (both table and heading) and **"Fragments of a Eldritch Mind"**.
- **code_location**: `src/data/classes.ts` progression rows level 2/10 and `features[]` — code uses the corrected spellings "Veiled Truth" and "Fragments of an Eldritch Mind".
- **verdict**: mismatch (cosmetic; the code silently corrects the source)
- **proposed_change**: Low priority — either adopt the printed spellings verbatim for source-fidelity, or leave as-is deliberately. Flagging so the choice is explicit; note the app already mirrors the source's other artifacts (level 6 `"Opened Mind Combatant,"` keeps the stray trailing comma).
- **stored_data_impact**: If level-up choices are keyed by feature name anywhere in `state.levelChoices`, renaming would orphan keys — verify before changing. Recommend **no change**.

### Confirmed matches (non-obvious, leave untouched)

- **txt_section**: core-rulebook.txt [page 70] features table + [page 74] "SAVING THROWS"/"RITE ATTACKS"; [page 70] "Rite Performing Ability"
- **rule_summary**: Every row of the 20-level table (Proficiency Bonus, Prepared Whispers 2/2/2/3/3/3/3/3/3/4…, Strains 2/2/2/3/3/3/3/3/3/3/3/4/4/4/4/4/5/5/5/5, Strain Level 1/1/2/2/3/3/4/4/5/5…5) matches `classes.ts` `progression` row for row. Intelligence is the Rite Performing ability; Rite Attack Modifier = Rite Performing ability modifier + Proficiency Bonus.
- **code_location**: `src/data/classes.ts:292-313`; `src/features/hunter/lib/characterAutomation.ts:167-172` (strainMax/strainLevel from the table), `:252-255` (`riteAbility` = Intelligence, `riteAttack` = prof + INT mod); `src/features/hunter/components/appsheet/AppDeepcallerReference.tsx:64` gates the Rite list on `rite.level <= currentStrainLevel`, which is exactly the [page 70] "Book of the Deepcaller" rule.
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Confirmed matches — Rite/Whisper damage scaling helpers

- **txt_section**: book-of-the-deepcaller.txt (Higher-Level Strain lines); whispers-sheet.txt (Whisper Upgrade lines)
- **rule_summary**: Eldritch Rebuke 2d10 +1d10/level above 1; Chain of Bolts 2d12 initial (+1d12/level above 1) + 1d12 ongoing; Armor of the Drowned Star 5 THP/5 Cold, +5 each per level above 1; Mindgrab 3d8 +1d8/level above 2; Eldritch Cacophony 8d6 +2d6/level above 5; Arms of Hastur 2d6 +1d6/level above 1; Grasp of Yog-Sothoth 2d6 +1d6/level above 2. Whispers: Eldritch Blast 1/2/3/4 beams of 1d10 at levels 1/5/11/17; Eldritch Lightning and Mindcrack 1d6→4d6 at 5/11/17; Eldritch Strike weapon + 0/1d6/2d6/3d6 at 5/11/17.
- **code_location**: `src/data/characterOptions.ts` `riteDamageAtStrain` (lines 116–128) and `whisperDamageAtLevel` (lines 106–111)
- **verdict**: match — every formula reproduces the printed progression exactly at all strain levels 1–5 / character levels 1–20.
- **proposed_change**: none
- **stored_data_impact**: none

### Forbidden Revelation option filter matches the beta text

- **txt_section**: core-rulebook.txt [pages 72–73] "LEVEL 11: FORBIDDEN REVELATION"
- **rule_summary**: L11 → one Level 6 Rite; L13 → Level 7; L15 → Level 8; L17 → Level 9. "You can also use a Forbidden Revelation for a 1-5 Level Rite that has the option to use Higher Level Strains. That Rite then becomes the level of which Forbidden Revelation you choose." Each performed once without Strain, refreshed on a Long Rest; all Revelations may be swapped for a Rite of the same level on a Long Rest.
- **code_location**: `src/data/characterOptions.ts` `forbiddenRevelationLevel` / `forbiddenRevelationOptions` (lines 92–103) — filters to `rite.level === level || (rite.level <= 5 && rite.upgrade non-empty)`; `AppDeepcallerReference.tsx:65-70,81-83` renders the chosen Revelations at their elevated level via `effectiveRiteLevel`.
- **verdict**: match — the `upgrade` non-empty test correctly selects exactly the six Level 1–5 Rites that print a Higher-Level Strain option (Eldritch Rebuke, Chain of Bolts, Armor of the Drowned Star, Mindgrab, Eldritch Cacophony, Arms of Hastur, Grasp of Yog-Sothoth).
- **proposed_change**: none
- **stored_data_impact**: none — but note this correctness depends entirely on `upgrade` staying populated when the generator is repointed at the txts.

### No removal candidates in the Rite/Whisper catalog

- **txt_section**: book-of-the-deepcaller.txt + whispers-sheet.txt, full files
- **rule_summary**: The beta documents contain 21 Rites and 6 Whispers.
- **code_location**: `src/data/codex.generated.json` `rites` (21) / `whispers` (6)
- **verdict**: match
- **proposed_change**: none — there is **no** rite or whisper in the app that the new sources have dropped, and none in the new sources the app is missing. Ids, levels, types, ranges, durations and bodies all correspond. (Confirmed by normalized full-text containment check of every generated body paragraph against the two txts; only Unicode ellipsis/em-dash differences appeared.)
- **stored_data_impact**: none — no `preparedWhispers` value can be orphaned by the source refresh.
