# A03 — Conditions, Sanity/Insanity, Insane Quirk Table

Assigned range: `docs/rules/core-rulebook.txt` lines 900–1185 (pages 21–26),
cross-checked against page 42 (lines 1929–1939, 1979–1984) and page 26
(Madness/Transformation) where those pages define the same values.

---

### The condition catalog is 6 names; the new rulebook defines 25

- **txt_section**: core-rulebook.txt [page 21–23] "Conditions: IMPAIRMENTS" / "HAZARDS & AFFLICTIONS" / "BATTLEFIELD STATES" / "Conditions: Special"
- **rule_summary**: The beta rulebook defines three condition tables plus a Special subcategory, with these exact names:
  - **Impairments**: Blinded, Deafened, Mesmerized, Frightened, Incapacitated, Paralyzed, Restrained, Stunned, Unconscious
  - **Hazards & Afflictions**: Dying, Exhaustion, Poisoned, Sleepless, Suffocating, Underwater
  - **Battlefield States**: Blood-Tensed, Demoralized, Flanked, Grappled, High Ground, Invisible, Prone, Aiming Prone, Surrounded, Taunted
  - **Special**: Lost Condition (hidden), Second Threshold (hidden), Insane
  Framing rules (lines 903–920): conditions do not stack with themselves (Exhaustion excepted); repeated instances track durations separately; nested conditions apply both rows.
- **code_location**: `src/data/conditions.ts` (`CONDITIONS`, built from `CURRENT_CONDITIONS`) → `src/data/codex.ts:74` → `src/data/codex.generated.json` key `conditionsNamedByCurrentSources`, currently exactly `["Blinded","Frightened","Incapacitated","Insane","Invisible","Restrained"]`. Consumed by the battle tracker at `src/features/game/components/BattleCombatantRow.tsx:2,37` and `src/features/play/store/combatStore.ts:394` (`toggleCondition`).
- **verdict**: missing_in_code
- **proposed_change**: Regenerate `conditionsNamedByCurrentSources` from the new sources so the battle-tracker picker offers all 22 player-visible condition names (all of the three tables plus `Insane`). Do **not** add `Lost` or `Second Threshold` — they are declared hidden and their trigger/effects live only on the GM-only Hidden Condition Sheet (lines 1072–1078). Update the hard-coded expectation in `scripts/codex-data-test.ts:50-51`. No UI restructuring needed — `BattleCombatantRow` already renders an arbitrary-length list.
- **stored_data_impact**: None for `/characters/{id}`. Stored combatant docs (`/games/{id}/participants`, `combatant.conditions[]`, `conditionSince`) keep working: ids are slugs and `CONDITION_NAME` falls back to raw ids for unknown entries. Widening the list only adds selectable ids.

### Exhaustion is a stacking level, but the tracker models conditions as a boolean set

- **txt_section**: core-rulebook.txt [page 21] "Exhaustion"; framing at lines 907–918
- **rule_summary**: "Each time you gain Exhaustion, its level increases by 1. Subtract twice your level from every D20 Test and reduce every Speed by 5 feet per level. You die at level 6. A Long Rest removes 1 level; the condition ends at level 0." Exhaustion is explicitly the sole exception to the no-stacking rule.
- **code_location**: `src/types.ts:261-265` (`conditions: string[]`, `conditionSince?: Record<string, number>`); `src/features/play/store/combatStore.ts:391-404` `toggleCondition` — pure on/off, no magnitude.
- **verdict**: missing_in_code
- **proposed_change**: Minimal, fitting the existing shape: add an optional `conditionLevel?: Record<string, number>` to the combatant type and let the existing condition chip in `BattleCombatantRow` show/step a level for `exhaustion` only. Alternatively (smaller still) expose Exhaustion as six ids `exhaustion-1..6`. Either way, no new panel or layout.
- **stored_data_impact**: New optional field on combatant docs only; absent = level 1 when the condition is present. No `/characters/{id}` change.

### "Current Sanity" is tracked and edited, but the rules say not to track it

- **txt_section**: core-rulebook.txt [page 42] lines 1929–1939: "Max Sanity and Madness. Your class entry gives your base Max Sanity; add your Wisdom modifier to determine your final Max Sanity. **Start with 0 Madness and do not track Current Sanity.** Madness functions like damage against Max Sanity: when Madness equals or exceeds Max Sanity, you become Insane and gain the Insane Condition. Reducing Madness below Max Sanity ends Insane."
- **code_location**:
  - `src/types.ts:536-537` — `sanity?: number` ("Current Sanity during play")
  - `src/features/hunter/components/character-sheet/CharacterSheetSanity.tsx:12,15,17` — headline reads `{sanity} / {sanityMax} Sanity` and offers a "Sanity" stepper via `stage.stageSanity`
  - `src/features/hunter/components/appsheet/AppEditStage.tsx:60-80,124,149` — `stageSanity`, level-up pool rescaling of `sanity`, and a "Current sanity" review row
  - `src/features/hunter/lib/characterAutomation.ts:162` and `src/features/hunter/lib/deriveSheetFromCard.ts:66` — both write `sanityCur`
  - `src/features/hunter/lib/papersheet.ts:40,51` — `sanityCur` on the printed sheet
  - `src/features/hunter/components/character-sheet/CharacterSheetHome.tsx:72-73` — `sanity` summary
