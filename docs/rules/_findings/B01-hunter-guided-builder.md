# B01 — Hunter guided builder (Direction B: code/UI → txt)

Scope: every user-facing step, field, option, label, helper text and validation of
the guided character-creation / upgrade flow, plus its supporting logic.

Entry points walked:

- `src/features/hunter/components/CharacterPage.tsx` → `CharacterView.tsx` →
  `components/character-sheet/CharacterSheetCreationSheet.tsx`
- `components/character-sheet/CharacterSheetUpgrade.tsx` (the step machine — the
  same component drives both "Create hunter" and "Upgrade")
- `components/character-sheet/CharacterSheetUpgradeChoices.tsx`,
  `CharacterSheetGuidedChoices.tsx`, `CharacterSheetUpgradeFeatPage.tsx`,
  `CharacterSheetWeaponMasteryChoices.tsx`, `CharacterSheetHunter.tsx`
- `components/appsheet/AppAbilitiesSection.tsx` (the creation point-buy page)
- `components/papersheet/CharacterAutomationProvider.tsx` (all builder state)
- `lib/abilityBuy.ts`, `lib/insightAward.ts`, `lib/levelUpVitals.ts`,
  `lib/legacyMigration.ts`, `src/lib/startingEquipment.ts`, `src/lib/insight.ts`,
  `src/lib/character.ts`, `src/lib/ability-keys.ts`

The builder's step order is, in code order: Automatic changes → Name → Class →
Background → Ability scores → Background abilities → Class skills → Skilled feat →
Subclass → Expertise → Weapon mastery → Prepared Whispers → one page per level
feature → Armor & carrying → Review. The source's five creation steps (Class,
Background, Ability Scores, Armor, Fill In Details) are all present and in the
same relative order — **the flow itself matches the beta and needs no redesign.**

Findings below are ordered roughly by step.

---

### Confirmed match — the five creation steps and their order

