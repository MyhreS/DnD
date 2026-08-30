# A06 — Derived stats, vitals, Death's Door, Favor, Level Advancement

Scope: `docs/rules/core-rulebook.txt` lines 1695–2155 (pages 35–47).

---

### Studs AC bonus triggers at one studded piece instead of three

- **txt_section**: core-rulebook.txt [page 35] "Armor Part 1" — Studs row (lines 1732–1736)
- **rule_summary**: "Studs can be added to Add-on Armor pieces. **If at least three Add-on Armor pieces are studded, you gain +1 AC. If five are studded, this bonus increases to +2 AC.**" Also: each studded piece adds **5 lb.**, and studded armor gives Disadvantage on Dexterity (Stealth) checks to hide or move silently.
- **code_location**: `src/lib/character.ts` → `armorClass()`: `const studBonus = studded >= 5 ? 2 : studded >= 1 ? 1 : 0;` (and the doc comment on `ArmorClassResult.studBonus`: "≥1 studded piece +1"). Weight: `wornArmorWeight()` uses `studdedAddonIdsOf(card).length * 3`.
- **verdict**: mismatch
- **proposed_change**: `studded >= 5 ? 2 : studded >= 3 ? 1 : 0`, and update the `studBonus` doc comment. Separately change the studs weight multiplier from `* 3` to `* 5` in `wornArmorWeight()`. Also add the studded-armor Stealth Disadvantage to the special-text aggregation (`characterAutomation.ts` already concatenates `piece.special`, so it only needs the correct text in `src/data/armor.ts`).
- **stored_data_impact**: No stored field changes — `studdedAddonIds` stays. Every saved card with 1–2 studded add-ons loses 1 AC and every card with studs gains 2 lb per studded piece; `sheet.ac`, `sheet.armorCategory`, `sheet.weight` and `sheet.weightCondition` snapshots must be recomputed via `calculatedSheetFields()`. A recomputed lower base armor AC can also flip the Dex category (e.g. 13 → 12 moves Medium → Light), so AC changes may exceed 1.

### Passive Perception ignores Perception Expertise

- **txt_section**: core-rulebook.txt [page 42] "FILL IN NUMBERS" (lines 1935–1947) and [page 43] (lines 1995–1999)
- **rule_summary**: "Passive Perception = 10 + Wisdom (Perception) check modifier" and "**Include all modifiers that apply to your Wisdom (Perception) checks.**" Worked example: Wisdom 15 + Perception proficiency = 14 (10 + 2 + 2).
- **code_location**: `src/features/hunter/lib/characterAutomation.ts` → `automationFor()`, the `passivePerception` line: `10 + abilityModifier(card.abilities.wis) + (allSkills.has("Perception") ? prof : 0) + passiveModifier`. Breakdown UI: `src/features/hunter/components/character-sheet/CharacterSheetDerivedStat.tsx`, `passive` rows ("Perception proficiency", `proficient ? proficiencyBonus(card.level) : 0`).
- **verdict**: mismatch (partial — the base formula and the worked example both match; only Expertise is dropped)
- **proposed_change**: Multiply the proficiency term by the same expertise multiplier the skill rows already use: reuse `expertise.has("Perception") ? prof * 2 : prof`. Mirror the doubled value in the `passive` breakdown row label/value in `CharacterSheetDerivedStat.tsx`.
- **stored_data_impact**: `sheet.passivePerception` must be recomputed for any card with `sheetAutomation.expertiseSkills` containing "Perception" (Scouts with Expertise at level 2). No field additions.

### Hit Point maximum and Hit Point Dice match the new fixed tables (non-obvious confirmation)