- **verdict**: mismatch (partial — see the character-sheet.txt conflict below)
- **proposed_change**: Make Madness the only tracked pool on the existing Sanity panel: drop the "Sanity" stepper and `stageSanity`, and change the summary line to lead with Madness against Max Sanity (e.g. `Madness {madness} / {sanityMax} Max Sanity`). Keep the panel, its icon, route and styling untouched. Remove the "Current sanity" row from the `AppEditStage` review list and the `sanity` rescaling branch at `AppEditStage.tsx:60-68`; keep `sanityMax`.
- **stored_data_impact**: `/characters/{id}.sanity` becomes vestigial. Migration: for any card where `madness` is absent/0 and `sanity` is present and below the computed Max Sanity, backfill `madness = maxSanity − sanity` (this is exactly the legacy conversion already implemented at `src/lib/character.ts:139-150`), then strip `sanity`. Also strip the derived `sheet.sanityCur` field.

### Conflict: the printable Character Sheet still has CURRENT / MAX sanity boxes

- **txt_section**: character-sheet.txt lines 32–34: `SANITY (3)   [ ] INSANE` / `[____] [____] [____]` / `CURRENT  MAX  SANITY DICE (3)` — versus core-rulebook.txt [page 42] "do not track Current Sanity".
- **rule_summary**: The two beta sources disagree. The rulebook's page-42 instruction is prose written for this beta; the sheet layout retains a CURRENT box (and no Madness box at all, despite Madness being the tracked value).
- **code_location**: `src/features/hunter/lib/papersheet.ts:40,51` (`sanityCur`), `src/features/hunter/lib/deriveSheetFromCard.ts:66`.
- **verdict**: mismatch (source-internal conflict — needs a game-maker decision)
- **proposed_change**: Ask Christoffer which he wants before removing the printed CURRENT box. The app-side change above (rulebook-accurate: track Madness, not Current Sanity) is safe either way; if the printed sheet must keep matching the PDF, keep emitting `sanityCur` for the paper layout only and stop offering it as an editable value.
- **stored_data_impact**: none beyond the previous finding.

### The Insane condition is a manual checkbox, not derived from Madness ≥ Max Sanity

- **txt_section**: core-rulebook.txt [page 23] lines 1080–1086: "When your Madness equals or exceeds your Max Sanity, you gain the Insane condition. The Insane condition ends immediately when your current Madness is reduced below your Max Sanity." Restated at [page 42] lines 1935–1939.
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetSanity.tsx:19` — a free checkbox writing sheet field `insane`; label "Mark when your hunter is in an Insane state." Field label at `src/features/hunter/components/appsheet/AppEditStage.tsx:177`.
- **verdict**: mismatch
- **proposed_change**: Compute it: `insane = madness >= sanityMax`. Keep the existing toggle row in place visually but render it as a derived read-only state (same `character-sheet-status-toggle` markup, `disabled`, `checked={madness >= sanityMax}`), with the note changed to "Automatic when Madness reaches your Max Sanity." Set the `insane` sheet field from automation (`characterAutomation.ts`, alongside `sanityMax` at line 161) rather than from user input.
- **stored_data_impact**: `sheet.insane` becomes derived. Migration should recompute it from `madness` vs. computed Max Sanity rather than trusting the stored checkbox; stale `true` values on characters with `madness < maxSanity` must be cleared.

### Max Sanity formula and the Deepcaller cap — confirmed match

- **txt_section**: core-rulebook.txt [page 42] line 1929–1932 (base + Wisdom modifier); Deepcaller "LEVEL 1: FRACTURING MIND" (line ~3189): "Every time you level up suffer 2 Madness. When you level up permanently gain 1 Max Sanity to a maximum of 26 Max Sanity."
- **code_location**: `src/lib/character.ts:45-51` `maxSanity()`
- **verdict**: match
- **proposed_change**: none. (Note the *other* half of Fracturing Mind — "suffer 2 Madness" on every level-up — is not applied anywhere; see below.)
- **stored_data_impact**: none

### Sanity Die exists as a printed value but is never applied on a Long Rest

- **txt_section**: core-rulebook.txt [page 42] lines 1979–1984: "You always have one Sanity Die and roll it once when you finish a Long Rest. Add your Wisdom modifier and reduce your Madness by the total, to a minimum of 0." Repeated at [page 25] lines 1198–1199. Class dice: 2d6 (Brute, Scout), 1d12 (Rogue-type at line 2807), 1d20 (line 3068, 3569), 4d4 (line 3872).
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:154` and `deriveSheetFromCard.ts:67` write `sanityDice`; displayed at `CharacterSheetResources.tsx:22`. `src/features/play/lib/phase.ts:7` defines a `long_rest` phase whose hint mentions only "restore HP and reset resources". No code reduces `madness`.
- **verdict**: missing_in_code
- **proposed_change**: The Long Rest phase already exists in Play; have it reduce `madness` by (Sanity Die roll + Wis modifier), floored at 0, and reset any Sleepless counter. Keep it as an action on the existing rest control — no new screen. Note `src/data/armor.ts:242` already references "+2 to your Sanity Die roll when rolling it during a Long Rest", so the roll needs a real implementation for that armor text to mean anything.
- **stored_data_impact**: none (writes existing `madness`).