- **txt_section**: core-rulebook.txt [page 30] Chapter 2 "Create Your Character": "1: Choose a Class… 2: Determine a Background… 3: Determine Ability Scores… 4: Select and Equip Armor… 5: Fill in Details."
- **rule_summary**: Five ordered steps, no species/ancestry step, no alignment step, no starting-gold-roll step.
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetUpgrade.tsx:95–110` (the `steps` array).
- **verdict**: match
- **proposed_change**: none. Recorded because the builder presents no step the beta dropped: there is no ancestry, alignment, deity, or "roll for stats" page anywhere in the flow. Nothing to remove at the step level.
- **stored_data_impact**: none.

### Confirmed match — standard point buy (27 points, 8–15) and the alternative 57-point table

- **txt_section**: core-rulebook.txt [page 32] "ASSIGN ABILITY SCORES": "You have 27 points to spend"; "no Ability Score can be higher than 15"; Ability Score Point Costs 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9. Plus "Alternative point buy… you instead have 57 points… they will go up one cost-column for each purchase of the same score… your score total for one ability at the end of creating your level one character is max 17", with the "Ability Score Point Costs V2" table running 3–16, columns First / Second / Third+, and 16 marked "Too expensive" in the third column.
- **rule_summary**: Two legal buy systems, both fully tabulated.
- **code_location**: `src/data/abilities.ts:19–75` (`POINT_BUY_BUDGET/MIN/MAX/POINT_COST`, `MADUHAUSU_*`, `maduhausuSpent`), consumed by `src/features/hunter/lib/abilityBuy.ts` and rendered by `AppAbilitiesSection.tsx:52–90`.
- **verdict**: match
- **proposed_change**: none. Every number is byte-correct, including the escalating V2 columns (14 → 12/14/17, 15 → 14/18/23, 16 → 20/26/illegal) and the level-1 cap of 17.
- **stored_data_impact**: none.

### The alternative buy mode is labelled "Maduhausu", a name absent from the beta

- **txt_section**: core-rulebook.txt [page 32] — the option is called "**Alternative point buy**" and its table "**Ability Score Point Costs V2**". The string "Maduhausu" does not occur anywhere in `docs/rules/*.txt`.
- **rule_summary**: The mode exists and its numbers are right; only the app's name for it has no source.
- **code_location**: `src/features/hunter/components/appsheet/AppAbilitiesSection.tsx:57` — `{mode === "pointbuy" ? "Standard" : "Maduhausu"}`; constants named `MADUHAUSU_*` in `src/data/abilities.ts:36–52`; `BuyMode` union in `src/features/hunter/lib/abilityBuy.ts:14`.
- **verdict**: mismatch (label only)
- **proposed_change**: change the button's visible label to `"Alternative"` (subtitle stays `57 points`). Keep the `"maduhausu"` union value and the constant names so stored records need no migration; this is a one-word copy edit inside the existing two-button group.
- **stored_data_impact**: none — `HunterCard.abilityMode` keeps the literal `"maduhausu"`. Do **not** rename the stored value; a rename would invalidate every existing alternative-buy hunter.

### Confirmed match — background ability step (+2/+1 or +1/+1/+1, cap 20 / 17)

- **txt_section**: core-rulebook.txt [page 32] "ADJUST ABILITY SCORES": "Your background lists three abilities; increase one of those scores by 2 and a different one by 1, or increase all three by 1. Again; none of these increases can raise a score above 20."
- **rule_summary**: Exactly three points, in one of two legal patterns, over the background's three listed abilities, hard-capped at 20 (17 under the alternative buy).
- **code_location**: `src/features/hunter/lib/abilityBuy.ts:76–103` (`backgroundBonusSummary`, `pattern === "1,2" || pattern === "1,1,1"`), `finalCreationMaximum()` at line 41; UI `CharacterSheetGuidedChoices.tsx:9–52` with per-ability `+0/+1/+2` buttons disabled past the cap.
- **verdict**: match
- **proposed_change**: none. The helper text "Place +2 and +1 on different abilities, or +1 on all three" is a faithful paraphrase.
- **stored_data_impact**: none.

### Confirmed match — class step data (all six classes, hit die, primary ability, Max Sanity, skill choices)

- **txt_section**: core-rulebook.txt [pages 30–31] "Class Overview Part 1" and "Part 2".
- **rule_summary**: Brute STR or DEX / d10; Scout DEX and WIS / d10; Stalker DEX / d8; Deepcaller INT / d6; Bloodbound CON / d12; Warden WIS and CHA / d10. Skill choices: Brute choose 2 of 6, Scout choose 3 of 6, Stalker choose 2 of 9, Deepcaller choose 2 of 7, Bloodbound choose 2 of 7, Warden choose 2 of 6.
- **code_location**: `src/data/classes.ts` (`primaryAbility`, `hitDie`, `maxSanity`, `skillChoices`), surfaced by `CharacterSheetUpgradeChoices.tsx:201` (`d{hitDie} hit die · {primaryAbility} · {maxSanity} sanity`) and `:210` (class-skills page).
- **verdict**: match
- **proposed_change**: none. Every count and every option list matches the Class Overview verbatim, including the homebrew skills Grit, Blood Nature, Eldritch Knowledge, Old World History and Presence. The `classFocus` badge in `CharacterSheetGuidedChoices.tsx:26` (`primaryAbility.split(/\W+/)`) correctly handles the two-ability strings "DEX and WIS" and "WIS and CHA".
- **stored_data_impact**: none.

### The Skilled-feat step offers three tool proficiencies the beta no longer defines

- **txt_section**: core-rulebook.txt [pages 114–115] "Tools": Artisan's Tools are **Alchemist's Supplies, Carpenter's Tools, Cultist's Tools, Poisoner's Kit, Smith's Tools**; Other Tools are **Blood-drainer's Tools, Navigator's Tools, Thieves' Tools**. Eight tools total. "Brewer's Supplies", "Mason's Tools" and "Tinker's Tools" appear nowhere in the beta.
- **rule_summary**: The Skilled origin feat (core-rulebook.txt [page 92]) grants "proficiency in any combination of three skills or tools of your choice" — so its option list must be the 19 skills plus these eight tools, and nothing else.
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetUpgradeChoices.tsx:211` — `options={[...SKILLS.map(s => s.name), ...TOOL_PROFICIENCIES]}`; `TOOL_PROFICIENCIES` is `src/data/characterOptions.ts:5–17` (11 entries). Also re-rendered as reference cards by `CharacterSheetHunter.tsx` "Tools" panel via `TOOL_DETAILS`.
- **verdict**: mismatch — three dead options presented as legal choices in the builder
- **proposed_change**: delete `"Brewer's Supplies"`, `"Mason's Tools"` and `"Tinker's Tools"` from `TOOL_PROFICIENCIES` and their three entries from `TOOL_DETAILS`. No UI change: the same `ChoiceList` renders a shorter list. (Verified non-obvious match: the eight survivors all carry the source's exact Ability — Alchemist's INT, Carpenter's STR, Cultist's INT, Poisoner's INT, Smith's **DEX**, Blood-drainer's CON, Navigator's WIS, Thieves' DEX.)
- **stored_data_impact**: `/characters/{id}.featSkills` may contain any of the three dead strings (Skilled pickers), and `background`-granted tools flow through `A13`'s Cultist/Weaponsmith/Church-Missionary corrections. Migration: strip those three values from `featSkills`; where the value came from a background rather than a player pick, remap per A13 (Cultist `Mason's Tools`→`Cultist's Tools`, Weaponsmith `Tinker's Tools`→`Smith's Tools`, Church Missionary: drop `Brewer's Supplies`). Removing a `featSkills` entry re-opens the "Skilled feat" pending choice (3 required), which is the correct outcome — the player must re-pick. Nothing derived recomputes from tools.

### The weapon-mastery step offers 11 weapons; the beta's weapon table has 29

- **txt_section**: core-rulebook.txt [page 111] "Weapons" — Simple Melee: Club, Dagger, Greatclub, Handaxe, Javelin, Light Hammer, Mace, Sickle, Spear. Simple Ranged: Throwing Knife. Martial Melee: Battleaxe, Flail, Glaive, Greataxe, Greatsword, Halberd, Longsword, Maul, Morningstar, Pike, Rapier, Scimitar, Shortsword, Trident, Warhammer, War Pick, Whip. Martial Ranged: Hunter Rifle, Pistol. Each row prints a Mastery property.
- **rule_summary**: Weapon Mastery is chosen from "kinds of Simple or Martial weapons" — i.e. from the 29 rows of this table.
- **code_location**: `src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx:172–180` builds `masteryWeapons` from `ITEMS.filter(item => item.category === "Weapon")`; `src/data/items.ts` defines only 11 weapons; `src/data/weapons.ts:9–21` (`WEAPON_FACTS`) has facts for those 11.
- **verdict**: mismatch — 18 masterable weapons are unselectable in the builder
- **proposed_change**: add the 18 missing rows to `src/data/items.ts` and `WEAPON_FACTS` using the page-111 table verbatim (name, damage, damage type, properties, mastery, weight, carrying category). The mastery page needs no markup change — `CharacterSheetWeaponMasteryChoices.tsx` maps over `automation.masteryWeapons` and already renders every field it would need. The eight mastery descriptions in `WEAPON_MASTERY_DESCRIPTIONS` (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) already cover all masteries the table uses — confirmed match, nothing to add there.
- **stored_data_impact**: none for existing records (`sheetAutomation.weaponMasteries` stores weapon **names** as free strings; adding catalog rows only widens what can be picked). Optional backfill: none.

### The mastery step still offers "Hunter Cleaver", which is not in the beta at all

- **txt_section**: `grep -i cleaver docs/rules/*.txt` → no match. The Scout's Starting Equipment at core-rulebook.txt [page 56] lists a **Shortsword**, not a Hunter Cleaver (see A08).
- **rule_summary**: The Hunter Cleaver is not a weapon, an item, or class equipment in the beta.
- **code_location**: `src/data/items.ts:72` (`id: "hunter-cleaver"`), `src/data/weapons.ts:20` (`damage: "—", mastery: "—"`), and `CharacterAutomationProvider.tsx:169` where `hunter-cleaver` is hard-coded into `meleeWeaponIds`. It renders on the mastery page as `DM-set stats · Melee` with the mastery label `DM-set`.
- **verdict**: no_longer_a_rule
- **proposed_change**: remove `hunter-cleaver` from `meleeWeaponIds` so it stops appearing as a mastery option (a weapon with mastery `—` can never be mastered). Keep the *item* row in `src/data/items.ts` so hunters who already carry one keep a named inventory entry — deleting the item would render their gear as an unknown id.
- **stored_data_impact**: `/characters/{id}.inventory` may hold `{itemId: "hunter-cleaver"}` (every Scout created before this change — the old starting kit granted one). Per A08: do **not** delete a player-carried item; leave the inventory entry. `sheetAutomation.weaponMasteries` may contain the string `"Hunter Cleaver"` — strip it and re-open the mastery choice for that hunter.

### The Stalker's mastery list is a hard-coded 6-item allowlist that contradicts their proficiency

- **txt_section**: core-rulebook.txt [page 31] Class Overview Part 2, Hunter Stalker: Weapon Proficiencies = "**Simple weapons and** Martial weapons that have the Finesse or Light property". core-rulebook.txt [page 60] LEVEL 2: WEAPON MASTERY: "two kinds of weapons of your choice **with which you have proficiency**".
- **rule_summary**: A Stalker may master any Simple weapon (all nine melee + Throwing Knife) plus any Finesse/Light Martial weapon (Rapier, Scimitar, Shortsword, Whip).
- **code_location**: `CharacterAutomationProvider.tsx:165–176` — `finesseOrLightIds = {shortsword, scimitar, sickle, handaxe, dagger, pistol}` and `if (klass?.id === "stalker") return finesseOrLightIds.has(item.id)`.
- **verdict**: mismatch — the allowlist omits every Simple weapon that isn't Finesse/Light (Club, Greatclub, Javelin, Light Hammer, Mace, Spear, Throwing Knife) and wrongly includes **Pistol**, a Martial Ranged weapon with neither Finesse nor Light.
- **proposed_change**: derive the filter instead of listing ids: keep an item when its catalog row is a Simple weapon, or when it is Martial and `WEAPON_FACTS[id].properties` matches `/Finesse|Light/`. This requires a `weaponClass: "Simple" | "Martial"` field on the weapon facts, which the page-111 table supplies for free (its four section headings). Same for the Bloodbound branch below.
- **stored_data_impact**: an existing Stalker may have `sheetAutomation.weaponMasteries` containing `"Pistol"`, which is now illegal. Migration: for each Stalker card, drop any mastery whose weapon fails the derived proficiency test, then re-open the mastery choice. No derived field recomputes.

### The Bloodbound's melee mastery list is likewise hard-coded and short

- **txt_section**: core-rulebook.txt [page 87] LEVEL 12: WEAPON MASTERY: "the mastery properties of two kinds of **Simple or Martial Melee** weapons of your choice. Whenever you finish a Long Rest, you can practice weapon drills and **change one of those weapon choices**."
- **rule_summary**: Any Simple or Martial *melee* weapon (24 of the 29 rows) qualifies; retraining is limited to **one** choice per Long Rest, not all of them.
- **code_location**: `CharacterAutomationProvider.tsx:161–178` — `meleeWeaponIds` is 9 hard-coded ids; the retraining wording lives in `CharacterSheetWeaponMasteryChoices.tsx:295`: "Your class lets you retrain mastery choices after a Long Rest."
- **verdict**: mismatch (both the option set and the helper text)
- **proposed_change**: replace `meleeWeaponIds` with `WEAPON_FACTS[id].attack === "Melee"` once the full weapon table exists. Change the helper's second sentence to be class-accurate — the Brute/Scout/Stalker wording is "change the kinds of weapons you chose", the Bloodbound's is "change one of those weapon choices"; a single line keyed off `klass.id` fits the existing `ChoiceIntro` `help` prop with no layout change.
- **stored_data_impact**: none (only widens the option set).

### Confirmed match — Expertise counts per class and the "already-trained only" restriction

- **txt_section**: core-rulebook.txt [page 60] Scout LEVEL 2: EXPERTISE ("Choose one of your skill proficiencies with which you lack Expertise") and the class tables granting Expertise again at Scout 9, Stalker 1 and 6, Warden 2 and 9. core-rulebook.txt [page 12] "Expertise": "double your Proficiency Bonus for that check".
- **rule_summary**: Scout 1 at L2 then 2 more at L9; Stalker 2 at L1 then 2 more at L6; Warden 2 at L2 then 2 more at L9. Expertise may only be placed on a skill you are already proficient in.
- **code_location**: `CharacterAutomationProvider.tsx:145–153` (`expertiseLimit`); option list `CharacterSheetUpgradeChoices.tsx:220` filters `SKILLS` by `card.skillProficiencies.includes(...)`; helper text `CharacterSheetGuidedChoices.tsx:82` states the +PB-twice effect.
- **verdict**: match
- **proposed_change**: none. Recorded as a non-obvious confirmation: the per-class asymmetry (1+2 / 2+2 / 2+2) is encoded correctly rather than assuming a uniform two-per-grant, and the option list is correctly narrowed to trained skills.
- **stored_data_impact**: none.

### A Deepcaller can never enter the Hunter Zealot Prestige Class through the builder

- **txt_section**: core-rulebook.txt [page 70] Hunter Deepcaller Features, level 3: "Hunter Zealot Prestige Class (**optional**), Opened Mind"; [page 71] "At 3rd level, you **may** enter the Path of the Zealot Prestige Class… A Prestige Class is an alternative progression path that replaces your existing class path."
- **rule_summary**: At level 3 a Deepcaller chooses, once, to enter the Zealot path or stay a Deepcaller.
- **code_location**: `src/data/classes.ts:290` sets `subclassOptional: true`; `src/features/hunter/lib/characterAutomation.ts:153` therefore never sets `pending.subclass` for a Deepcaller; `CharacterSheetUpgrade.tsx:86–87` gates the subclass page on `needsSubclass || subclassChanged`, both false, so **no subclass step is generated**. The level-3 progression row "Hunter Zealot Prestige Class (optional)" instead falls through to the generic feature page at `:108`, and `RECORDED_CHOICE` (`upgradeModel.ts:16`) does not match it, so `choice` is `false` and the page is read-only prose. `CharacterSheetHunter.tsx` shows "Choose during upgrade" for the subclass, which for a Deepcaller never happens.
- **verdict**: mismatch — an opt-in the rules grant is unreachable in the UI
- **proposed_change**: keep `subclassOptional` (it correctly stops the flow from *forcing* the choice) but make the subclass page *available* when the class has subclasses and the level qualifies: change `choicePages.subclass` in `CharacterSheetUpgrade.tsx:87` to also be true when `klass.subclassOptional && target >= 3 && !card.subclassId`. The existing `CharacterSheetUpgradeChoices` `kind === "subclass"` page already renders a `Choose...` empty option, so leaving it unselected keeps the hunter a plain Deepcaller and the Next button stays enabled (no pending choice is registered). No new component, no layout change.
- **stored_data_impact**: none. `subclassId` stays `null` for Deepcallers who don't opt in; `"hunter-zealot"` is already a valid stored value.

### The Prepared Whispers step ignores the Zealot's extra and always-prepared Whispers

- **txt_section**: core-rulebook.txt [page 76] LEVEL 3: ZEALOT WHISPERS — "You prepare a number of Whispers equal to the number shown for a Hunter Deepcaller of your level, **plus one additional Whisper**", and you may choose from "both normal Whispers and Level 1 Hunter Deepcaller Rites". [pages 76–77] CARVED ELDRITCH STRIKE and CARVED ARMOR OF THE DROWNED STAR: each "does not count against the number of Whispers you can prepare".
- **rule_summary**: A Zealot's prepared count is the Deepcaller table value **+1**; Eldritch Strike and Armor of The Drowned Star are always prepared and free; Level 1 Rites become eligible picks.
- **code_location**: `CharacterAutomationProvider.tsx:181–186` — `whisperLimit` reads only `progression.extras["Prepared Whispers"]` plus `background?.feat === "Listener" ? 1 : 0`; the picker `CharacterSheetUpgradeChoices.tsx:222` maps only `DEEPCALLER_WHISPERS` (the six from whispers-sheet.txt).
- **verdict**: mismatch (three separate omissions)
- **proposed_change**: in `whisperLimit`, add `+1` when `card.subclassId === "hunter-zealot" && card.level >= 3`; in the picker, when the hunter is a level-3+ Zealot, append `DEEPCALLER_RITES.filter(r => r.level === 1)` to the option list and render Eldritch Strike / Armor of The Drowned Star as pre-checked, disabled rows that do not count toward the limit. All of this fits the existing `ChoiceToggle` list — no new page. (See A10 for the same gap on the sheet side.)
- **stored_data_impact**: `/characters/{id}.preparedWhispers` for Zealots is currently under-filled by 1–3 slots. Backfill: for cards with `subclassId === "hunter-zealot"` and `level >= 3`, ensure `"eldritch-strike"` and `"armor-of-the-drowned-star"` are present; no value needs remapping and no existing id becomes invalid (all six whisper ids in `codex.generated.json` — Eldritch Blast, Eldritch Strike, Eldritch Lightning, Mindcrack, Minor Illusion, Third Hand — match whispers-sheet.txt exactly).

### Confirmed match — the six Whispers and their step data

- **txt_section**: whispers-sheet.txt — ELDRITCH BLAST, ELDRITCH STRIKE, ELDRITCH LIGHTNING, MINDCRACK, MINOR ILLUSION, THIRD HAND.
- **rule_summary**: Six Whispers, each with Performing / Range / Duration and an upgrade line.
- **code_location**: `src/data/characterOptions.ts:87` (`DEEPCALLER_WHISPERS`) built from `codex.generated.json.whispers`; rendered at `CharacterSheetUpgradeChoices.tsx:222` as `${performing} · ${range} · ${damage} ${damageType}`.
- **verdict**: match
- **proposed_change**: none. Non-obvious confirmation: `damage`/`damageType` are *derived at read time* by `damageDetails()` (`characterOptions.ts:56–67`) rather than stored, and its type list covers every damage type the six Whispers use (Eldritch Power, Lightning, Mind); Eldritch Strike is special-cased to "Weapon damage". The meta line renders correctly for all six.
- **stored_data_impact**: none.

### The Listener origin feat is modelled as a prepared slot, not a known Whisper

- **txt_section**: core-rulebook.txt [page 91] LISTENER, Origin Feat: "**One Whisper.** You learn one whisper of your choice. Intelligence Rite Performing ability for this feat's Whisper."
- **rule_summary**: Listener grants one *learned* Whisper — a fixed pick, not a slot re-chosen on every upgrade.
- **code_location**: `CharacterAutomationProvider.tsx:186` — `+ (background?.feat === "Listener" ? 1 : 0)` folded into `whisperLimit`; `characterAutomation.ts:262` produces the matching "Listener whisper" pending reason.
- **verdict**: mismatch (low severity — the outcome is right for a non-caster, wrong for a Deepcaller who may re-pick it every level)
- **proposed_change**: acceptable as-is for the beta reconciliation; if touched, record the Listener pick in its own `sheetAutomation` key and exclude it from the swappable prepared set. Not worth a step change. Also note the source pins its Rite Performing ability to **Intelligence** regardless of class, which nothing in the builder records.
- **stored_data_impact**: none.

### Levelling is offered the moment Insight is earned; the beta requires a Long Rest first

- **txt_section**: core-rulebook.txt [page 46] "Level Advancement": "When your Insight total equals or exceeds a number in the insight column, you reach the corresponding level **only after a Long Rest**." Character Advancement table: 1→0, 2→6, 3→15, 4→30, 5→50, 6→75, 7→105, 8→140, 9→180, 10→225, 11→275, 12→330, 13→390, 14→455, 15→525, 16→600 (…20→950).
- **rule_summary**: Insight thresholds are correct in code; the Long Rest gate is the missing half.
- **code_location**: `src/lib/insight.ts:2` `INSIGHT_BY_LEVEL` (matches the table exactly, including the 17–20 rows 680/765/855/950); `upgradeModel.ts:22` `earnedLevel()` returns the Insight level immediately; `CharacterSheetUpgrade.tsx:28,59` opens the whole upgrade flow off it.
- **verdict**: mismatch (the threshold table is a confirmed match; the gate is missing)
- **proposed_change**: minimal and design-preserving: on the existing "Automatic changes" step, when `target > saved.level`, add one line of copy to the intro paragraph — "These apply when you finish a Long Rest." No gate, no new step, no blocked save (the app does not track rests, so enforcing would strand players). See A06.
- **stored_data_impact**: none.

### The "Automatic changes" step attributes HP gain to a hit-die roll; the beta uses fixed values

- **txt_section**: core-rulebook.txt [page 46] "Gaining a Level", step 1: "Gain Hit Point maximum by using the **fixed value** shown in the Fixed Hit Points by Class table" — Bloodbound 7 + Con. modifier; Brute, Scout, or Warden 6 + Con.; Stalker 5 + Con.; Deepcaller 4 + Con. Level 1 values at [page 42]: 12 / 10 / 8 / 6 + Con.
- **rule_summary**: HP maximum never involves a roll. The Hit Die is only the *Short Rest* spend die.
- **code_location**: `CharacterSheetUpgrade.tsx:64` — the change row reason string `"Class hit die + Constitution + feats"`. The computation itself (`lib/characterAutomation.ts`) already uses the fixed tables and is correct per A06.
- **verdict**: mismatch (label only)
- **proposed_change**: change that one reason string to `"Fixed class value + Constitution + feats"`. One-word-per-row edit inside the existing `AutomaticChanges` article.
- **stored_data_impact**: none.

### Confirmed match — the level-feature pages and their option sets

- **txt_section**: core-rulebook.txt [page 47] Brute LEVEL 4: "You gain the Ability Score Improvement feat (see chapter 5) or another feat of your choice for which you qualify"; [page 60] Scout LEVEL 2: "You gain a Fighting Style feat of your choice"; Deepcaller LEVEL 19: "You gain an Epic Boon feat or another feat of your choice for which you qualify"; [page 92] ABILITY SCORE IMPROVEMENT, General Feat (Prerequisite: Level 4+): "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can't increase an ability score above 20."
- **rule_summary**: Three distinct feat-choice shapes, plus a +2/+1+1 allocation capped at 20.
- **code_location**: `upgradeModel.ts:66–70` (`featOptionsFor`); allocation UI `CharacterSheetUpgradeFeatPage.tsx:249–270` enforces `abilityPoints` and `abilityMaximum` per feat.
- **verdict**: match, with one narrowing worth noting
- **proposed_change**: none required. Noting deliberately: the ASI page offers only `GENERAL_FEATS`, whereas the source says "or another feat of your choice for which you qualify" — Origin and Fighting Style feats are technically excluded. Since no prerequisite is enforced anywhere (A14), widening the list without prerequisite checks would make it *less* correct, so leave it.
- **stored_data_impact**: none.

### Confirmed match — the Forbidden Revelation recorded-choice page

- **txt_section**: core-rulebook.txt [page 73] Deepcaller LEVEL 11 Forbidden Revelation: Level 11 → one Level 6 Rite, 13 → Level 7, 15 → Level 8, 17 → Level 9; "You can also use a Forbidden Revelation for a 1-5 Level Rite that has the option to use Higher Level Strains. That Rite then becomes the level of which Forbidden Revelation you choose."
- **rule_summary**: A finite, level-keyed option list, plus lower-level Rites that print a Higher-Level Strain upgrade.
- **code_location**: `upgradeModel.ts:74–86` (`recordedOptionsFor`) → `forbiddenRevelationOptions()` in `src/data/characterOptions.ts`; rendered as a `<select>` at `CharacterSheetUpgradeFeatPage.tsx:273–280` with the label "Level {n} {school} using its printed Higher-Level Strain option".
- **verdict**: match
- **proposed_change**: none. Non-obvious confirmation: the *only* free-text "Record your choice" input in the whole builder (`CharacterSheetUpgradeFeatPage.tsx:280`) is the fallback for features with no finite list in the source — its helper text says exactly that, which is honest and should stay.
- **stored_data_impact**: none.

### Starting-kit aliasing collapses the beta's two distinct books into one

- **txt_section**: core-rulebook.txt [page 71] "**The Book of the Deepcaller.** Your Book of the Deepcaller contains the forbidden passages needed to perform Hunter Deepcaller Rites of level 1-5"; the gear chapter separately lists a book of eldritch knowledge (see A16, which found the source defines two distinct books).
- **rule_summary**: The Deepcaller's class book is a specific, class-defining item, not a generic eldritch tome.
- **code_location**: `src/lib/startingEquipment.ts:7` — `"book of the deepcaller": "book-of-eldritch-knowledge"`. `startingKit()` is invoked from `CharacterAutomationProvider.tsx:withStartingKit` on every class/background change, so this alias is what the builder's Armor & carrying step actually puts in a Deepcaller's inventory.
- **verdict**: mismatch
- **proposed_change**: add a distinct `book-of-the-deepcaller` item to `src/data/items.ts` (per A16) and point the alias at it; drop the alias line that maps the two names together. `startingKit()` needs no change — it resolves by alias table.
- **stored_data_impact**: every existing Deepcaller has `inventory: [{itemId: "book-of-eldritch-knowledge"}]` and `sheetAutomation.startingKitInventory` recording the same id. Migration: for cards with `classId === "deepcaller"`, remap that inventory entry **and** the matching `startingKitInventory` entry to `book-of-the-deepcaller` (they must stay in sync, or the next class/background change in the builder will fail to remove the old grant and will double up the book). Also remap any `slotAssignments["book-of-eldritch-knowledge"]` key.

### Starting-kit lines the catalog cannot resolve are silently downgraded to "legacy equipment"

- **txt_section**: core-rulebook.txt [page 56] Scout Starting Equipment ("…Cavalier Hat"), [page 47] Brute (Wide Brim Hat), [page 84] Bloodbound (Cowl), [page 96] Warden (Tricorn) — see A07/A08/A11/A12.
- **rule_summary**: Four classes are granted a head-slot Extra as starting equipment.
- **code_location**: `src/lib/startingEquipment.ts:31–38` pushes anything `catalogIdForName()` cannot match into `unmatched`; `CharacterAutomationProvider.tsx:80–86` then writes it into `sheetAutomation.legacyEquipment` as `{carrying: "Needs catalog data", slot: "—", weight: "—"}`. Hats live in `src/data/armor.ts`, not `ITEMS`, so `catalogIdForName` can never resolve them.
- **verdict**: mismatch — a rules-granted item ends up as an un-slotted, weightless placeholder row
- **proposed_change**: extend `startingKit()` to return an `extraArmorIds` list alongside `inventory`/`coins`, resolved against `ARMOR` for `armorCategory === "Extra"`, and have `withStartingKit()` merge it into `card.extraArmorIds`. This is the same grant/ungrant bookkeeping the kit already does for `inventory` and `coins`, so it fits the existing shape; the Armor & carrying step then shows the hat in its existing Extras socket with no UI change.
- **stored_data_impact**: existing cards carry `sheetAutomation.legacyEquipment` rows for these hats (or nothing at all, for classes whose list never named one). Migration: for each class, if the beta's starting equipment names a head Extra and `extraArmorIds` lacks it, backfill the armor id and delete the corresponding `legacyEquipment` placeholder row. AC does not change (Extras carry `acValue: 0`), but `weight`/`weightCondition` on the sheet must be recomputed after the backfill because the hat now contributes real weight.

### The builder's Armor & carrying step omits the beta's layer 1, Background Garments

- **txt_section**: core-rulebook.txt [page 33] Step 4, the five-layer table: "1 Background Garments — When unarmored, your character is still wearing their *Background Garments"; then Main Armor, Add-on Armor, Extras and Specific Gear, Carried Items. Also "During character creation, choose one Main Armor and up to five Add-on Armor pieces".
- **rule_summary**: The equipping order has five named layers and starts with the background's own clothing.
- **code_location**: `CharacterSheetUpgrade.tsx:157–159` `CreationEquipment` — intro copy is "Equip armor now or continue unarmored…", then `CharacterSheetEquipment`, which presents Main Armor → Add-ons → Extras → carrying. Layers 2–5 are all present and in order; layer 1 is not represented.
- **verdict**: mismatch (missing layer, correct order otherwise)
- **proposed_change**: one sentence in the existing intro paragraph: unarmored still means Background Garments. Nothing structural — the app's AC base of `10 + DEX` already equals the unarmored value the source gives, so no calculation changes. (The Studs AC threshold and studded-piece weight errors that also live on this step are already logged in A05/A06 and are not restated here.)
- **stored_data_impact**: none from this edit; the Studs fix in A05 requires an AC recompute for every card with `studdedAddonIds.length` between 1 and 2.

### "Size: Medium" on the Hunter build page — confirmed match

- **txt_section**: character-sheet.txt [page 1], the INITIATIVE / SPEED / PASSIVE PERCEPTION row: "( SIZE : MEDIUM )".
- **rule_summary**: The printed sheet hard-codes Size Medium beside Speed.
- **code_location**: `CharacterSheetHunter.tsx` — `<span>Size</span><strong>Medium</strong><small>The size printed on the supplied character sheet.</small>`.
- **verdict**: match
- **proposed_change**: none. Recorded because it looks like an invented field: it is not. The helper text's claim is literally true of the beta sheet.
- **stored_data_impact**: none.

### "Actual player" field — confirmed match

- **txt_section**: character-sheet.txt [page 1] IDENTITY block: "Your ACTUAL name" above "YOUR NAME".
- **rule_summary**: The sheet distinguishes the player's real name from the hunter's name.
- **code_location**: `CharacterSheetHunter.tsx` — `<span>Actual player</span><strong>{card.ownerName || "Unknown player"}</strong>`, alongside the `Hunter name` input.
- **verdict**: match
- **proposed_change**: none.
- **stored_data_impact**: none.

### Legacy migration writes a Current Sanity value the beta says not to track

- **txt_section**: core-rulebook.txt [page 42] "Max Sanity and Madness": "Start with 0 Madness and **do not track Current Sanity**."
- **rule_summary**: Current Sanity is not a tracked value; Madness is damage against Max Sanity.
- **code_location**: `src/features/hunter/lib/legacyMigration.ts:210` — `sanity: numberField(sheet, "sanityCur", card.sanity ?? numberField(sheet, "sanityMax", 0))`, applied at `:254`. This runs when an old free-text sheet is converted into a structured card, i.e. on the path into the guided builder.
- **verdict**: mismatch, but blocked on a decision outside this file's scope
- **proposed_change**: none yet. The printable Character Sheet still prints CURRENT / MAX sanity boxes (character-sheet.txt [page 1]), so A03 flags the source as self-contradictory. Do not strip `sanity` from the migration until that conflict is resolved with the game maker — a one-way strip is irreversible.
- **stored_data_impact**: deferred. If the decision is to drop it: `/characters/{id}.sanity` would be removed and the `sanityCur` sheet field cleared on every record. Flag for Simon rather than migrating.

### Confirmed match — the level-up pool refill rule

- **txt_section**: core-rulebook.txt [page 46] "Gaining a Level": "Each time you gain a level, you gain an additional Hit Die."
- **rule_summary**: Raising a maximum on level-up refills the pool; nothing in the rules reduces a level.
- **code_location**: `src/features/hunter/lib/levelUpVitals.ts:6–14` (`levelAdjustedPool`) — refills only when `levelIncreased && nextMaximum > currentMaximum`, otherwise clamps.
- **verdict**: match
- **proposed_change**: none. Recorded as a non-obvious confirmation: the clamp-on-decrease branch is a defensive path with no rules counterpart, and correctly never invents Hit Dice.
- **stored_data_impact**: none.

### Confirmed match — Insight is never spent by the award path

- **txt_section**: core-rulebook.txt [page 46] Character Advancement table is cumulative ("When your Insight **total** equals or exceeds a number in the insight column"). The only reduction in the beta is expending a Favor at [page 45]: "Reduce your Insight to the minimum total required for your current Level."
- **rule_summary**: Insight accumulates and is only reduced by a Favor.
- **code_location**: `src/features/hunter/lib/insightAward.ts:5–8` — `insightAwardPatch` only ever adds, floored at 0, and its doc comment states the level is committed separately.
- **verdict**: match
- **proposed_change**: none. (The Favor-driven reduction itself is entirely missing — logged in A06, not duplicated here.)
- **stored_data_impact**: none.

---

## Migration summary for this file's findings

Fields on `/characters/{id}` touched by the changes proposed above:

| Field | Action |
|---|---|
| `featSkills` | strip `Brewer's Supplies` / `Mason's Tools` / `Tinker's Tools`; re-opens the Skilled choice |
| `sheetAutomation.weaponMasteries` | strip `"Hunter Cleaver"`; strip `"Pistol"` on Stalkers; re-opens the mastery choice |
| `preparedWhispers` | for level-3+ Zealots, backfill `eldritch-strike` and `armor-of-the-drowned-star` |
| `inventory` + `sheetAutomation.startingKitInventory` + `slotAssignments` | remap `book-of-eldritch-knowledge` → `book-of-the-deepcaller` for Deepcallers, **in all three places together** |
| `inventory` | leave `hunter-cleaver` entries in place (player-carried gear) |
| `extraArmorIds` + `sheetAutomation.legacyEquipment` | backfill the class head Extra, delete its placeholder row |
| `sheet.weight` / `weightCondition` | recompute after the head-Extra backfill |
| `abilityMode` | **do not touch** — `"maduhausu"` stays a valid stored literal |
| `sanity` | **do not touch** — blocked on the Current Sanity conflict (A03) |

No field in the builder's stored state becomes structurally invalid under the
beta: every change above is a value-level strip, remap or backfill.