- **txt_section**: core-rulebook.txt [page 42] "Level 1 Hit Points by Class" (lines 1915–1919) and [page 46] "Fixed Hit Points by Class" (lines 2108–2113)
- **rule_summary**: Level 1 max — Bloodbound 12 + Con, Brute/Scout/Warden 10 + Con, Stalker 8 + Con, Deepcaller 6 + Con. Per level thereafter — Bloodbound 7 + Con, Brute/Scout/Warden 6 + Con, Stalker 5 + Con, Deepcaller 4 + Con. "Each time you gain a level, you gain an additional Hit Die."
- **code_location**: `src/lib/character.ts` → `maxHp()` (`klass.hitDie + con` at L1, then `dieAverage(die) = floor(die/2)+1` per level); class dice in `src/data/classes.ts` (brute 10, scout 10, stalker 8, deepcaller 6, bloodbound 12, warden 10). `hdMax` = `level` in `characterAutomation.ts`.
- **verdict**: match
- **proposed_change**: none. (Only nuance: `maxHp` clamps each level's gain to a minimum of 1, which the txt does not state; harmless and only reachable at Con −5 or below on a Deepcaller.)
- **stored_data_impact**: none

### Level 1 Hit Points table lists no Bloodbound/Warden mismatch, but "Warden" is absent from the class chapter opener

- **txt_section**: core-rulebook.txt [page 47] "Chapter 3 Classes" (lines 2150–2164, continuing past this section) vs. the HP tables (lines 1917–1919, 2110–2113)
- **rule_summary**: The HP tables name **Bloodbound, Brute, Scout, Warden, Stalker, Deepcaller** — the same six classes the app ships. This confirms the app's six-class roster survives the beta.
- **code_location**: `src/data/classes.ts` → `CLASSES`
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Current Sanity is still tracked and displayed; the beta says not to track it

- **txt_section**: core-rulebook.txt [page 42] "Max Sanity and Madness" (lines 1928–1939)
- **rule_summary**: "Your class entry gives your base Max Sanity; add your Wisdom modifier to determine your final Max Sanity. **Start with 0 Madness and do not track Current Sanity.** Madness functions like damage against Max Sanity: when Madness equals or exceeds Max Sanity, you become Insane and gain the Insane Condition. Reducing Madness below Max Sanity ends Insane."
- **code_location**: `src/features/hunter/lib/characterAutomation.ts` (`sanityCur` field, "Current Sanity, defaulting to calculated maximum"); `src/features/hunter/components/character-sheet/CharacterSheetSanity.tsx` (headline `{sanity} / {sanityMax} Sanity`, plus a manual `insane` checkbox); `CharacterSheetHome.tsx` line 104 (Sanity meter + progress bar driven by `sanity / sanityMax`); `src/features/hunter/lib/deriveSheetFromCard.ts:66`; `AppEditStage.tsx:62–64,149` (level-up refills `sanity` via `levelAdjustedPool`); `HunterCard.sanity` in `src/types.ts`.
- **verdict**: mismatch (Madness is already modelled independently and is correct; Current Sanity is the leftover)
- **proposed_change**: Make Madness the tracked pool and derive display from it: show `Madness {madness} / {sanityMax}` in the existing Sanity panel and Home meter (same components, same layout — fill the bar with `madness / sanityMax`), drop the `sanityCur` control, and stop writing `sanityCur`/`card.sanity` from automation, `deriveSheetFromCard`, and the `AppEditStage` level-up refill (Madness must NOT be refilled on level-up; only the maximum moves). Replace the manual `insane` checkbox with a derived flag `madness >= sanityMax`. NOTE: `docs/rules/character-sheet.txt` line 32–34 still prints "SANITY … CURRENT / MAX" boxes, so the *printable* paper-sheet field should be left in place; this change is to the app's tracked state and app-sheet UI only.
- **stored_data_impact**: `HunterCard.sanity` becomes dead — leave it readable for one migration cycle (`normalizeCard` already derives `madness` from `previousMaxSanity - previousSanity` losslessly), then strip `sanity` and `sheet.sanityCur` from `/characters/{id}`. `sheet.insane` should be dropped and recomputed. No `madness` backfill needed; `normalizeCard()` already covers it.

### "Not Tonight!" is entirely missing

- **txt_section**: core-rulebook.txt [page 44] "DEATH'S DOOR" (lines 2030–2049)
- **rule_summary**: "A newly created Hunter **begins with Not Tonight!**" Regained on finishing a Long Rest if not already held; **maximum one at a time**; "Record whether you currently have Not Tonight! on your Character Sheet." It activates automatically (no action, cannot be declined) when damage from an attack or effect would reduce you from ≥1 HP to 0, or when remaining damage would cause Instant Death: apply Resistance/damage reduction first, then expend it and set HP to **1** instead of 0. You do not gain Dying or Dead from that damage. It cannot activate if you were already at 0 HP, and cannot prevent non-damage death. Because it leaves you at 1 HP you then gain Blood Tinge if you have not already gained it that round.
- **code_location**: ABSENT. `src/types.ts` has `bloodTinge?: boolean` and `deathPending?: boolean` but no `notTonight`. `emptyCard()` in `src/lib/character.ts` sets `bloodTinge: false` and nothing for Not Tonight!. `CharacterSheetResources.tsx` "Battle states" renders only Blood Tinge + the six death-save boxes.
- **verdict**: missing_in_code
- **proposed_change**: Add `notTonight?: boolean` to `HunterCard`; set `notTonight: true` in `emptyCard()`; emit it from `automationFor()` next to the existing `bloodTinge` put; render one more checkbox in the existing "Battle states" grid in `CharacterSheetResources.tsx` labelled "Not Tonight! held", written the same way Blood Tinge is (`model.setFields({ notTonight }, { notTonight })`).
- **stored_data_impact**: New `/characters/{id}.notTonight` boolean. Backfill existing docs to `true` in `normalizeCard()` when the field is absent (every existing Hunter has either never used it or has since Long Rested).

### Blood Tinge is a flag only — its once-per-round trigger and Long Rest loss are unmodelled

- **txt_section**: core-rulebook.txt [page 44] (lines 2017–2029)
- **rule_summary**: "**Once per round, when damage leaves you with 1–9 Hit Points, you gain Blood Tinge.** You can have only one Blood Tinge at a time." Spend it immediately after rolling a die (before resolving) to reroll that die; you must use the new roll; when several dice are rolled, reroll only one; never another creature's or the GM's die; requires no action. "Unspent Blood Tinge is lost when you finish a Long Rest."
- **code_location**: `src/types.ts` `bloodTinge?: boolean`; `characterAutomation.ts` `put(..., "bloodTinge", card.bloodTinge === true, "Current Blood Tinge state")`; `CharacterSheetResources.tsx` "Blood Tinge held" checkbox.
- **verdict**: match (the single-boolean model is exactly right — "only one at a time"), with one gap: the trigger threshold is not surfaced
- **proposed_change**: Minimal — extend the automation `reason` string / the checkbox `note` to state the rule ("Gained once per round when damage leaves you at 1–9 HP; lost on a Long Rest"). No new state. Do not add a counter — the source caps it at one.
- **stored_data_impact**: none

### Favors are entirely missing (resurrection, the 2-Favor cap, and the Insight reset)

- **txt_section**: core-rulebook.txt [pages 44–45] "Favor" (lines 2025–2084)
- **rule_summary**: The GM awards a Favor for exceptional service; never automatic. "**A Hunter can have no more than two Favors.** If you would gain a Favor while you already have two, you gain nothing. **Record your Favors on your Character Sheet.**" On death you may expend one — decided at the moment of death. If expended: your body and everything worn/carried vanish; you stay dead until the Band completes its next Long Rest, then return in an unoccupied space at its resting place, treated as having completed that Long Rest; Dead/Dying/Unconscious end and **all Death Saving Throw successes and failures are removed**; your gear returns (expended/consumed/lost/destroyed items do not). Interrupted Long Rest ⇒ no return, the Favor stays expended, you return at the Band's next Long Rest. On return, "**lose all Insight gained since reaching your current Level. Reduce your Insight to the minimum total required for your current Level in the Character Advancement table. You never lose a Level from expending a Favor.**" If no Band member is alive, you return after 8 hours in the last Safe Zone where the Band completed a Long Rest.
- **code_location**: ABSENT. No `favor`/`favors` symbol anywhere in `src/`. The nearest existing machinery is `HunterCard.deathPending` (`src/types.ts:571`, "Player has hit 0 HP and confirmed death; awaiting the DM to confirm") and the death-save checkboxes `dsS1–3`/`dsF1–3` in `CharacterSheetResources.tsx`.
- **verdict**: missing_in_code
- **proposed_change**: Add `favors?: number` (0–2) to `HunterCard`, default 0 in `emptyCard()`, clamped in `normalizeCard()`. Surface it as one `CharacterSheetResourceControl` (`label="Favors"`, `min={0} max={2}`) in the existing "Battle states"/Recovery group of `CharacterSheetResources.tsx` — no new panel. In the existing death flow that sets `deathPending`, offer "Expend a Favor" when `favors > 0`; expending it decrements `favors`, clears `dsS1–3`/`dsF1–3`, and sets `insight` to `INSIGHT_BY_LEVEL[card.level]` (`src/lib/insight.ts` already holds the exact table: level 1→0, 2→6, 3→15 … 20→950) while leaving `level` untouched — this is the txt's "reduce your Insight to the minimum total required for your current Level" and "never lose a Level".
- **stored_data_impact**: New `/characters/{id}.favors` number, backfilled to `0`. Expending mutates `insight` downward and clears the six `sheet.ds*` booleans; both are existing fields.

### Death Saving Throw tracking matches

- **txt_section**: core-rulebook.txt [page 42] (lines 1924–1927) "There's also space to track Death Saving Throws"; the roll itself at [line 960] "At the start of each of your turns, roll 1d20. A result of 10 or higher is one success; a lower result is one [failure]"
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetResources.tsx` — `dsS1..dsS3` / `dsF1..dsF3` checkboxes
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Temporary Hit Points, Hit Dice current/spent, Sanity Dice, Initiative and saving throws all match

- **txt_section**: core-rulebook.txt [pages 42–43] (lines 1920–1999)
- **rule_summary**: Saving throws = ability modifier + Proficiency Bonus where proficient, otherwise the bare ability modifier. Hit Point Dice: die type from the class, **1 Hit Die at level 1**, spend up to your **Proficiency Bonus** on a Short Rest, each spent die is rolled + Con modifier; sheet has space for dice spent; Short-Rest spending only inside a Safe Zone; Long Rest in a Safe Zone restores all HP and all expended Hit Dice; Long Rest outside a Safe Zone restores **half your HP maximum** and **no** Hit Dice. Sanity Die: one, rolled once on finishing a Long Rest, add Wisdom modifier, reduce Madness by the total to a minimum of 0. "Initiative. Write your **Dexterity modifier** in the space for Initiative."
- **code_location**: `characterAutomation.ts` — `${key}Save` = `mod + (saveProficient ? prof : 0)`; `hdMax` = level; `hdCur` clamped to `[0, level]`; `sanityDice` = `klass.sanityDie`; `initiative` = `abilityModifier(dex)` (+ Alert's proficiency bonus, + a custom modifier). `CharacterSheetHealth.tsx` renders `hpTemp`. `CharacterSheetResources.tsx` renders "Hit dice left" and "Hit dice spent".
- **verdict**: match
- **proposed_change**: none for the numbers. Two rules have no home in the app and are worth a one-line note in the existing Recovery section copy rather than new state: the Short-Rest spend cap **equal to Proficiency Bonus** (currently the "Hit dice left" control's only cap is `hdMax`), and the Safe-Zone conditions on Short/Long Rest recovery. The Sanity Die's "reduce Madness by the roll + Wisdom modifier" is now the only thing the Sanity Die is for, and pairs with the Current-Sanity finding above.
- **stored_data_impact**: none

### Rite save DC and Rite attack bonus match exactly

- **txt_section**: core-rulebook.txt [page 43] "Rite Performing" (lines 1976–1991)
- **rule_summary**: "Rite save DC = **8 + Rite Performing ability modifier + Proficiency Bonus**"; "Rite attack bonus = **Rite Performing ability modifier + Proficiency Bonus**"; "In C&S that is probably only going to be intelligence."
- **code_location**: `characterAutomation.ts` — `riteDC` = `8 + prof + riteMod`, `riteAttack` = `prof + riteMod`, `riteAbility` = `"Intelligence"`, `riteMod` = `abilityModifier(card.abilities.int)`, all gated on `klass.caster`.
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Weapon attack bonuses are not derived anywhere

- **txt_section**: core-rulebook.txt [page 43] "Attacks" (lines 1957–1975)
- **rule_summary**: "**Melee attack bonus = Strength modifier + Proficiency Bonus**"; "**Ranged attack bonus = Dexterity modifier + Proficiency Bonus**" — "for a weapon with which you have proficiency … unless a weapon's property says otherwise". "You add the same ability modifier you use for attacks with a weapon to your damage rolls with that weapon."
- **code_location**: ABSENT from `characterAutomation.ts` — the automation emits no `atk*`/`dmg*` fields; the weapons rows of the sheet are player-typed.
- **verdict**: missing_in_code
- **proposed_change**: Low-cost addition inside the existing weapons block: emit two derived read-only values (`meleeAttack` = `formatModifier(abilityModifier(str) + prof)`, `rangedAttack` = `formatModifier(abilityModifier(dex) + prof)`) and show them as two `character-sheet-resource` rows in the existing "Character sheet values" group of `CharacterSheetResources.tsx`, next to the Rite rows. Per-weapon derivation is out of scope here (weapon properties override).
- **stored_data_impact**: none (new derived `sheet` fields only, regenerated by `calculatedSheetFields()`).

### AC's Strength requirements at 16 AC and 17+ AC are unenforced and unsurfaced

- **txt_section**: core-rulebook.txt [page 40] "2: CALCULATE YOUR ARMOR CLASS" (lines 1809–1836)
- **rule_summary**: Category table — Unarmored 10 AC (full Dex), Light Armor 11–12 AC (full Dex), Medium Armor 13–14 AC (Dex up to +2), Heavy Armor 15+ AC (no Dex). Two notes: "**(16 AC) Requires 13 STR**" and "**(17+ AC) Requires 15 STR**". The six-step order: start at 10 or the Main Armor value → add Add-on and Upgrade bonuses → that is the base armor AC → the base decides Light/Medium/Heavy → then add Dexterity per category.
- **code_location**: `src/data/armor.ts` → `acCategory()` (thresholds `<=10`, `<=12`, `<=14`, else Heavy — all four exact); `src/lib/character.ts` → `armorClass()` computes `baseArmorAc = baseAc + addonBonus + studBonus` and only then applies `cat.applyDex(dexMod)` — the six-step order is followed precisely.
- **verdict**: match on the category table and the step order; missing_in_code for the two STR notes
- **proposed_change**: Add the requirement to the existing AC breakdown in `CharacterSheetDerivedStat.tsx` (`kind === "ac"` rows) as a warning line when `armor.baseArmorAc >= 16 && str < 13` or `armor.baseArmorAc >= 17 && str < 15`. Advisory text only — do not block equipping, since the txt states it as a requirement note rather than a penalty.
- **stored_data_impact**: none

### Insight thresholds and the Character Advancement table match exactly

- **txt_section**: core-rulebook.txt [page 46] "Character Advancement" (lines 2109–2137)
- **rule_summary**: Level 1→0, 2→6, 3→15, 4→30, 5→50, 6→75, 7→105, 8→140, 9→180, 10→225, 11→275, 12→330, 13→390, 14→455, 15→525, 16→600, 17→680, 18→765, 19→855, 20→950.
- **code_location**: `src/lib/insight.ts` → `INSIGHT_BY_LEVEL = [0, 0, 6, 15, 30, 50, 75, 105, 140, 180, 225, 275, 330, 390, 455, 525, 600, 680, 765, 855, 950]` (index = level); `levelForInsight()`; consumed by `CharacterSheetProgress.tsx`.
- **verdict**: match — all twenty values are character-for-character identical
- **proposed_change**: none
- **stored_data_impact**: none

### Levelling is available immediately; the txt requires a Long Rest first

- **txt_section**: core-rulebook.txt [page 46] "Level Advancement" (lines 2104–2107)
- **rule_summary**: "When your Insight total equals or exceeds a number in the insight column, you reach the corresponding level **only after a Long Rest**."
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetProgress.tsx` — `availableLevel = Math.max(level, levelForInsight(insight))` immediately enables the "Upgrade character" button once the threshold is crossed.
- **verdict**: mismatch (soft — a table-timing rule with no other app state to hang it on)
- **proposed_change**: Minimal and non-structural: change the pending-upgrade button's `small` copy from "Preview gains, make choices, then save." to note the Long Rest gate (e.g. "Take a Long Rest, then preview gains, make choices, and save."). Do not add a rest tracker or gate the button — the app has no Long Rest state and adding one is a redesign.
- **stored_data_impact**: none

### Insight bonus for lagging Hunters is unmodelled

- **txt_section**: core-rulebook.txt [page 46] (lines 2088–2098)
- **rule_summary**: "A player gains **twice as much Insight** whenever more than half of the other Hunters in the Band are at a higher Level. Otherwise, if more than half have more total Insight, increase the Insight that player gains **by half, rounding up**. This bonus cannot raise total Insight above the lowest total held by the Hunters forming that majority; reduce the bonus if necessary. The effect ends once neither condition applies."
- **code_location**: ABSENT. Insight is awarded as a raw number via `CharacterSheetProgress.setInsight` → `insightAwardPatch(stage.previewCard, delta)` (`src/features/hunter/lib/insightAward.ts`); the patch sees one card and has no view of the Band.
- **verdict**: missing_in_code
- **proposed_change**: None in the Hunter sheet — the rule needs every Band member's level and Insight, which only the campaign/party layer has. Flag it for the party or DM-award surface rather than implementing it in `insightAward.ts`. Recommend deferring unless the DM asks.
- **stored_data_impact**: none

### Proficiency Bonus progression matches the class tables

- **txt_section**: core-rulebook.txt [page 46] step "3: Adjust Proficiency Bonus" (lines 2120–2129) — the value comes from the Character Advancement table and each class features table.
- **rule_summary**: The page 46 Character Advancement table as transcribed carries only Level and Insight columns, so the authority is each class's `profBonus` column: +2 at levels 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20.
- **code_location**: `src/lib/character.ts` → `proficiencyBonus(level)` = `2 + Math.floor((clamp(level,1,20) - 1) / 4)`; the per-level `profBonus` entries in `src/data/classes.ts` (verified against the Brute table: L1–4 = 2, L5–8 = 3, L9–12 = 4, L13–16 = 5, L17–20 = 6).
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Constitution increase does not retroactively raise HP maximum for prior levels

- **txt_section**: core-rulebook.txt [page 46] step "4: Adjust Ability Modifiers" (lines 2131–2142)
- **rule_summary**: "When your **Constitution modifier increases by 1, your Hit Point maximum increases by 1 for each level you have attained.**"
- **code_location**: `src/lib/character.ts` → `maxHp()` recomputes from scratch each render using the *current* Con modifier across all levels, so the retroactive increase is already correct in the derived maximum. The gap is `src/features/hunter/components/appsheet/AppEditStage.tsx:62–63`: `levelAdjustedPool(currentHp, currentHpMax, nextHpMax, levelIncreased)` only tops a pool up when `levelIncreased` is true, so a Con bump taken through a feat *without* a level change raises `hpMax` while leaving `currentHp` where it was.
- **verdict**: match on the maximum; mismatch on current HP after a Con-raising feat
- **proposed_change**: In `AppEditStage.tsx`, pass the refill condition as `bounded > model.card.level || nextHpMax > currentHpMax` for the HP pool so a Con-driven maximum increase also carries current HP up by the same amount. `levelUpVitals.ts` itself needs no change beyond widening the `levelIncreased` parameter's meaning (rename to `maximumShouldRefill`).
- **stored_data_impact**: `currentHp` on saved cards whose Con was raised by a feat is silently low by (levels attained) HP. No automated backfill is safe — the low value may be real damage. Leave existing values alone and fix forward.