### Sleepless Counters have no representation anywhere

- **txt_section**: core-rulebook.txt [page 21] lines 977–983 "Sleepless": 1 counter per hour outside a rest; a Short Rest pauses accumulation for its first hour but removes none; a Long Rest resets counters to 0; **at 24 counters** you gain the Sleepless condition and suffer 1d4 Madness, and again at 30, 36, 42 and every further multiple of 6; Sleepless ends when the counter falls below 24. Long Rest benefits at [page 25] line ~1197 also say "reset your Sleepless Counters to 0".
- **code_location**: ABSENT. Nothing in `src/types.ts`, the character sheet, or `src/features/play/**` mentions Sleepless.
- **verdict**: missing_in_code
- **proposed_change**: Add `sleeplessCounter?: number` to `HunterCard` and a counter control on the existing Sanity panel (`CharacterSheetSanity.tsx`) using the already-present `CharacterSheetResourceControl` — same component, same grid, no new layout. Reset it to 0 in the Long Rest action.
- **stored_data_impact**: New optional field; backfill absent = 0. No strip/remap.

### The Madness Die and its Star/Blank/Eye faces are undefined in code

- **txt_section**: core-rulebook.txt [page 23] lines 1093–1110 and [page 3] lines 113–117: an 8-sided die with **three Blank faces, three Star faces, two Eye faces**, rolled once per turn while Insane before the Attack action or a harmful Rite. Star = resolve normally. Blank = the attack/Rite redirects to your nearest ally (moving to reach one if needed; if none can be targeted it turns inward on you). Eye = either end your turn with no effect, or reroll; a second Eye means you roll your Sanity Die, suffer that much **Mind damage**, and gain 1 Madness. Line 113–117 also notes: if a Madness Die is unavailable, use a normal die (mapping given there).
- **code_location**: ABSENT from app logic. `src/data/codex.generated.json` contains a stale Source Notes entry titled "Madness die system" but nothing implements it; there is no `mind damage` concept in `src/types.ts`.
- **verdict**: missing_in_code
- **proposed_change**: Lowest-cost correct option: surface the Madness Die as Codex rules text (see the Codex finding below) rather than building a roller. If a roller is wanted, it belongs on the existing Play/battle controls, not the character sheet.
- **stored_data_impact**: none

### Cracked Perception (the Insane upside) is not represented

- **txt_section**: core-rulebook.txt [page 23] lines 1079–1086: "While Insane, you have Advantage on Wisdom (Perception) checks and Intelligence (Eldritch Knowledge) checks made to notice unnatural things, hidden entities, dream-architecture, impossible movement, or occult distortions."
- **code_location**: ABSENT (nothing near `CharacterSheetSanity.tsx` or `src/data/skills.ts` mentions it).
- **verdict**: missing_in_code
- **proposed_change**: Add one line of note text under the derived Insane state in `CharacterSheetSanity.tsx` (the panel already uses `<small>` notes), so a player who is Insane sees both the die and the Advantage. No new component.
- **stored_data_impact**: none

### The Insane Quirk table (d100, 11 entries) does not exist in the app

- **txt_section**: core-rulebook.txt [page 24] lines 1114–1166 "Insane Quirk Table" — rolled on a d100 when you gain Insane, retained until Insane ends:
  01–10 Bound Shadow · 11–18 Burden Hunger · 19–28 Compulsive Falsehood · 29–36 Paranoid Contrarian · 37–48 Gallows Mirth · 49–54 Voiceless · 55–64 One-Word Mind · 65–69 Compulsive Obedience · 70–81 Predatory Urge · 82–91 Sir Deadly Blade of the Night · 92–95 Ruined Presence · 96–100 Blood Revulsion.
  (Note 92–95 Ruined Presence: "−5 penalty to Charisma checks and Charisma saving throws. This penalty does **not** change your Charisma modifier for class features, Rite statistics, resource maximums, or other derived values" — i.e. explicitly non-derived, so it must not feed the ability-modifier calculations in `src/lib/character.ts`.)
