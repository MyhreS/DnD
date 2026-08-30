# A04 — Resting, Safe Zones, Transformation (core-rulebook.txt lines 1180–1440, pages 25–30)

Scope: Safe Zone status, Short/Long Rest, Unsafe Rest Checks, Transformation
(gain/reduce/table/effects), Bloodied, Creature Types, and the opening of
Chapter 2. Analysis only — no source edits made.

---

### Safe Zone is binary; the app's three-tier location model contradicts it

- **txt_section**: core-rulebook.txt [page 25] "Safe Zones" / "Short Rest" / "Long Rest" (lines 1195–1218)
- **rule_summary**: There are exactly two rest contexts: **in a Safe Zone** and
  **outside a Safe Zone**. "A Safe Zone is a protected location designated by
  the GM. The Hunter's Lodge is always a Safe Zone." The Lodge is an *example*
  of a Safe Zone, not a superior third tier. In **any** Safe Zone a Short Rest
  lets you spend Hit Point Dice, and a Long Rest regains **all** lost Hit Points
  **and all expended Hit Point Dice**. Outside a Safe Zone: Long Rest regains HP
  equal to **half your Hit Point maximum** (up to max) and **no** Hit Point Dice;
  "Hit Point Dice cannot be spent outside a Safe Zone."
- **code_location**: `src/types.ts:200-203` (`GameLocation = "lodge" | "safe" | "wild"`
  and its doc comment), `src/features/play/lib/phase.ts:16-25` (`LOCATIONS`),
  `src/api/games.ts:112,225,291,320-321` (`location` default `"wild"`, `setGameLocation`)
