# A14 — Feats, Fighting Styles and Epic Boons

Scope: `core-rulebook.txt` Chapter 5 "Feats", pages 96–106 (lines 4296–4803).
The assigned line range 4810–5010 is actually Chapter 6 "Equipment"; the Feats
chapter ends at line 4803, so the whole chapter was read instead.

Code inspected: `src/data/feats.ts`, `src/data/feats.generated.json`,
`src/features/hunter/components/character-sheet/upgradeModel.ts`,
`CharacterSheetUpgradeFeatPage.tsx`, `CharacterSheetUpgradeChoices.tsx`,
`CharacterSheetHunter.tsx`, `src/features/hunter/lib/characterAutomation.ts`,
`src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx`,
`src/lib/character.ts`, `src/data/classes.ts`, `src/data/backgrounds.ts`.

---

### Feat roster is complete and correctly categorised — no removals, no additions
- **txt_section**: core-rulebook.txt [pages 96–106] "Feat Descriptions" (lines 4296–4803)
- **rule_summary**: The book lists exactly 54 feats: 7 Origin (Alert, Lucky, Listener, Savage Attacker, Skilled, Tavern Brawler, Tough), 29 General (Ability Score Improvement … Weapon Master, including the homebrew **Cultist Slayer** and **Shield Arm Master**), 9 Fighting Style (Defense, Dueling, Great Weapon Fighting, Interception, Protection, Blind Fighting, Thrown Weapon Fighting, Two-Weapon Fighting, Unarmed Fighting) and 9 Epic Boon (Combat Prowess, Fate, Fortitude, Irresistible Offense, Recovery, Skill, Speed, the Night Spirit, Truesight).
- **code_location**: `src/data/feats.generated.json` (54 entries), `src/data/feats.ts` (`ORIGIN_FEATS` / `GENERAL_FEATS` / `FIGHTING_STYLE_FEATS` / `EPIC_BOON_FEATS`)
- **verdict**: match
- **proposed_change**: none. There is **no** feat, fighting style or boon in the code that the new txt has dropped, and none in the txt that the code lacks. All 7 Origin feats are also reachable through `src/data/backgrounds.ts` (`feat:` fields).
- **stored_data_impact**: none
- **note**: `feats.generated.json` is named "generated" but **no script writes it** — `scripts/generate-codex-data.mjs` does not touch it and nothing else references it. It is effectively hand-maintained data with a misleading name; corrections below must be applied to the JSON directly.