- **code_location**: ABSENT. `grep -i quirk` across `src/` and `scripts/` returns nothing.
- **verdict**: missing_in_code
- **proposed_change**: Add the table as a data catalog (`src/data/` — ideally generated alongside the other current-source data rather than hand-maintained, per CLAUDE.md "Updating game content") and surface it in two places that already exist: as a Codex topic, and as an optional `insaneQuirkId?: string` shown as a note row on the existing Sanity panel when the derived Insane state is on. Do not auto-apply Ruined Presence's −5 to any derived value.
- **stored_data_impact**: New optional `insaneQuirkId?: string` on `HunterCard`; nothing to backfill (absent = no quirk rolled). Should be cleared whenever Madness drops below Max Sanity, since the quirk is retained only while Insane.

### Codex has no Conditions content at all

- **txt_section**: core-rulebook.txt [pages 20–24], the whole Conditions chapter including the three tables, the Special subcategory and the Quirk table.
- **code_location**: `src/data/codex.generated.json` — the `entries` array has groups `Rites`, `Whispers`, `Character Sheet`, `Source Notes` only; no `Conditions` group. `src/data/codex.ts:74` exposes only the six condition *names*, with no rules text. `scripts/generate-codex-data.mjs:202` still reads these from `master`, whose source file (`resources/master.json`) has been deleted — `resources/` now contains only `README.md`, so the generator cannot currently be re-run.
- **verdict**: missing_in_code
- **proposed_change**: Point the generator at `docs/rules/*.txt` and emit a `Conditions` group covering the three tables plus the Insane/Quirk material. **Hard constraint**: the Lost Condition and Second Threshold rows (lines 1072–1078) must be emitted as name-only stubs at most — their triggers and effects live on the GM-only Hidden Condition Sheet and must never reach Codex, public API, or build output.
- **stored_data_impact**: none

### Death Saves / Dying: rules text and sheet fields agree, but the 1d20 threshold is nowhere in logic

- **txt_section**: core-rulebook.txt [page 21] "Dying" lines 958–970: at 0 HP without instant death you gain Dying **and** Unconscious; at the start of each turn roll 1d20, **10 or higher is a success**, lower is a failure; three successes = Stable, three failures = death; natural 1 = two failures, natural 20 = restore 1 HP and end Dying and Unconscious; damage at 0 HP = one failure (two on a Critical Hit); death if the damage equals or exceeds your HP maximum; stabilize with an action and a **DC 10 Wisdom (Medicine)** check; a Stable creature regains 1 HP after **1d4 hours** if not healed. Instant Death when the excess damage from reaching 0 HP equals or exceeds your HP maximum.
- **code_location**: Sheet fields `dsS1..dsS3`, `dsF1..dsF3` exist (`src/features/hunter/components/appsheet/AppEditStage.tsx:181-186`) as manual checkboxes; matches character-sheet.txt lines 44–46. No `Dying` or `Unconscious` condition id is offered (see the catalog finding) and nothing implements the DC 10 / 10-or-higher numbers.
- **verdict**: match (sheet fields) / missing_in_code (rules text + conditions)
- **proposed_change**: Leave the death-save checkboxes exactly as they are. Cover the rules via the Conditions Codex entry and by adding `Dying`, `Unconscious` and `Stable`-adjacent names to the tracker catalog.
- **stored_data_impact**: none

### Fracturing Mind's "suffer 2 Madness per level-up" is never applied

- **txt_section**: core-rulebook.txt Deepcaller "LEVEL 1: FRACTURING MIND" (line ~3189): "Every time you level up suffer 2 Madness."
- **code_location**: `src/lib/character.ts:45-51` applies only the +1 Max Sanity half. The level-up path (`src/features/hunter/components/appsheet/AppEditStage.tsx:55-70`, `src/features/hunter/lib/levelUpVitals.ts`) does not touch `madness`.
- **verdict**: missing_in_code
- **proposed_change**: In the level-up staging that already rescales HP/Sanity pools, add `madness += 2` for `classId === "deepcaller"`. It will show up automatically in the existing "Madness" review row (`AppEditStage.tsx:151`). Strictly outside my assigned range's ownership — flagging for whoever owns the Deepcaller class section.
- **stored_data_impact**: Do **not** retroactively backfill Madness for existing Deepcallers; that would penalise past play. Apply forward only.
