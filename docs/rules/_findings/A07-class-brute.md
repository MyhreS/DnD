# A07 — Hunter Brute class (core-rulebook.txt lines 2150–2465, pages 47–54)

Scope: Brute core traits, level 1–20 feature table, feature text, Battle Master
(maneuvers / Superiority Dice) and Champion subclasses, and the app code that
encodes them (`src/data/classes.ts`, the automation provider, upgrade model,
sheet/appsheet ability views).

Overall: the Brute entry in `src/data/classes.ts` is a near-verbatim copy of the
new text. There is **no** Brute feature in the code that the new source has
dropped — no removal candidates at the feature level. The findings below are
wording/number drift, one missing starting-equipment line, and two genuinely
unmodelled mechanics.

---

### Fighting Style feature text says "Fighter level", source says "Hunter Brute level"
- **txt_section**: core-rulebook.txt [page 49] "LEVEL 1: FIGHTING STYLE" (lines 2180–2184)
- **rule_summary**: "You have honed your martial prowess and gain a Fighting Style feat of your choice (see chapter 5). Whenever you gain a **Hunter Brute** level, you can replace the feat you chose with a different Fighting Style feat."
- **code_location**: `src/data/classes.ts` → `CLASSES[brute].features[0].text` (line 52)
- **verdict**: mismatch
- **proposed_change**: In that string replace "Whenever you gain a Fighter level" with "Whenever you gain a Hunter Brute level". (Note: the *Weapon Mastery* text's "certain Fighter levels" is **not** a bug — the source itself says "Fighter levels" on page 49, so leave it verbatim.)
- **stored_data_impact**: none — feature text is rendered from the catalog, never persisted. Saved `sheet.features1` snapshots regenerate via `calculatedSheetFields`.

### Chapter cross-references point at chapter 4; source says chapter 5
- **txt_section**: core-rulebook.txt [page 49] Fighting Style "(see chapter 5)"; [page 51] "LEVEL 19: EPIC BOON … Epic Boon feat (see chapter 5)"
- **rule_summary**: Feats live in chapter 5 in the new rulebook. The Brute's own ASI text in the code already says "chapter 5" — only Fighting Style and Epic Boon still say chapter 4.
- **code_location**: `src/data/classes.ts` lines 52 (`Fighting Style`) and 62 (`Epic Boon`)
- **verdict**: mismatch
- **proposed_change**: change "(see chapter 4)" → "(see chapter 5)" in both Brute feature strings. (The same stale "chapter 4" appears in Scout/Stalker/Deepcaller entries — out of this section's scope, but flag it to the sibling agents so the fix is uniform.)
- **stored_data_impact**: none

### Starting equipment is missing the Wide Brim Hat
- **txt_section**: core-rulebook.txt [page 49] Core Hunter Brute Traits → "Starting Equipment: Greatsword, Shortsword, Bloodvial (1), Toolbelt and Rope, **Wide Brim Hat**" (lines 2206–2209)
- **rule_summary**: The Brute starts with six things; the app's list has five and omits the Wide Brim Hat.
- **code_location**: `src/data/classes.ts` line 25 → `startingEquipment: ["Greatsword", "Shortsword", "1 Blood vial", "Tool Belt", "Rope"]`. Consumed by `src/lib/startingEquipment.ts` → `startingKit()`, which resolves names against `ITEMS` only.
- **verdict**: missing_in_code
- **proposed_change**: append `"Wide Brim Hat"` to the Brute's `startingEquipment`. Note the resolver will return it as `unmatched` because `wide-brim-hat` lives in `src/data/armor.ts` (category `Extra`, subcategory `Head Gear`, 1 lb, AC 0) and not in `ITEMS` — so `startingKit()` needs the hat routed into `extraArmorIds` (it already has an `armorFor`/`headGear` path in `characterAutomation.ts`), or an alias that maps it to an existing item id. Minimal correct fix: add the name to the class list *and* seed `extraArmorIds: ["wide-brim-hat"]` when the Brute kit is applied, so it lands in the sheet's `headGear` field rather than silently vanishing.
- **stored_data_impact**: existing `/characters/{id}` Brute records created before the fix will not have the hat. Optional backfill: for cards with `classId === "brute"` whose `extraArmorIds` lacks `wide-brim-hat`, add it. Safe to skip — players may have discarded it. Do NOT recompute inventory wholesale, since `inventory` is player-edited after creation.

### `primaryAbility: "STR or DEX"` has no source row any more
- **txt_section**: core-rulebook.txt [page 49] Core Hunter Brute Traits table (lines 2180–2210) — the table lists Hit Point Die, Max Sanity, Sanity Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, Armor Training, Starting Equipment, Speed. There is **no "Primary Ability" row**.
- **rule_summary**: The only place the new Brute text names an ability pair is the Battle Master maneuver save DC: "8 plus your **Strength or Dexterity** modifier (your choice) and Proficiency Bonus" [page 52].
- **code_location**: `src/data/classes.ts` line 15; rendered in `CharacterSheetUpgradeChoices.tsx` line 20 and used as a point-buy nudge in `CharacterSheetGuidedChoices.tsx` line 28 (`klass.primaryAbility.split(/\W+/).includes(ability.short)`).
- **verdict**: no_longer_a_rule (weakly — the value happens to agree with the maneuver DC line)
- **proposed_change**: none required for the Brute; the string "STR or DEX" is still the best available reading and drives only a soft UI highlight. Do not remove the `primaryAbility` field — other classes use it and removal would be a redesign. Flag only so no one "corrects" it against a table row that no longer exists.
- **stored_data_impact**: none

### Battle Master maneuvers are prose only — no maneuver selection is modelled
- **txt_section**: core-rulebook.txt [page 52] "LEVEL 3: COMBAT SUPERIORITY" (lines 2332–2358) + [pages 53–54] Maneuver Options (16 maneuvers)
- **rule_summary**: You **learn three maneuvers** at level 3, and **two additional** at Hunter Brute levels **7, 10, and 15** (9 total by 15); each time you learn new ones you may replace one you know. The 16 options are Bait and Switch, Disarming Attack, Distracting Strike, Evasive Footwork, Feinting Attack, Goading Attack, Lunging Attack, Maneuvering Attack, Menacing Attack, Precision Attack, Pushing Attack, Riposte, Sweeping Attack, Trip Attack.
- **code_location**: `src/data/classes.ts` lines 72–73 store both the Combat Superiority rules and the whole maneuver list as two long `text` blobs. There is no structured maneuver catalog anywhere: `grep -rniE "maneuver" src/` hits only `AppWeaponReference.tsx:28` and this class text. `upgradeModel.ts` `RECORDED_CHOICE` (line 15) matches only `ability score improvement|epic boon|fighting style|additional fighting style|forbidden revelation` — maneuvers are never prompted, and the Brute's levels 7/10/15 rows read "Subclass Feature" so nothing surfaces a choice.
- **verdict**: missing_in_code
- **proposed_change**: Minimal, design-preserving option: split the 14 maneuvers out of the single blob into a small catalog (e.g. `MANEUVERS` in `src/data/characterOptions.ts`, the same file that already backs `forbiddenRevelationOptions`) and let `recordedOptionsFor()` in `upgradeModel.ts` return them for a Battle Master's level 3/7/10/15 rows, storing picks in the existing `sheetAutomation.levelChoices` map. This reuses the Forbidden-Revelation pattern exactly and adds no new page or navigation. If that is too large, leave as-is — the rules text is at least fully visible in `AppClassAbilities`.
- **stored_data_impact**: additive only — new keys under `sheetAutomation.levelChoices` (e.g. `"3:Hunter Brute Subclass"`). Existing Battle Master cards get an unresolved level-choice prompt on next open, which is the intended behaviour of `unresolvedLevelChoices`. No field is removed or remapped.

### Refuse the Bleeding and Action Surge uses are not tracked as resources
- **txt_section**: core-rulebook.txt [page 50] Hunter Brute Features table, "Refuse the Bleeding" column: **2** at levels 1–3, **3** at 4–9, **4** at 10–20. [page 49] "LEVEL 2: ACTION SURGE" — one use, regained on a Short or Long Rest; **two uses from level 17**, still only once per turn.
- **rule_summary**: Refuse the Bleeding reduces incoming damage by **1d10 + your Hunter Brute level** on a reaction; you regain **one** use on a short rest and **all** on a long rest.
- **code_location**: The column values are present and correct in `src/data/classes.ts` `progression[].extras["Refuse the Bleeding"]` (lines 30–49) and are printed into `features1` by `characterAutomation.ts` `featureText()` (lines 73–76). But `characterAutomation.ts` gives per-class counters only to casters (`strainMax`/`strainCur`/`strainLevel`, lines 165–173); `CharacterSheetResources.tsx` shows Recovery, Sanity dice, caster Rite values, battle states and Transformations — nothing for Brute uses.
- **verdict**: missing_in_code (the *numbers* match; only live tracking is absent)
- **proposed_change**: Optional and low priority. If wanted, generalise the existing caster-only counter block: for a class whose `progressionColumns` includes a countable resource, emit `<col>Max` / `<col>Cur` the way `strainMax`/`strainCur` already work, and render it in the existing "Character sheet values" group of `CharacterSheetResources.tsx`. No layout change. Otherwise: none — this is a pre-existing gap the new source neither creates nor closes.
- **stored_data_impact**: if implemented, one additive numeric field per tracked resource on the card's `sheet`; nothing to strip or remap.

### Confirmed match — Superiority Die size scaling in the weapon reference
- **txt_section**: core-rulebook.txt [page 52] Combat Superiority ("four Superiority Dice, which are d8s"), "LEVEL 10: IMPROVED COMBAT SUPERIORITY — Your Superiority Die becomes a d10", "LEVEL 18: ULTIMATE COMBAT SUPERIORITY — Your Superiority Die becomes a d12"
- **rule_summary**: d8 from level 3, d10 from 10, d12 from 18.
- **code_location**: `src/features/hunter/components/appsheet/AppWeaponReference.tsx` line 28 — `card.level >= 18 ? "+1d12" : card.level >= 10 ? "+1d10" : "+1d8"`, gated on `card.subclassId === "battle-master"`
- **verdict**: match
- **proposed_change**: none — non-obvious cross-file dependency; do not "simplify" this away.
- **stored_data_impact**: none

### Confirmed match — Champion "Ferocious Warrior" uses the real Blood Tinge state
- **txt_section**: core-rulebook.txt [page 54] "LEVEL 10: FEROCIOUS WARRIOR — During combat, you can give yourself Blood Tinge whenever you start your turn without it."
- **rule_summary**: Blood Tinge is a real tracked character state, not flavour.
- **code_location**: feature text at `src/data/classes.ts` line 88; the state exists as `card.bloodTinge` → `characterAutomation.ts` line 266 (`put(fields, reasons, "bloodTinge", card.bloodTinge === true, …)`) and is toggled in the "Battle states" group of `CharacterSheetResources.tsx`.
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Confirmed match — Weapon Mastery count is driven off the table, not the prose
- **txt_section**: core-rulebook.txt [page 50] Weapon Mastery column: **3** at levels 1–3, **4** at 4–9, **5** at 10–15, **6** at 16–20
- **rule_summary**: The level-1 prose says "three kinds"; the table overrides it as the Brute levels.
- **code_location**: `src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx` lines 160–169 — `masteryFromTable` reads `progression[level].extras["Weapon Mastery"]` and only falls back to parsing the word out of the feature text when the table has no value. Consumed by `CharacterSheetWeaponMasteryChoices.tsx` and `CharacterSheetUpgrade.tsx` line 41.
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

---

## Verified-correct, no action (checked line by line against pages 49–54)

- Core traits: Hit Point Die **d10**, Max Sanity **12**, Sanity Die **2d6**, saves **Strength and Constitution**, **2** skills from Acrobatics/Athletics/Grit/Perception/Survival/Intimidation, Simple and Martial weapons, **no** tool proficiencies, Light + Medium + **Heavy** armor training, Speed **30 ft**.
- The full 20-row features table: every `profBonus` (+2 ×4, +3 ×4, +4 ×4, +5 ×4, +6 ×4), every feature name, and both extra columns match the source exactly.
- Feature text for Action Surge, Refuse the Bleeding (1d10 + Brute level; one use back on a short rest, all on a long rest), Subclass at 3, ASI at 4/6/8/12/14/16, Extra Attack 5, War Master 9 (Push, Sap, or Slow), Two Extra Attacks 11, Studied Attacks 13, Epic Boon 19, Three Extra Attacks 20.
- Battle Master: Combat Superiority at 3 (four d8s, DC = 8 + STR *or* DEX mod + PB), Student of War 7, Improved 10, Relentless 15, Ultimate 18; all 14 maneuver descriptions are transcribed verbatim.
- Champion: Improved Critical 3 (19–20), Additional Fighting Style 7, Ferocious Warrior 10, Superior Critical 15 (18–20), Survivor 18 (Defy Death 18–20 counts as a 20; Feral Rally 5 + CON mod while Bloodied at ≥1 HP).
- Subclass gating: the Brute is correctly **not** `subclassOptional`, so `characterAutomation.ts` line 153 raises a pending subclass choice at level 3, matching page 50.

## Internal source inconsistencies (transcribed faithfully — do not "fix")

- Battle Master **Relentless** (level 15) says "roll **1d8**" even though the Superiority Die is a d10 from level 10. The code copies this verbatim, which is correct behaviour for a verbatim catalog.
- Weapon Mastery's level-1 prose says "certain **Fighter** levels" while the class is the Hunter Brute. Also verbatim.
