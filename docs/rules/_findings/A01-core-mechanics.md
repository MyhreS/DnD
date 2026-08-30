# A01 — Core mechanics (core-rulebook.txt lines 1–580 / pages 1–16)

Scope: introduction & "What You Need", the six abilities, ability scores &
modifiers, D20 Tests (checks / saves / attacks), DC table, crits, Resistance /
Vulnerability / Immunity & Temporary HP, Advantage & Disadvantage, group checks,
Proficiency Bonus, the Skills table, Equipment Proficiencies, Expertise, Taking
Action, Initiative / Delay, Unarmed Strike.

All claims below were checked against the actual files.

---

### Ability modifier formula is now defined by the source

- **txt_section**: core-rulebook.txt [page 8] "Ability Modifiers" — "subtract 10 from the ability score, divide the result by 2, and round down", with a table from score 1 (−5) to score 30 (+10).
- **rule_summary**: modifier = floor((score − 10) / 2). Score 1 → −5; 10–11 → 0; 20–21 → +5; 30 → +10.
- **code_location**: `src/data/abilities.ts` → `abilityModifier()` (line 73) plus its doc comment on lines 71–72.
- **verdict**: match (the *code* is right; the *comment* is stale)
- **proposed_change**: replace the comment "Established app calculation. The replacement source set names Modifier fields but does not define a modifier formula." with a citation of Core Rulebook p. 8. Implementation unchanged.
- **stored_data_impact**: none.

### Ability score ceiling of 20 for a Hunter