- **verdict**: mismatch
- **proposed_change**: Keep the existing three-option control and visual language
  but correct the semantics of the hints so they no longer promise different
  benefits for `lodge` vs `safe`. Minimal edit: change the `safe` hint to
  "Safe Zone — spend Hit Point Dice on a Short Rest; a Long Rest restores all HP
  and all Hit Point Dice."; change `lodge` to "Hunters Lodge — always a Safe
  Zone."; change `wild` to "Outside a Safe Zone — no Hit Point Dice, and a Long
  Rest restores only half your HP maximum." Update the `GameLocation` comment in
  `src/types.ts:200-202`, which currently states the mechanically wrong tiering
  ("Hunters Lodge = full Long Rest (HP + Hit Dice); a Safe Zone = spend Hit Dice
  on a Short Rest (and a half Long Rest)").
- **stored_data_impact**: none — `location` values stay valid; only labels/hints
  and derived rest guidance change. Existing `/games/{id}.location` documents
  are unaffected.

### Short Rest hint omits the Safe-Zone gate and the Proficiency-Bonus cap

- **txt_section**: core-rulebook.txt [page 25] "Short Rest" (lines 1202–1218)
- **rule_summary**: A Short Rest lasts **1 hour**. Benefits anywhere: regain
  Short-Rest features, **remove 1 Transformation Level**, **reduce Sleepless
  Counters by 6**. Only *in a Safe Zone* may you "spend a number of Hit Point
  Dice up to your **Proficiency Bonus**. For each die, regain Hit Points equal to
  the roll plus your **Constitution modifier**, to a minimum of 1 Hit Point."
- **code_location**: `src/features/play/lib/phase.ts:6` (`short_rest` hint: "A
  breather: spend Hit Dice, regain some uses.")
- **verdict**: mismatch
- **proposed_change**: Reword the `short_rest` hint to "1 hour. Remove 1
  Transformation Level; in a Safe Zone spend up to your Proficiency Bonus in Hit
  Point Dice (roll + CON, min 1)." No layout change.
- **stored_data_impact**: none.

### Long Rest benefits list is entirely unrepresented

- **txt_section**: core-rulebook.txt [page 25] "Long Rest" (lines 1182–1223)
- **rule_summary**: 8 hours, at least 6 asleep, no more than 2 hours light
  activity; **you have the Unconscious condition while asleep**; you must wait
  **16 hours** before another. Benefits: Exhaustion −1; restore reduced ability
  scores; restore reduced Hit Point maximums; regain Long-Rest features; **remove
  all Transformation Levels and reset Sleepless Counters to 0**; **roll your
  Sanity Die + Wisdom modifier and reduce Madness by that amount (min 0)**; **lose
  any unspent Blood Tinge**; **regain Not Tonight! if you do not already have it**.
- **code_location**: `src/features/play/lib/phase.ts:7` (`long_rest` hint: "Full
  rest: restore HP and reset resources."); no rest-application logic exists
  anywhere — grep for `applyRest`/`shortRest`/`longRest` across `src/` finds only
  the phase labels and class-feature prose in `src/data/classes.ts`.
- **verdict**: mismatch (hint) + missing_in_code (the mechanics)
- **proposed_change**: Two minimal steps. (1) Correct the hint to name the real
  outcomes: "8 hours. Transformation to 0, Sleepless to 0, Exhaustion −1, reduce
  Madness by Sanity Die + WIS; unspent Blood Tinge is lost." (2) Because the
  character sheet already stages `madness`, `transformationLevel`,
  `activeTransformations` and `bloodTinge`, add a single "Finish a Long Rest"
  action into the existing `CharacterSheetResources` Recovery section that stages
  `transformationLevel: 0`, `activeTransformations: []`, `bloodTinge: false`, and
  prompts for the Sanity-Die roll to subtract from `madness`. Do not add a new
  screen.
- **stored_data_impact**: none structurally. If the Long-Rest action is added it
  writes existing fields only (`transformationLevel`, `activeTransformations`,
  `madness`, `bloodTinge`, `currentHp`, sheet `hdCur`/`hdSpent`).

### Sleepless Counters are absent from the entire app

- **txt_section**: core-rulebook.txt [page 25] "Short Rest" (line 1210), "Long
  Rest" (line 1197), "Guarding an Unsafe Rest" (lines 1231–1232)
- **rule_summary**: Every Hunter has **Sleepless Counters**. A Short Rest reduces
  them by **6**; a Long Rest resets them to **0**; a Guard's counters "continue
  to increase normally" while guarding. The counter is a first-class tracked
  per-character resource.
- **code_location**: ABSENT — no `sleepless` token exists in `src/` (checked
  `src/types.ts`, `src/features/hunter/**`, `src/features/play/**`, `src/data/**`).
- **verdict**: missing_in_code
- **proposed_change**: Add `sleeplessCounters?: number` to `HunterCard` in
  `src/types.ts` (alongside `madness`/`transformationLevel`, ~line 540), default
  `0` in `src/lib/character.ts:313-317` (`blankCard`), surface it as one more
  `CharacterSheetResourceControl` in the existing Recovery group of
  `src/features/hunter/components/character-sheet/CharacterSheetResources.tsx`.
  No new component or page.
- **stored_data_impact**: new optional field on `/characters/{id}`. Existing
  records need no migration — treat missing as `0`. Backfill is unnecessary.

### Exhaustion is referenced by class features but has no tracker

- **txt_section**: core-rulebook.txt [page 25] "Long Rest" Benefits (line 1191)
  "Reduce Exhaustion by 1."
- **rule_summary**: Exhaustion is a tracked, numeric per-character level reduced
  by 1 on each Long Rest.
- **code_location**: ABSENT as a tracked value. Only referenced in prose:
  `src/data/classes.ts:147` (Scout "Tireless — Decrease Exhaustion. Whenever you
  finish a Short Rest, your Exhaustion level, if any, decreases by 1.") and
  `src/data/skills.ts:8`. The condition list is generated
  (`src/data/codex.ts:74` → `conditionsNamedByCurrentSources`), so Exhaustion is
  at best a name, not a level.
- **verdict**: missing_in_code
- **proposed_change**: Add `exhaustion?: number` to `HunterCard` and one
  `CharacterSheetResourceControl` in the existing Recovery group. Minimal;
  the Scout's level-10 feature is currently untrackable in the app.
- **stored_data_impact**: new optional field on `/characters/{id}`; missing = 0,
  no migration.

### Unsafe Rest Checks / Guards table has no DM-facing implementation

- **txt_section**: core-rulebook.txt [page 26] "Guarding an Unsafe Rest" +
  "Unsafe Rest Checks" table (lines 1227–1255)
- **rule_summary**: Before resting outside a Safe Zone, choose any number of
  **Guards**; a Guard stays awake and gains **none** of the rest's benefits, and
  their Sleepless Counters keep increasing. The GM rolls **once** on the table:
  0 Guards → interrupted on **1–10**; 1 Guard → **1–6**; 2 Guards → **1–3**;
  3 or more → **1**. The GM decides before the rest what the interruption is.
  Guards make any detection checks; characters surprised by an interruption
  **roll Initiative with Disadvantage**.
- **code_location**: ABSENT — no guard/unsafe-rest logic in `src/features/play/**`
  or `src/features/game/**`.
- **verdict**: missing_in_code
- **proposed_change**: Optional and DM-only. If added, it belongs as a small
  panel in the existing DM controls that already own phase/location
  (`gameStore.setPhase`/`setLocation`), showing the four-row threshold table for
  the chosen Guard count. Do not build a dice roller or a new route. Lowest-risk
  alternative: leave the table to the Codex and add nothing.
- **stored_data_impact**: none if implemented as a read-only reference.

### The Transformation Table now EXISTS in the source — the code comment saying it doesn't is stale

- **txt_section**: core-rulebook.txt [page 27] "Transformation Table" (lines 1275–1338)
- **rule_summary**: A full 20×10 table: `d20` roll (1–20) crossed with
  Transformation Level 1–10, yielding one of: *Nothing Happens*, *Dreadblood ears*,
  *Dreadblood eyes*, *Dreadblood speed*, *Blood fangs*, *Mutated arm*, *Blood lust*,
  *Dreadlord connection*, *Lost*. E.g. Level 1 / d20 1 = "Blood lust."; Level 1 /
  d20 6–20 = "Nothing Happens"; Level 10 / d20 1–9 = "Lost."
- **code_location**: `src/types.ts:541-547` — the comment reads "The supplied
  documents reference but do not include the Transformation Table, so the app
  records this value without rolling or inferring a result." That premise is now
  false. No table data exists in `src/data/**`.
- **verdict**: mismatch (stale comment) + missing_in_code (the table)
- **proposed_change**: (1) Correct the `src/types.ts` comment. (2) Add the table
  as data — a `TRANSFORMATION_TABLE: string[][]` (20 rows × 10 level columns of
  transformation ids) in a new `src/data/transformations.ts`, following the
  existing catalog pattern of `src/data/conditions.ts`. Feed it into the existing
  "Transformations" section of `CharacterSheetResources.tsx` so the DM can pick a
  rolled result from the correct column rather than typing a raw key.
- **stored_data_impact**: none to schema. `activeTransformations` stays
  `string[]`; new entries would use stable ids matching the catalog (the preview
  fixture at `src/dev/preview.ts:284` already uses `"dreadbloodEars"`, so that
  camelCase id convention should be the canonical key set).

### Active transformations render as raw keys, with no effects catalog

- **txt_section**: core-rulebook.txt [page 28] "TRANSFORMATION EFFECTS" (lines 1342–1388)
- **rule_summary**: Seven defined results with concrete mechanics, each with a
  "When Gained" Madness cost: **Nothing Happens** (no active Transformation);
  **Dreadblood ears** (2 Madness; +2 to WIS (Perception) and Passive Perception;
  suffer 1 Madness for Advantage); **Dreadblood eyes** (2 Madness; action + 1
  Madness → Blindsight 30 ft for 10 rounds); **Dreadblood speed** (1 Madness;
  once per turn, 1 Madness → Dash as a Bonus Action and/or no Opportunity
  Attacks); **Blood fangs** (3 Madness; replace one attack with a bite within
  5 ft using STR + PB, 4d3 Piercing, heal HP equal to Piercing damage if the
  target has blood, then suffer 1 Madness); **Mutated arm** (4 Madness;
  Distorted Strike — 1 Madness for +5 ft reach, +1d12 weapon damage or +3d12
  Slashing on an Unarmed Strike); **Blood lust** (not an active Transformation —
  a compulsion: drink a Bloodvial free of an action, or suffer 5 Madness);
  **Dreadlord connection** (6 Madness; Dreadful Scream — action + 3 Madness,
  DC 15 WIS save within 30 ft, on a fail 4 Madness and 1d10 + STR Mind damage
  and no action next turn; affects allies too). **LOST** is explicitly GM-only:
  "This hidden effect can only be found in the Hidden Condition Sheet."
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetResources.tsx:35-41`
  — renders `activeTransformations` entries verbatim as `<b>{entry}</b>`; with
  the preview fixture that prints the literal string `dreadbloodEars`.
- **verdict**: missing_in_code
- **proposed_change**: Add the seven effects to the same new
  `src/data/transformations.ts` (`{ id, name, madnessOnGain, text }`), then in
  `CharacterSheetResources.tsx` look the id up for the display name and body,
  falling back to the raw string for unknown legacy values. This fits the
  existing section — no layout change. **`LOST` must not be given effect text
  in `src/data/**`** (it is Hidden-Condition-Sheet content and must never reach
  public build output); at most show the name with "Ask your GM."
- **stored_data_impact**: none. Unknown/legacy `activeTransformations` strings
  keep rendering via the fallback, so no remapping of `/characters/{id}` is
  required.

### Transformation Level cap of 10 — confirmed match

- **txt_section**: core-rulebook.txt [page 27] Transformation Table columns 1–10
  (line 1277)
- **rule_summary**: The table defines exactly ten Transformation Levels.
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetResources.tsx:36`
  (`max={10}`), `src/types.ts:541` ("Transformation Level 0–10")
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Reduction-clears-actives — confirmed match, but the Short Rest is now more specific

- **txt_section**: core-rulebook.txt [page 26] "Reducing Transformation Level" (lines 1249–1271)
- **rule_summary**: **Short Rest**: reduce Transformation Level by 1 and **lose
  all active Transformations**; during the same Short Rest you may make a **DC 13
  Constitution (Grit) check** to reduce it by **1 additional level**. **Long
  Rest**: reduce to **0** and lose all active Transformations. **Unconscious**:
  the first time you gain the Unconscious condition after gaining a
  Transformation, reduce Transformation Level by **2** and lose all active
  Transformations; you cannot do this again until you finish a Short or Long
  Rest or gain another Transformation.
- **code_location**: `src/features/hunter/components/appsheet/AppEditStage.tsx:86-87`
  (any reduction of `transformationLevel` clears `activeTransformations`),
  `AppEditStage.tsx:221` (the "Cleared by reduction" staged-change badge),
  `CharacterSheetResources.tsx:36` (note text)
- **verdict**: match (the clearing behaviour) + missing_in_code (the three
  named reduction triggers and the DC 13 CON (Grit) option)
- **proposed_change**: The generic "reducing clears actives" behaviour is
  correct — leave it. Optionally add the rule text as the control's `note`:
  "Short Rest −1 (DC 13 CON (Grit) for −1 more); Long Rest → 0; first
  Unconscious −2." No structural change. The Unconscious once-per-rest lockout
  would need a flag if ever automated; not worth adding while rests are manual.
- **stored_data_impact**: none

### Duplicate Transformation rule (2 Madness, no stacking) is unmodelled

- **txt_section**: core-rulebook.txt [page 26] "Getting same Transformations" (lines 1236–1241)
- **rule_summary**: "Active Transformations do not stack with themselves. If you
  roll one you already have, **suffer 2 Madness**, and nothing more happens."
- **code_location**: `src/types.ts:545-547` — the field comment explicitly says
  "duplicates allowed" for `activeTransformations`.
- **verdict**: mismatch
- **proposed_change**: De-duplicate on write in `AppEditStage.tsx` where
  `activeTransformations` is staged, and correct the `src/types.ts` comment to
  "unique ids — a duplicate roll instead costs 2 Madness". Keep the
  `key={`${entry}-${index}`}` render as-is; it is harmless.
- **stored_data_impact**: existing `/characters/{id}.activeTransformations`
  arrays could contain duplicates. Normalize to unique on load (in the same
  place `src/lib/character.ts` already normalizes cards, ~line 164). No data
  loss — dropping a duplicate is exactly the rule.

### Gaining and resisting Transformation Levels

- **txt_section**: core-rulebook.txt [page 26] "Gaining Transformation Level" /
  "Resisting gaining Transformation Level" (lines 1227–1247)
- **rule_summary**: On gaining a level, increase the level by 1 and **roll on
  the column for the new level**. "If you gain several levels, roll only once at
  the final level." To resist, make a **Grit skill check** (Grit is a CON skill —
  `src/data/skills.ts:8` already has this) against a DC "stated by the source of
  the transformation level".
- **code_location**: `CharacterSheetResources.tsx:36` +
  `AppEditStage.stageTransformation` — the level is a bare stepper with no
  prompt to roll on gain.
- **verdict**: missing_in_code
- **proposed_change**: When `transformationLevel` is staged **upward**, show the
  new level's table column inline in the existing Transformations section so the
  player can record the rolled result — a single roll for the final level, per
  the rule. Depends on the table catalog above.
- **stored_data_impact**: none

### Blood Tinge as a boolean — matches, and the Long Rest loss is the missing half

- **txt_section**: core-rulebook.txt [page 25] "you also lose any unspent Blood
  Tinge" (line 1201); [page 29] "Death's Door Mechanics" (lines 1398–1403) lists
  Blood Tinge, Not Tonight!, and Favors.
- **rule_summary**: Blood Tinge is held-or-not and is lost, unspent, on a Long
  Rest.
- **code_location**: `src/types.ts:550-551`, `CharacterSheetResources.tsx:31`
  ("Blood Tinge held" checkbox), `characterAutomation.ts:266`,
  `deriveSheetFromCard.ts:96`, `legacyMigration.ts:213`
- **verdict**: match (representation); the Long-Rest clearing is covered by the
  Long Rest finding above.
- **proposed_change**: none beyond the Long Rest action.
- **stored_data_impact**: none

### "Not Tonight!" is absent from the character record

- **txt_section**: core-rulebook.txt [page 25] "Regain Not Tonight! if you do
  not already have it." (line 1202); [page 29] "Death's Door Mechanics" (line 1401)
- **rule_summary**: Not Tonight! is a held/spent comeback resource on the same
  footing as Blood Tinge, regained on a Long Rest if not already held.
- **code_location**: ABSENT — no `notTonight` token in `src/`.
- **verdict**: missing_in_code
- **proposed_change**: Add `notTonight?: boolean` to `HunterCard` and one more
  checkbox in the existing "Battle states" grid of `CharacterSheetResources.tsx`
  next to "Blood Tinge held". Verify against the Death's-Door section (chapter 2)
  before finalising the label — that section is another agent's range.
- **stored_data_impact**: new optional boolean on `/characters/{id}`. Missing =
  not held; no migration needed.

### Bloodied has a precise definition and no representation

- **txt_section**: core-rulebook.txt [page 29] "Bloodied" (lines 1392–1396)
- **rule_summary**: "A creature is Bloodied while its current Hit Points are
  equal to or less than half its Hit Point maximum, **rounded down**."
- **code_location**: ABSENT as a derived value. Referenced only in class prose
  (`src/data/classes.ts:90`, Brute "Feral Rally ... if you are Bloodied").
- **verdict**: missing_in_code
- **proposed_change**: Purely derived — add a `isBloodied(currentHp, maxHp)`
  helper in `src/lib/character.ts` (`currentHp <= Math.floor(maxHp / 2)`) and use
  it to flag the existing HP display on the character sheet and the play-mode
  hunter cards. No new field, no new UI block.
- **stored_data_impact**: none — fully derived from `currentHp` and max HP.

### Rest minimum of 1 Hit Point, and rest interruption conditions

- **txt_section**: core-rulebook.txt [page 25] lines 1191–1193 and 1220–1223
- **rule_summary**: "You must have at least 1 Hit Point to begin a rest."
  Both rests are interrupted if you **roll Initiative, take damage, perform a
  Rite other than a Whisper**, or undertake strenuous activity (1 hour of it for
  a Long Rest). An interrupted Short Rest grants **no** benefits. An interrupted
  Long Rest that ran at least 1 hour grants the benefits of an **unsafe Short
  Rest**; it may be resumed, but its required duration **increases by 1 hour per
  interruption**.
- **code_location**: ABSENT. The play feature models phase only
  (`src/features/play/lib/phase.ts`, `gameStore.setPhase`); nothing tracks rest
  duration, interruption, or the 1-HP precondition.
- **verdict**: missing_in_code
- **proposed_change**: None mechanical — this is table adjudication and the app
  deliberately does not run a rest timer. Fold the interruption conditions into
  the phase hints only if space allows; otherwise leave to the Codex. Flagged so
  it is not mistaken for an omission.
- **stored_data_impact**: none

### Character-creation step order (Chapter 2 opening)

- **txt_section**: core-rulebook.txt [page 30] "Create Your Character" (lines 1456–1467)
- **rule_summary**: Five steps, in order: **1 Choose a Class** (and note your
  **Armor Training**), **2 Determine a Background**, **3 Determine Ability
  Scores**, **4 Select and Equip Armor**, **5 Fill in Details**. The text also
  says the app is a sanctioned tool: "You can also use the C&S App to set up your
  character and do all the math for you."
- **code_location**: The guided builder's step sequence — the components under
  `src/features/hunter/components/` do not themselves declare the step list;
  the creation flow's ordering should be confirmed by whichever agent owns the
  Chapter 2 range in detail.
- **verdict**: match (as far as this range goes — class → background → abilities
  → armor is the app's existing order)
- **proposed_change**: none. Explicitly do **not** re-order or redesign the
  builder on the strength of this list.
- **stored_data_impact**: none

### Creature Types are named but not app-modelled

- **txt_section**: core-rulebook.txt [page 29] "Creatures of C&S" / "Creature
  Types" (lines 1405–1436)
- **rule_summary**: Every creature has a **Creature Type, Size, and Level**.
  Types: **Humans** (player characters are Humans unless a rule changes their
  type), **Dreadbloods** (a Human transformed by Old Blood — its Creature Type
  *changes* to Dreadblood), **Greater Dreadbloods** (also count as Dreadbloods),
  **Dreadlords**, **Deep Ones**, **Great Ones**, **Old Ones**, **Beasts**.
  Statistics live in the GM Bestiary, not here.
- **code_location**: `src/data/creatures.ts` (per the brief's catalog list) —
  not exercised by this range; the type taxonomy itself has no representation on
  `HunterCard`.
- **verdict**: missing_in_code (low priority)
- **proposed_change**: None required for player Hunters (always Human by
  default). Worth noting only because the *Dreadlord connection* transformation's
  Dreadful Scream targets "every other Human and Dreadblood within 30 feet" — if
  the play-mode combatant model ever gains a type field, this is the vocabulary.
  Do not add a type field to `HunterCard` now.
- **stored_data_impact**: none

### GM-only boundary: "LOST"

- **txt_section**: core-rulebook.txt [page 28] "LOST — This hidden effect can
  only be found in the Hidden Condition Sheet." (lines 1385–1386)
- **rule_summary**: `Lost` appears throughout the Transformation Table (it fills
  most of the high-level columns) but its effect is Hidden-Condition-Sheet
  content.
- **code_location**: N/A — nothing currently ships it, which is correct.
- **verdict**: match (by absence)
- **proposed_change**: none, but treat this as a hard constraint on the
  Transformation Table work above: the **name** `Lost` may appear in the table
  data (it is printed in the public core rulebook), while its **effect text**
  must never enter `src/data/**`, the Codex, or any build output.
- **stored_data_impact**: none