### Boons ARE represented in the app, but only one has a mechanical effect
- **txt_section**: core-rulebook.txt [pages 104–106] "Epic Boon Feats"
- **rule_summary**: Each Epic Boon is a Level 19+ feat granting +1 to an ability score **to a maximum of 30** plus named benefits (e.g. Boon of Speed's "Quickness. Your Speed increases by 30 feet"; Boon of Fortitude's "Your Hit Point maximum increases by 40"; Boon of Truesight's "Truesight with a range of 60 feet").
- **code_location**: `src/data/feats.generated.json` (9 Epic Boon entries, `abilityMaximum: 30`); offered by `upgradeModel.ts:66` `featOptionsFor` when a class progression feature is named "Epic Boon" (all six classes at level 19, `src/data/classes.ts`); rendered by `CharacterSheetUpgradeFeatPage.tsx`.
- **verdict**: match (representation), mismatch (automation)
- **proposed_change**: Boons exist as selectable data with full descriptions and the +1/max-30 ability step. Only **Boon of Fortitude** is mechanised — `characterAutomation.ts:157` adds `+40` to `hpMax`. Boon of Speed's +30 ft Speed, Boon of Truesight's Truesight, Boon of Skill's "proficiency in all skills" etc. have no effect on derived sheet fields. If parity with the existing Tough/Alert/Listener automation is wanted, add at minimum the Speed term (see next finding); the rest are narrative and can stay descriptive.
- **stored_data_impact**: none for the description-only boons. Adding a Speed term recomputes the `speed` field of every stored `/characters/{id}` sheet snapshot on next save.

### Speed-modifying feats are not applied to the computed Speed field
- **txt_section**: core-rulebook.txt [page 103] "SPEEDY" (line 4643) and [page 106] "BOON OF SPEED" (line 4775)
- **rule_summary**: Speedy — "Speed Increase. Your Speed increases by 10 feet." Boon of Speed — "Quickness. Your Speed increases by 30 feet."
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:174` — `speed` = `klass.speedFt + speedModifier` only. `featNames` is already built at line 136 and is used for Tough, Boon of Fortitude, Alert and Listener, but never for Speed.
- **verdict**: mismatch
- **proposed_change**: In `automationFor`, add `+ (featNames.has("Speedy") ? 10 : 0) + (featNames.has("Boon of Speed") ? 30 : 0)` to the `speed` value and mention the source in the reason string, exactly matching the existing Tough/Alert pattern.
- **stored_data_impact**: `sheet.speed` is recomputed for stored cards that already list Speedy or Boon of Speed; the change is additive and no field is stripped. Cards where a player compensated by hand via `sheet.speedModifier` would double-count — those `speedModifier` values should be checked/zeroed for the affected characters.

### Resilient can never be completed — its ability choice renders no options
- **txt_section**: core-rulebook.txt [page 101] "RESILIENT" (lines 4541–4550)
- **rule_summary**: "Choose one ability in which you lack saving throw proficiency. Increase the chosen ability score by 1, to a maximum of 20." — the choice is over **all six** abilities (filtered by the character's existing save proficiencies).
- **code_location**: `src/data/feats.generated.json` — Resilient has `abilityPoints: 1` but `abilityOptions: []`. `CharacterSheetUpgradeFeatPage.tsx:33` renders `ABILITIES.filter((a) => selected.abilityOptions.includes(a.key))` → zero selectors, so `used` stays 0, and `upgradeModel.ts:99` `upgradeFeatureComplete` requires the placed total to equal `abilityPoints` (1). The level-up is therefore **permanently blocked** if a player picks Resilient.
- **verdict**: mismatch (blocking bug)
- **proposed_change**: Set Resilient's `abilityOptions` to `["str","dex","con","int","wis","cha"]` (the same shape already used by Ability Score Improvement, Skill Expert and the boons). A stricter option, if wanted later, is filtering out the class's `savingThrows` in `CharacterSheetUpgradeFeatPage`, but the minimal fix is the data change.
- **stored_data_impact**: none for saved cards (no card can currently hold a completed Resilient selection). After the fix, existing half-finished `sheetAutomation.levelFeats` entries naming "Resilient" become completable.

### Heavily Armored is missing its "Strength 13+" prerequisite and its Load Bearer benefit
- **txt_section**: core-rulebook.txt [page 99] "HEAVILY ARMORED" (lines 4447–4457)
- **rule_summary**: Prerequisite is "Level 4+, **Medium Armor Training, Strength 13+**". Benefits are Armor Training (Heavy armor), **Load Bearer** ("When calculating carried weight, reduce the total weight of armor you wear by 10 lb., to a minimum of 0 lb. This does not change the armor's actual weight for any other rule."), and +1 Str or Con to max 20.
- **code_location**: `src/data/feats.generated.json` → Heavily Armored: `prerequisite: "Level 4+, Medium Armor Training"`, description contains only Armor Training + Ability Score Increase.
- **verdict**: mismatch
- **proposed_change**: Set `prerequisite` to `"Level 4+, Medium Armor Training, Strength 13+"` and append the verbatim Load Bearer sentence to `description`. Optionally mechanise it in `src/lib/inventory.ts` `totalCarriedWeight` (armor weight −10 lb, floored at 0) — the carried-weight/condition fields at `characterAutomation.ts:244-247` currently ignore it.
- **stored_data_impact**: none for the text change. Mechanising Load Bearer recomputes `sheet.weight` and `sheet.weightCondition` for cards holding this feat.

### Moderately Armored is missing its "Strength or Dexterity 13+" prerequisite and its Efficient Fit benefit
- **txt_section**: core-rulebook.txt [page 100] "MODERATELY ARMORED" (lines 4510–4525)
- **rule_summary**: Prerequisite "Level 4+, **Light Armor Training, Strength or Dexterity 13+**". Benefits: Armor Training (Medium armor); **Efficient Fit** ("reduce the total weight of armor you wear by 5 lb., to a minimum of 0 lb. … This feat does not restrict which armor you may wear."); +1 Str or Dex to max 20.
- **code_location**: `src/data/feats.generated.json` → Moderately Armored: `prerequisite: "Level 4+, Light Armor Training"`, description omits Efficient Fit entirely.
- **verdict**: mismatch
- **proposed_change**: Same treatment as Heavily Armored — restore the full prerequisite string and the Efficient Fit paragraph verbatim.
- **stored_data_impact**: none (text-only unless Efficient Fit is also mechanised in carried weight, which would recompute `sheet.weight` / `sheet.weightCondition`).

### No prerequisite is enforced when choosing a feat at level-up
- **txt_section**: core-rulebook.txt [page 96] "Parts of a Feat" (lines 4319–4325): "To take a feat, you must meet any prerequisite in its description unless a feature allows you to take the feat without the prerequisite."
- **rule_summary**: General feats require Level 4+ and often an ability score of 13+, an armor-training tier, or the Shield Arm; Fighting Style feats require the Fighting Style feature; Epic Boons require Level 19+.
- **code_location**: `src/features/hunter/components/character-sheet/upgradeModel.ts:64-69` `featOptionsFor` returns the **entire** `GENERAL_FEATS` array (and `[...EPIC_BOON_FEATS, ...GENERAL_FEATS]` for the Epic Boon slot) with no filtering; `CharacterSheetUpgradeFeatPage.tsx:27` lists them all in one `<select>`. The prerequisite string is only shown as text at line 29.
- **verdict**: mismatch
- **proposed_change**: Minimal, design-preserving option: keep the single `<select>` but filter `featOptionsFor` on the parseable parts of `prerequisite` — level (`Level N+`) against `earnedLevel(card)`, and `<Ability> 13+` / `<Ability> or <Ability> 13+` against `card.abilities`. The armor-training and Shield Arm prerequisites can be checked against `klass.armorTraining` and `armorClassFor(card).shieldArm`, both already available. No layout change required.
- **stored_data_impact**: none retroactively. Existing cards may hold feats they do not qualify for; do not strip them — the DM's rulings stand. Only new selections would be constrained.

### Boon-raised scores above 20 are clamped back to 20 by the sheet→card round-trip
- **txt_section**: core-rulebook.txt [pages 104–106], every Epic Boon: "Increase one ability score of your choice by 1, **to a maximum of 30**."
- **rule_summary**: Epic Boons are the only feats that lift the ability cap above 20; every other feat says "to a maximum of 20".
- **code_location**: The cap is respected on the way in (`feats.generated.json` `abilityMaximum: 30`, checked at `CharacterSheetUpgradeFeatPage.tsx:20`) and by `finalAbilities` in `CharacterAutomationProvider.tsx:115-127`, which does not clamp. But `characterAutomation.ts:291` (`structuredCardFromSheet`) does `Math.max(3, Math.min(20, …))` on every ability, so a legacy-sheet re-import silently drops a 21+ score back to 20.
- **verdict**: mismatch
- **proposed_change**: Raise the clamp in `structuredCardFromSheet` to 30 (`Math.min(30, …)`); the 20-cap belongs to the individual feats, not to the card model.
- **stored_data_impact**: Affects only level 19+ cards that have taken an Epic Boon at score 20. None are likely to exist yet; no migration needed, but any such card that has already been round-tripped has lost the point permanently and must be corrected by hand.

### Skill Expert description has a transcription typo
- **txt_section**: core-rulebook.txt [page 102] "SKILL EXPERT" (lines 4584-4586)
- **rule_summary**: "Ability Score Increase. Increase **one** ability score of your choice by 1, to a maximum of 20."
- **code_location**: `src/data/feats.generated.json` → Skill Expert description: "Increase **on** ability score of your choice by 1".
- **verdict**: mismatch
- **proposed_change**: Fix "on" → "one". (Every other feat description in the file is verbatim against the txt; this is the only typo found across all 54.)
- **stored_data_impact**: none

### Class feature text points feats at the wrong chapter
- **txt_section**: core-rulebook.txt [page 96] header "Chapter 5 / Feats"
- **rule_summary**: Feats are **Chapter 5** in the beta rulebook (Equipment is Chapter 6).
- **code_location**: `src/data/classes.ts:52, 62, 141, 151, 239, 416, 506` — feature texts read "you gain a Fighting Style feat of your choice (see chapter 4)" and "You gain an Epic Boon feat (see chapter 4)".
- **verdict**: mismatch (cosmetic, player-visible on the sheet via `features1`)
- **proposed_change**: Replace "(see chapter 4)" with "(see chapter 5)" in those class/subclass feature strings, or drop the parenthetical entirely — the app shows the feat list inline anyway. Note the Deepcaller entries (lines 330, 352) already omit it.
- **stored_data_impact**: `sheet.features1` is regenerated from `featureText()` on the next automation pass, so stored cards pick up the corrected text automatically; no migration.

### Feats that grant proficiency/Expertise/AC still require a manual note
- **txt_section**: core-rulebook.txt [pages 99–102]: Keen Mind, Observant, Skill Expert (proficiency or Expertise in a named skill), Martial Weapon Training ("You gain proficiency with Martial weapons"), Medium Armor Master ("add 3, rather than 2, to your AC if you have a Dexterity score of 16 or higher"), Defense fighting style ("+1 bonus to Armor Class"), Heavily/Moderately Armored (armor training tiers).
- **rule_summary**: Each grants a concrete, computable change to a sheet field the app already derives.
- **code_location**: `characterAutomation.ts` derives `wepMartial` from `klass.weaponProficiencies` only (line 179), `armorLight/Medium/Heavy` from `klass.armorTraining` only (175–177), `ac` from `armorClassFor(card)` (226) and skill Expertise from `sheetAutomation.expertiseSkills` only (211). No feat feeds any of them. Only Tough, Boon of Fortitude, Alert, Skilled and Listener are mechanised.
- **verdict**: missing_in_code
- **proposed_change**: Optional and larger than the rest of this file; not required for source-accuracy since the feat text is displayed and the DM can set the existing `acModifier` / `expertiseSkills` overrides. If pursued, gate each on `featNames` in `automationFor` in the same one-line style already used for Tough, and keep the reason strings naming the feat. Recommend doing this in a follow-up, separately from the data corrections above.
- **stored_data_impact**: would recompute `ac`, `armorMedium`/`armorHeavy`, `wepMartial` and skill modifiers on affected cards; players who compensated by hand through `sheet.acModifier` or `sheetAutomation.manualOverrides` would need those overrides cleared to avoid double-counting.