- **txt_section**: core-rulebook.txt [page 8] "Ability Scores" table — "20 The normal maximum for a Hunter unless a feature says otherwise"; 21–29 "Extraordinary capability beyond normal human limits"; "30 The highest an ability score can normally reach".
- **rule_summary**: 20 is the Hunter cap; 21–30 exist only for powerful creatures / explicit features.
- **code_location**: `src/features/hunter/lib/abilityBuy.ts:42` — `return mode === "maduhausu" ? MADUHAUSU_FINAL_MAX : 20;` (MADUHAUSU_FINAL_MAX = 17, `src/data/abilities.ts:37`).
- **verdict**: match
- **proposed_change**: none. (Confirming a non-obvious match: the Maduhausu 17 cap is stricter than the source's 20, which the rulebook permits.)
- **stored_data_impact**: none.

### Proficiency Bonus table — code stops at level 20, source table runs to 30

- **txt_section**: core-rulebook.txt [page 11] "Pro ciency Bonus" table: up to 4 → +2, 5–8 → +3, 9–12 → +4, 13–16 → +5, 17–20 → +6, **21–24 → +7, 25–28 → +8, 29–30 → +9**.
- **rule_summary**: PB = 2 + floor((level − 1) / 4) across the whole 1–30 range.
- **code_location**: `src/lib/character.ts:19` → `proficiencyBonus()` clamps level with `Math.min(20, level)`, so it caps at +6.
- **verdict**: match for Hunters (level 1–20), mismatch for the 21–30 rows.
- **proposed_change**: the formula already generalises; the only change needed if levels above 20 are ever used is widening the clamp to `Math.min(30, level)`. Hunter progression tables (`src/data/classes.ts`) stop at 20 and `deriveSheetFromCard`/`automationFor` both clamp level to 20 as well, so **no change is required today**. Do not "fix" this speculatively.
- **stored_data_impact**: none (no stored card has level > 20).

### Skills table — 19 skills, abilities all match

- **txt_section**: core-rulebook.txt [page 11] "Skills" table (19 rows).
- **rule_summary**: Acrobatics DEX, Animal Handling WIS, Athletics STR, Blood Nature INT, Deception CHA, Eldritch Knowledge INT, Grit **CON**, Insight WIS, Intimidation CHA, Investigation INT, Medicine WIS, Old World History INT, Perception WIS, Persuasion CHA, Presence CHA, Religion INT, Sleight of Hand DEX, Stealth DEX, Survival WIS.
- **code_location**: `src/data/skills.ts` → `SKILLS` (19 entries) and `SHEET_SKILL_FIELD`.
- **verdict**: match
- **proposed_change**: none. Non-obvious confirmations: the homebrew skills **Grit (Constitution)**, **Blood Nature**, **Eldritch Knowledge**, **Old World History** and **Presence** are all present with the correct abilities, and no extra/removed skill exists. `src/data/abilities.ts` ABILITIES descriptions also list the correct skills per ability.
- **stored_data_impact**: none.

### Expertise doubles the Proficiency Bonus (applied once)

- **txt_section**: core-rulebook.txt [page 12] "Expertise" — "double your Proficiency Bonus for that check… You still add your Proficiency Bonus only once before doubling it."
- **rule_summary**: skill/tool with Expertise → ability modifier + (2 × PB). Never more than once per check.
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:211–218` — `const multiplier = expertise.has(skill.name) ? 2 : proficient ? 1 : 0;` then `abilityModifier(...) + prof * multiplier`. Expertise selection & limit: `src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx:153,263–267`; UI `CharacterSheetUpgradeChoices.tsx:39` restricts options to already-proficient skills.
- **verdict**: match
- **proposed_change**: none. (Non-obvious match worth recording: Expertise is correctly restricted to skills the hunter is already proficient in, which is what "Expertise represents exceptional mastery of a proficiency" requires.)
- **stored_data_impact**: none. `sheetAutomation.expertiseSkills` (`src/types.ts:458`) stays valid.

### Saving throw proficiency comes from the class

- **txt_section**: core-rulebook.txt [page 9] "Saving Throw Proficiencies" — "Each class grants proficiency in certain saving throws."
- **rule_summary**: proficient save = ability modifier + PB; otherwise ability modifier only.
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:199–207` and `src/features/hunter/lib/deriveSheetFromCard.ts:47–56` (both use `klass.savingThrows.includes(key)`).
- **verdict**: match
- **proposed_change**: none.
- **stored_data_impact**: none.

### Rite save DC / Rite attack bonus

- **txt_section**: core-rulebook.txt [page 9] "Difficulty Class" (saves) — "A Rite's save DC is calculated using the Rite performer's relevant ability and Proficiency Bonus"; [page 10] "Attack Rolls" — "Rite attacks add your Proficiency Bonus as part of the Rite attack bonus", and "Intelligence — Rite attack when Intelligence is the performer's Rite Performing ability".
- **rule_summary**: Rite DC and Rite attack both derive from the performing ability + PB; Intelligence is the Deepcaller's performing ability.
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:250–255` — `riteAbility` = "Intelligence", `riteDC` = `8 + prof + riteMod`, `riteAttack` = `prof + riteMod`.
- **verdict**: match
- **proposed_change**: none. Note: pages 1–16 never state the "8 +" base of the DC; if a later page (outside this range) gives an explicit formula, the agent covering it should confirm the 8. Flagging, not changing.
- **stored_data_impact**: none.

### Initiative is a Dexterity check

- **txt_section**: core-rulebook.txt [page 15] "Initiative" — "each participant makes a Dexterity check called an Initiative roll. Act from the highest total to the lowest."
- **rule_summary**: 1d20 + Dexterity modifier, descending order.
- **code_location**: `src/lib/character.ts:53` `initiativeMod()`; `src/features/hunter/lib/deriveSheetFromCard.ts:81`; `src/features/hunter/lib/characterAutomation.ts:220` (adds the Alert feat's PB and a custom sheet modifier); `src/features/play/store/combatStore.ts:155,217,261` `rollD20() + p.dexMod`, ordered by `initiativeOrder()` (line 21, descending).
- **verdict**: match
- **proposed_change**: none. The stale comment on `src/lib/character.ts:52` ("in the established Hunter model") can now cite Core Rulebook p. 15 instead.
- **stored_data_impact**: none.

### Surprise: a surprised creature rolls Initiative with Disadvantage — not implemented

- **txt_section**: core-rulebook.txt [page 15] "Initiative" — "compare each observer's Passive Perception to the opposing Dexterity (Stealth) results. A creature unaware of every opposing threat is surprised and rolls Initiative with Disadvantage."
- **rule_summary**: surprise no longer skips a turn; it imposes Disadvantage on the Initiative roll only (roll two d20s, take the lower).
- **code_location**: `src/features/play/store/combatStore.ts:16` `rollD20()` and `startEncounter`/`addPcs` (lines ~150–280) — a single d20 per combatant; no surprise concept anywhere in `src/features/play/**` or `src/features/game/**`.
- **verdict**: missing_in_code
- **proposed_change**: minimal and optional — add a `surprised?: boolean` flag on the `PcSeed`/`MonsterInput` inputs and a `rollD20WithDisadvantage()` (`Math.min(rollD20(), rollD20())`) used when set, surfaced as a checkbox in the existing `StartBattleDialog`. The DM can already type an initiative value manually via `BattleCombatantRow`, so this is a convenience, not a correctness gap in stored data.
- **stored_data_impact**: none (combatants are transient encounter records, not `/characters/{id}`).

### Initiative ties are resolved by the players / GM, not alphabetically

- **txt_section**: core-rulebook.txt [page 15] — "If players tie, they decide their order. The GM decides ties between monsters and ties between a monster and a player character."
- **rule_summary**: tie-breaks are a table decision, not a deterministic rule.
- **code_location**: `src/features/play/store/combatStore.ts:21` `initiativeOrder()` — `b.initiative - a.initiative || a.name.localeCompare(b.name)`.
- **verdict**: mismatch (soft)
- **proposed_change**: none required — the alphabetical tie-break is only a stable display order, and the DM can already nudge an initiative value up or down in `BattleCombatantRow` (lines 57–62, 132–149) to enact the table's decision. Recommend leaving as-is rather than adding UI.
- **stored_data_impact**: none.

### Delay — new turn-order rule with no app support

- **txt_section**: core-rulebook.txt [page 15] "Delay" — at the start of your turn, before anything else, you may Delay without using an action; harmful effects that occur on your turn still resolve and beneficial effects that would expire during it end; you then leave Initiative. You may take the delayed turn immediately after another creature finishes its turn, which **permanently** moves you to that Initiative position. No Reactions while delayed, no interrupting another creature's turn. If you stay delayed a whole Initiative cycle the turn is lost and you return to your original position. "Delay moves your entire turn. Ready prepares one specific Reaction and does not change your Initiative."
- **rule_summary**: as above — a permanent re-ordering of a combatant within the round.
- **code_location**: ABSENT — no `delay` concept in `src/features/play/store/combatStore.ts`, `src/features/game/components/SessionBattleView.tsx`, `BattleCombatantRow.tsx`, or `src/api/combat.ts` (the only `delay` hits in `src/` are `src/lib/subscribeRetry.ts`, unrelated).
- **verdict**: missing_in_code
- **proposed_change**: minimal, fitting the existing row controls — a "Delay" button on `BattleCombatantRow` for the active combatant that sets its `initiative` to just below the currently-acting combatant (the permanent move the rule describes) and advances the turn. No new screen or layout. Lower priority than the data/derivation findings above.
- **stored_data_impact**: none.

### Unarmed Strike is a defined attack with no catalog entry

- **txt_section**: core-rulebook.txt [page 15] "Unarmed Strike" — "make a melee attack roll using your Strength modifier and Proficiency Bonus. On a hit, the target takes Bludgeoning damage equal to 1 + your Strength modifier, to a minimum of 1 damage." Also [page 16] Main Actions: Grapple is "an option of the Unarmed Strike Attack Action".
- **rule_summary**: attack = STR mod + PB; damage = 1 + STR mod Bludgeoning, minimum 1.
- **code_location**: `src/data/weapons.ts` — `WEAPONS` contains dagger, handaxe, sickle, greataxe, greatsword, longsword, scimitar, shortsword, hunter-rifle, pistol, hunter-cleaver. **No Unarmed Strike entry**, although class features throughout `src/data/classes.ts` (Improved Critical, Blood Frenzy, Brutal Strike, Retaliation, One Form…) repeatedly reference Unarmed Strikes.
- **verdict**: missing_in_code
- **proposed_change**: add one row to `src/data/weapons.ts`, e.g. `"unarmed-strike": { damage: "1 + STR", damageType: "Bludgeoning", properties: "Always available; Grapple and Shove are options of this attack", mastery: "—", attack: "Melee" }`, so the existing weapon-reference panel (`AppWeaponReference.tsx`) can show it. No layout change.
- **stored_data_impact**: none — a catalog addition; no field on `/characters/{id}` changes.

### Weapon proficiency adds PB to attack rolls only, never damage

- **txt_section**: core-rulebook.txt [page 12] "Equipment Proficiencies — Weapons": "proficiency allows you to add your Proficiency Bonus to attack rolls made with it. Weapon proficiency does not add extra damage unless a rule says otherwise."
- **rule_summary**: PB → attack roll; never damage.
- **code_location**: `src/features/hunter/components/appsheet/AppWeaponReference.tsx` → `bonusesFor()` lists **damage** bonuses only (ability modifier, Hunter's Mark, Sneak Attack, Brutal Strike, maneuvers, feats) and never adds PB to damage. The weapon rows' "Attack bonus" is a free-text field the player types (`InventoryAddForms.tsx:65`, `CharacterAutomationProvider.tsx:541`).
- **verdict**: match (nothing contradicts the rule), with an optional gap
- **proposed_change**: none required. Optionally, prefill the free-text "Attack bonus" placeholder with the computed `PB + STR/DEX modifier` for proficient weapons; this is an enhancement, not a correction, and touches a manual field — leave unless asked.
- **stored_data_impact**: none.

### Tool proficiency: skill + tool ⇒ PB once **and Advantage**

- **txt_section**: core-rulebook.txt [page 12] "Equipment Proficiencies — Tools": "Tool proficiency allows you to add your Proficiency Bonus to an ability check made with that tool. If both a relevant skill and tool proficiency apply, add your Proficiency Bonus once and make the check with Advantage."
- **rule_summary**: overlapping skill + tool proficiency = single PB + Advantage on the check.
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:222–223` — tools are collected from class/background/Skilled feat and written to the sheet's `tools` field as a plain comma-joined string; no rule text and no interaction with skill modifiers.
- **verdict**: missing_in_code (reference text only)
- **proposed_change**: minimal — extend the existing `reasons` string for the `tools` field to state the rule ("A tool proficiency adds your Proficiency Bonus to checks with that tool; when a skill also applies, add it once and roll with Advantage."). It surfaces in the sheet's existing "why" affordance with no new UI.
- **stored_data_impact**: none.

### Passive Perception derivation

- **txt_section**: core-rulebook.txt [page 15] (Initiative/surprise) and [page 13] (chase escape) both use Passive Perception as the contested number.
- **rule_summary**: the source uses Passive Perception but does not restate its formula in pages 1–16.
- **code_location**: `src/features/hunter/lib/characterAutomation.ts:221` — `10 + WIS modifier + (Perception proficiency ? PB : 0) + custom modifier`; same in `deriveSheetFromCard.ts:82–86`; displayed at `CharacterSheetHome.tsx:99` / `CharacterSheetDerivedStat.tsx:35`.
- **verdict**: match
- **proposed_change**: none. Note that Expertise in Perception is **not** doubled into Passive Perception by the code (only single PB), and the source pages in this range do not settle that; leave as-is unless a later page states otherwise.
- **stored_data_impact**: none.

### Advantage / Disadvantage: no cancellation or non-stacking helper anywhere

- **txt_section**: core-rulebook.txt [page 10] "Advantage and Disadvantage" — roll two d20s, take higher/lower; multiple sources of either do **not** stack; if both apply they cancel and you roll one d20 "regardless of how many sources of either apply"; a reroll/replace effect may only be applied to one of the two dice, your choice.
- **rule_summary**: as above.
- **code_location**: ABSENT as a mechanic — Advantage/Disadvantage appear only as prose inside `src/data/classes.ts`, `src/data/feats.generated.json`, `src/data/weapons.ts` properties, `src/data/armor.ts`, `src/data/items.ts` and `src/lib/inventory.ts`. `src/features/play/store/combatStore.ts` has only a bare `rollD20()`.
- **verdict**: missing_in_code
- **proposed_change**: none. The app does not roll attacks or checks for players (only the initiative roll), so there is nothing to correct. Record it so no one adds a stacking-advantage roller later. If the Surprise finding above is implemented, reuse a single `rollD20({ advantage, disadvantage })` helper that implements the cancel rule.
- **stored_data_impact**: none.

### Critical hits, Resistance/Vulnerability/Immunity and Temporary HP are not modelled

- **txt_section**: core-rulebook.txt [page 10] — "A natural 20 on an attack roll always hits and is a Critical Hit; roll one additional set of every damage die normally rolled for that attack and add flat modifiers only once. A natural 1 always misses." And: "Resistance halves the stated damage, Vulnerability doubles it, and Immunity reduces it to 0; identical modifiers do not stack, Resistance and Vulnerability cancel, and you apply them after other additions and reductions, rounding down. Temporary Hit Points are lost before Hit Points, cannot be restored, do not stack, and end when depleted or when their rule says so. Natural 20s and 1s do not automatically affect ability checks or saving throws."
- **rule_summary**: as above.
- **code_location**: damage in the combat tracker is applied as a raw number (`src/api/combat.ts`, `BattleCombatantRow.tsx`); Temporary HP is a manual field only (`CharacterSheetHealth.tsx:12–17` "Temporary HP sits above your normal HP.", `CharacterSheetHome.tsx:71,103`). Resistance/Immunity exist only as class-feature prose in `src/data/classes.ts`.
- **verdict**: missing_in_code (deliberately — the app is a tracker, not a rules engine)
- **proposed_change**: none for the combat math. One cheap, in-place improvement: the Temporary HP note in `CharacterSheetHealth.tsx` currently says only "Temporary HP sits above your normal HP." — the source adds that temp HP is lost before HP, **cannot be restored, does not stack**, and ends when depleted. Extend that one `note` string to say so. No layout change.
- **stored_data_impact**: none — `hpTemp` stays a manual sheet field.

### DC table, group checks and the Madness Die have no app surface

- **txt_section**: core-rulebook.txt [page 9] "Typical Di culty Classes" (Very Easy 5, Easy 10, Medium 15, Hard 20, Very Hard 25, Nearly Impossible 30); [page 10] "Ability Checks as a Group" (everyone rolls the same DC; if at least half the group succeeds, **rounded up**, the group succeeds); [page 6] the Madness Die (d8 with 3 blank / 3 star / 2 eye faces; substitute a normal d8 as 1–3 Blank, 4–6 Star, 7–8 Eye).
- **rule_summary**: as above.
- **code_location**: ABSENT — no hits for "Difficulty Class", "Nearly Impossible", "group check" or "Madness Die" anywhere in `src/`. The app tracks a numeric `madness` value (`src/lib/character.ts:148–150`, `emptyCard`) but nothing about the die.
- **verdict**: missing_in_code
- **proposed_change**: none from this agent — these are GM-table reference material, and the app's rules-reference surface is the Codex (`src/features/codex/components/CodexPage.tsx`), which serves the source documents rather than hand-copied summaries. Adding a hand-maintained DC table would violate the repo's "author the value once" rule in CLAUDE.md. Record only so it is not mistaken for an omission.
- **stored_data_impact**: none.

### Terminology: "Main Action" / "Bonus Action" / "Reaction"

- **txt_section**: core-rulebook.txt [page 13] "Taking Action" and [page 15–16] "Main Actions" — "you can move up to your Speed, take one **Main Action**, and take one Bonus Action if a rule grants one"; "Whenever a rule says you use an action to activate a feature, it means a Main Action unless it explicitly says Bonus Action or Reaction."
- **rule_summary**: the beta names the standard action a **Main Action**.
- **code_location**: `src/data/classes.ts` feature prose uses "an action" / "as an Action" (e.g. lines 161, 353) rather than "Main Action". No UI element names the action economy.
- **verdict**: match in effect (the source explicitly says a bare "action" means a Main Action), mismatch in wording only.
- **proposed_change**: none. Class feature text is transcribed from the class chapters; the agent covering those pages should align the wording from the source rather than have this agent rewrite prose it did not verify.
- **stored_data_impact**: none.
