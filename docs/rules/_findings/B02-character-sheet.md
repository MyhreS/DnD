# B02 — Direction B: the canonical character sheet (code/UI → txt)

Scope covered, read in full:

- `src/features/hunter/components/character-sheet/` (all 32 `.tsx` + 5 `.ts`)
- `src/features/hunter/components/appsheet/` (all 9 `.tsx` + 3 `.ts`)
- `src/features/hunter/components/papersheet/` (`PaperSheetModal.tsx`,
  `CharacterAutomationProvider.tsx`, `characterAutomationContext.ts`, `classFigures.tsx`)
- `src/features/hunter/lib/deriveSheetFromCard.ts`
- `src/features/hunter/components/SheetCharacterView.tsx`
- plus the field producer they all read from,
  `src/features/hunter/lib/characterAutomation.ts` (`automationFor`), because every
  box on all three renderings is a key of `result.fields`.

**Structural note first.** There are not really three independent renderings.
`SheetCharacterView` → `PaperSheetModal` → `AppCharacterSheet` (appsheet) →
`CharacterSheetHome` (character-sheet) is one stack; `papersheet/` no longer
contains any sheet pages at all (`SheetPage1.tsx`, still named as the deliberate
>200-line exception in `CLAUDE.md`, does not exist). `deriveSheetFromCard.ts` is a
fallback projection for legacy cards with no `card.sheet`. So the field inventory
below is stated once, against `automationFor()` + the panel that displays it.

---

## Field inventory vs `character-sheet.txt`

Every printed box in `character-sheet.txt`, and where the app shows it:

| character-sheet.txt box | field key | app surface | status |
|---|---|---|---|
| YOUR NAME | `name` | `CharacterSheetHome` header, `CharacterSheetHunter` | present |
| Your ACTUAL name | — | `CharacterSheetHunter` "Actual player" (`card.ownerName`) | present |
| BACKGROUND (2) | `background` | header + Hunter panel | present |
| CLASS (1) / SUBCLASS (1) | `class`, `subclass` | header + Hunter panel | present |
| LEVEL (1) / INSIGHT (3) | `level`, `insight` | header buttons → `CharacterSheetProgress` | present |
| TRANSFORMATION LVL (3) | `transformation` | `CharacterSheetResources` (max 10) | present |
| SANITY CURRENT / MAX / SANITY DICE, [ ] INSANE | `sanityCur`, `sanityMax`, `sanityDice`, `insane` | `CharacterSheetSanity`, `CharacterSheetResources` | **contradicted by core rulebook — see B02-1** |
| HIT POINTS CURRENT / MAX / TEMP | `hpCur`, `hpMax`, `hpTemp` | `CharacterSheetHealth` | present |
| HIT DICE CURRENT / SPENT / MAX | `hdCur`, `hdSpent`, `hdMax` | `CharacterSheetResources` "Recovery" | present |
| DEATH SAVES 3+3 | `dsS1..3`, `dsF1..3` | `CharacterSheetResources` "Battle states" | present |
| PROFICIENCY BONUS (2) | `profBonus` | computed, not surfaced as its own readout | present in data |
| 6 ability SCORE/MODIFIER + Saving Throw | `{k}Score`, `{k}Mod`, `{k}Save`, `{k}SaveP` | `AppAbilitiesSection` → `FinalAbilities` | present |
| 19 skills + proficiency circles | `skAthletics`…`skPersuasion` (+`P`) | `AppAbilitiesSection` → `SkillList` | present, names match exactly |
| BLOOD TINGE (3) | `bloodTinge` | `CharacterSheetResources` checkbox | present |
| INITIATIVE / SPEED / PASSIVE PERCEPTION | `initiative`, `speed`, `passivePerception` | Home readouts → `CharacterSheetDerivedStat` | present |
| SIZE : MEDIUM | — | `CharacterSheetHunter` hard-coded "Medium" | present |
| ARMOR CLASS (4), [ ] SHIELD ARM | `ac`, `shieldArm` | Home readout + `CharacterSheetArmorRules` | present |
| ARMOR CATEGORY / WEIGHT / WEIGHT CONDITION | `armorCategory`, `weight`, `weightCondition` | `CharacterSheetEquipment` summary strip | present |
| HEAD GEAR / SCARF / MAIN ARMOR / GLOVES / BOOTS | `headGear`,`scarf`,`mainArmor`,`gloves`,`boots` | `CharacterSheetArmorDoll` | present + one extra slot (**B02-3**) |
| ADD-ON ARMOR ×6 + STUDS | `addon1..6`, `studs1..6` | `CharacterSheetAddonArmor` | present |
| IMPRESSIONS (4) | `impressions` | `CharacterSheetArmorRules` "Current impression" | present but unsourced (**B02-4**) |
| SPECIAL (4) | `special` | `CharacterSheetArmorRules` "Current worn effects" | present |
| STORAGE ITEMS + 5 storage slots | `storageItems`, `slotHand/Back/Hip/Chest/Ankle` | `CharacterSheetStorageRack`, `CharacterSheetCarryPoint` | present |
| ARMOR TRAINING light/med/heavy | `armorLight/Medium/Heavy` | `CharacterSheetArmorRules` | present |
| WEAPONS simple/martial | `wepSimple`, `wepMartial` | **not rendered anywhere** (**B02-6**) |
| TOOLS (2) | `tools` | `CharacterSheetHunter` "Tools" panel | present |
| COINS … GP | `coins` | `AppGearSection` coin editor | present |
| EQUIPMENT (ALL): ITEM / CARRYING CATEGORY / ITEM SLOT / WEIGHT ×19 | `eq_0_0`…`eq_19_3` | `AppGearSection` inventory list | present (20 rows vs 19) |
| WEAPON DAMAGE: NAME / ATTACK BONUS / DAMAGE TYPE / NOTES ×8 | `wd_0_0`…`wd_7_3` | **written only, never rendered** (**B02-5**) |
| CLASS FEATURES (3) | `features1` | `CharacterSheetClassAbilities` → `AppClassAbilities` | present |
| FEATS (2) | `feats` | `CharacterSheetHunter` "Feats" panel | present |
| RITE PERFORMING ABILITY / MODIFIER / SAVE DC / ATTACK BONUS | `riteAbility`,`riteMod`,`riteDC`,`riteAttack` | `CharacterSheetResources` | present, formulas verified |
| PREPARED WHISPERS: LEVEL/NAME/PERFORMING/RANGE/DURATION/ROUNDS | — | `AppDeepcallerReference` | column drift (**B02-7**) |
| NOTES | `pageNotes` | `CharacterSheetNotes` | present |

App-only fields with **no** box on the printed sheet: `strainCur`/`strainMax`/
`strainLevel` (justified — core-rulebook [page 43] "note them … on your character
sheet"), `madness` (justified — [page 42]), `acModifier`/`speedModifier`/
`initiativeModifier`/`passivePerceptionModifier` (house-rule escape hatches),
`activeTransformations`, session notes. None are removal candidates.

---

### B02-1 · The Sanity panel is the app's most source-contradicting surface
- **app_location**: `/Users/simonmyhre/workdir/gitdir/DnD/.claude/worktrees/cs-beta-release-integration-be1e76/src/features/hunter/components/character-sheet/CharacterSheetSanity.tsx` (whole file); `CharacterSheetHome.tsx:104` (Sanity meter); `characterAutomation.ts:162` (`sanityCur`); `deriveSheetFromCard.ts:66`
- **ui_or_logic_summary**: Sanity is the primary tracked pool — headline `{sanity} / {sanityMax} Sanity`, a progress bar filled by `sanity / sanityMax`, a stepper bound to `stage.stageSanity`, Madness demoted to a secondary stepper "Tracked separately from Sanity", and **Insane as a manual checkbox** the player ticks.
- **found_in_txt**: changed — core-rulebook.txt [page 42] "Max Sanity and Madness": "Start with 0 Madness and **do not track Current Sanity**. Madness functions like damage against Max Sanity: when Madness equals or exceeds Max Sanity, you become Insane"; [page 23] "The Insane condition ends immediately when your current Madness is reduced below your Max Sanity." character-sheet.txt [page 1] still prints "SANITY … CURRENT / MAX" and "[ ] INSANE", so the printed sheet and the rulebook disagree; the rulebook is the mechanical authority.
- **proposed_change**: update — A06 already specifies the edit (invert the pool: fill the same bar with `madness / sanityMax`, drop the `sanityCur` control, derive `insane` as `madness >= sanityMax`). Adding only the sheet-side detail A06 did not: the `insane` checkbox in `CharacterSheetSanity.tsx:19` must become a read-only state row in the identical `character-sheet-status-toggle` markup, and `CharacterSheetHome.tsx:104`'s `<small> · Madness {n}</small>` becomes the primary `<em>`. No layout change.
- **stored_data_impact**: strip `HunterCard.sanity` and `sheet.sanityCur`, `sheet.insane`; `madness` already exists and needs no backfill; recompute `sheet.sanityMax`.

### B02-2 · "Studded" copy on the sheet states the old 1-piece threshold and the old weight
- **app_location**: `.../character-sheet/CharacterSheetArmorRules.tsx:17` and `.../character-sheet/CharacterSheetAddonArmor.tsx:45`
- **ui_or_logic_summary**: The Armor-rules drawer prints "One studded Add-on grants +1 AC; five grant +2 AC. Each upgraded piece adds 3 lb." and each add-on's Studded checkbox is captioned `+3 lb`.
- **found_in_txt**: changed — core-rulebook.txt [page 35] Studs row: "If at least **three** Add-on Armor pieces are studded, you gain +1 AC. If five are studded, this bonus increases to +2 AC. **Each studded piece adds 5 lb.** While wearing studded armor, you have Disadvantage on Dexterity (Stealth) checks made to hide or move silently."
- **proposed_change**: update — copy only (the arithmetic fix in `src/lib/character.ts` / `wornArmorWeight()` is A06's). Replace the drawer sentence with "Three studded Add-ons grant +1 AC; five grant +2 AC. Each upgraded piece adds 5 lb and gives Disadvantage on Dexterity (Stealth) checks to hide or move silently." and change the checkbox caption to `+5 lb`.
- **stored_data_impact**: none from the copy. The paired logic fix recomputes `sheet.ac`, `sheet.weight`, `sheet.weightCondition`, `sheet.armorCategory` on every card with `studdedAddonIds`.

### B02-3 · The armor doll has a "Robe" slot the printed sheet does not
- **app_location**: `.../character-sheet/CharacterSheetArmorDoll.tsx:9` — `EXTRA_SLOTS = [["Head Gear","Head"],["Scarf","Scarf"],["Gloves","Gloves"],["Boots","Boots"],["Robe","Robe"]]`
- **ui_or_logic_summary**: five Extra sockets around the figure; `automationFor()` only emits four extras fields (`headGear`, `scarf`, `gloves`, `boots`), so a worn Robe is invisible on any printed/derived sheet.
- **found_in_txt**: changed — core-rulebook.txt [page 38] "Armor Part 2" defines exactly four Extra subcategories: **Extra: Head Gear, Extra: Scarf, Extra: Gloves, Extra: Boots**. character-sheet.txt [page 3] labels only HEAD GEAR / SCARF / MAIN ARMOR / GLOVES / BOOTS. "Deepcallers Robe" survives only as Deepcaller **Starting Equipment** (core-rulebook.txt [page ~69], line 3085) — it is a named item, never an Extra subcategory.
- **proposed_change**: keep the socket (removing it would strand the Deepcaller's own starting item) but close the reporting gap: add a `robe` put in `characterAutomation.ts` beside the existing `headGear/scarf/gloves/boots` loop so the worn Robe reaches `sheet` and the `special` aggregation. If the game maker prefers the source's four-subcategory list, the minimal removal is deleting the `["Robe","Robe"]` tuple and re-typing `robe` as `Add-on Armor`.
- **stored_data_impact**: none if kept. If removed: strip `"robe"` from `extraArmorIds[]` on Deepcaller cards and re-add it to `inventory` so the item is not destroyed.

### B02-4 · "IMPRESSIONS" has a box on the sheet but no source content behind it
- **app_location**: `.../character-sheet/CharacterSheetArmorRules.tsx:22` (`result.fields.impressions`), fed by `characterAutomation.ts:243`, data in `src/data/armor.ts` (`impression` on the four head-gear entries only)
- **ui_or_logic_summary**: "Current impression" renders strings like "Reads as a hard-hitting brawler." for Tricorn / Cavalier Hat / Cowl / Wide Brim Hat; every other armor piece contributes nothing, so the panel is empty for most hunters.
- **found_in_txt**: no — the word "impression" appears **only** in `character-sheet.txt:157` as a panel heading. Core-rulebook [page 38] gives all four head-gear pieces the single Special "Is given by class." There is no impression text anywhere in the beta sources.
- **proposed_change**: keep the panel (the printed sheet requires the box) and treat the four `impression` strings as declared app flavour, or remove them per A05's note. Either way the panel's empty-state copy "No visible armor impression." is correct and needs no edit. Do **not** invent impressions for the remaining pieces.
- **stored_data_impact**: `sheet.impressions` is a recomputed snapshot; if the strings are removed it recomputes to `""`. No field to strip.

### B02-5 · The WEAPON DAMAGE table is written but never rendered, and its columns don't match
- **app_location**: `.../papersheet/CharacterAutomationProvider.tsx:533-545` (`addCustomItem` writes `wd_{row}_0..3`); `.../appsheet/AppGearSection.tsx:134-154` (the only weapon table the UI actually shows)
- **ui_or_logic_summary**: Adding a custom weapon writes name / attackBonus / **damage** / notes into `wd_*`. Nothing reads `wd_*` back — no panel renders it, and catalog weapons never populate it. What the player sees instead is a "Carried weapons" table with columns Weapon / Damage / Properties / Mastery, and no attack bonus anywhere on the sheet.
- **found_in_txt**: changed — character-sheet.txt [page 5] columns are **NAME | ATTACK BONUS | DAMAGE TYPE | NOTES** (8 rows). core-rulebook.txt [page 43] "Attacks" defines the value the sheet's second column wants: "Melee attack bonus = Strength modifier + Proficiency Bonus", "Ranged attack bonus = Dexterity modifier + Proficiency Bonus", and "You add the same ability modifier you use for attacks with a weapon to your damage rolls".
- **proposed_change**: update — in `AppGearSection`'s existing weapon table, add one column "Attack" computed as `formatModifier(proficiencyBonus(card.level) + abilityModifier(finesse||ranged ? dex : str))` from `WEAPON_FACTS[item.id].properties`, and populate `wd_{row}_0..3` for every carried weapon (not just custom ones) from that same table, with column 2 carrying the damage **type** the printed sheet asks for. No new panel, no layout change.
- **stored_data_impact**: `sheet.wd_*` becomes a generated snapshot for the first time — backfill on next save via `calculatedSheetFields()`; existing hand-written `wd_*` rows on migrated cards should be added to `sheetAutomation.manualOverrides` so they are not overwritten.

### B02-6 · `wepSimple` / `wepMartial` are computed but have no UI
- **app_location**: `characterAutomation.ts:178-179`; the Armor-rules drawer (`CharacterSheetArmorRules.tsx:14`) shows only `klass.armorTraining`
- **ui_or_logic_summary**: Weapon proficiency booleans are produced and saved, but the sheet's "Equipment training & proficiencies" block is only half-rendered — armor training appears, weapons do not.
- **found_in_txt**: yes — character-sheet.txt [page 3] "EQUIPMENT TRAINING & PROFICIENCIES / ARMOR TRAINING (1) [ ] LIGHT [ ] MEDIUM [ ] HEAVY / **WEAPONS (2) [ ] SIMPLE [ ] MARTIAL**".
- **proposed_change**: update — add one `<article>` to the existing `character-sheet-armor-rule-list` in `CharacterSheetArmorRules.tsx` titled "Weapon training", value `klass?.weaponProficiencies`, using the same markup as the "Armor training" article. One element, existing styling.
- **stored_data_impact**: none — both fields are already stored.

### B02-7 · Prepared Whispers rows carry two invented columns and drop two printed ones
- **app_location**: `.../appsheet/AppDeepcallerReference.tsx:34-53` (`ReferenceRow`)
- **ui_or_logic_summary**: Each whisper/rite row shows `entry.school` in the summary line and a definition list of Perform / Range / Duration / **Damage** / **Damage type** / Section / Special / Upgrade / Source note.
- **found_in_txt**: changed — `whispers-sheet.txt` gives each Whisper exactly `Type` (e.g. "Evocation Rite"), `Performing`, `Range`, `Duration`, and sometimes `Special Requirements`. There is no "school", no "damage type" field, and no level for a Whisper. character-sheet.txt [page 9] wants columns **LEVEL | NAME | PERFORMING | RANGE | DURATION | ROUNDS**.
- **proposed_change**: update — relabel the summary's `entry.school` as "Type" (its stored value, "Evocation Rite", is already the source's `Type`), keep Damage/Damage type as app-derived extras (they are genuinely computed from the body text), and add a `Special Requirements` row for Eldritch Strike's "A weapon with which you have proficiency". `ROUNDS` has no source definition anywhere — do not add it. Whispers should not print a LEVEL; only Rites have one.
- **stored_data_impact**: none — `preparedWhispers[]` holds ids only; `school` is a `codex.generated.json` key, not stored per character.

### B02-8 · Carry condition is computed with a speed effect the Speed panel ignores
- **app_location**: `.../character-sheet/CharacterSheetDerivedStat.tsx:33` (speed breakdown rows) and `characterAutomation.ts:174` (`speed` = `klass.speedFt + speedModifier`); `src/lib/inventory.ts:81-118` (`carryCondition` returns a `speedDelta` used **nowhere**)
- **ui_or_logic_summary**: The Speed panel's "How it is calculated" lists only "<Class> base speed" and "Custom modifier". Load is shown as a separate label ("Load effect: Encumbered") with no consequence on the Speed number.
- **found_in_txt**: yes — core-rulebook.txt [page 40] weight table: "No more than Strength × 2 lb. — **Featherweight** — Your speed increases by 5 ft."; "More than Strength × 5 lb. — **Encumbered** — Your speed is reduced by 10 feet. You have Disadvantage on Dexterity (Acrobatics and Stealth) checks and Dexterity saving throws."; "More than Strength × 10 lb. — **Heavily Encumbered** — Your speed is reduced by 20 ft…"; "More than Strength × 15 lb. — **Over Capacity**". (The thresholds and four labels in `carryCondition()` match the source exactly — confirmed value by value.)
- **proposed_change**: update — add `carryCondition(card.abilities.str, totalCarriedWeight(card)).speedDelta` to the `speed` put in `characterAutomation.ts`, and add one row `[condition.label, speedDelta]` to the `kind === "speed"` breakdown array. Two lines, no layout change.
- **stored_data_impact**: `sheet.speed` must be recomputed for every card; hunters at Featherweight gain +5 ft and Encumbered/Heavily Encumbered lose 10/20 ft.

### B02-9 · Every "AutoReason" on the sheet cites a source set that no longer exists
- **app_location**: `.../lib/characterAutomation.ts:34-40` (`SOURCE`), surfaced through `AutoReason` in `CharacterSheetHunter.tsx`, `AppAbilitiesSection.tsx`, `AppGearSection.tsx`, `AppWeaponReference.tsx`, `CharacterSheetArmorRules.tsx`
- **ui_or_logic_summary**: Explanations under sheet values read e.g. "Established Hunter armor catalog (**outside the current four-document source set**)" — user-visible copy on five panels.
- **found_in_txt**: no — the class, background, armor and equipment rules those five strings disclaim are now **inside** the source: classes core-rulebook.txt [pages 47–100], backgrounds [page ~93], armor [pages 34–41], equipment/weight/slots [pages 40–41]. The disclaimer is factually wrong on every panel that shows it.
- **proposed_change**: update — replace the five `SOURCE` strings with plain citations ("C&S Core Rulebook, Armor Part 1–2", "C&S Core Rulebook, Create Your Character"). Same call sites, same rendering.
- **stored_data_impact**: `sheet` stores only values, not `reasons` — none.

### B02-10 · The carried-weapons footnote claims the Hunter Cleaver is unstatted
- **app_location**: `.../appsheet/AppGearSection.tsx:153`
- **ui_or_logic_summary**: "Weapon damage, properties, and mastery come from the established Hunter catalog. The Hunter Cleaver has no recorded statistics and remains explicitly DM-set."
- **found_in_txt**: no — "Cleaver" appears **nowhere** in `docs/rules/*.txt`, including the full weapons table at core-rulebook.txt [page ~105]. The item is not merely unstatted; it is absent from the beta source entirely, so calling it out by name on the sheet is stale.
- **proposed_change**: update — trim the sentence to "Weapon damage, properties, and mastery come from the C&S Core Rulebook weapons table." Whether `hunter-cleaver` itself survives is A08/A15's call; do not delete inventory entries from this sheet code either way.
- **stored_data_impact**: none from the copy.

### B02-11 · `deriveSheetFromCard` produces a sheet that disagrees with the live one
- **app_location**: `/Users/simonmyhre/workdir/gitdir/DnD/.claude/worktrees/cs-beta-release-integration-be1e76/src/features/hunter/lib/deriveSheetFromCard.ts` (whole file)
- **ui_or_logic_summary**: The legacy fallback recomputes a subset independently of `automationFor()`. It diverges on: passive perception ignores Expertise **and** the `passivePerceptionModifier` (line 82-85); `hpMax` omits Tough / Boon of Fortitude; `speed` omits `speedModifier`; `ac` omits `acModifier`; `hdCur` is hard-set to `level` rather than reading `sheet.hdCur`, and `hdSpent` is never emitted; `sanityCur` is emitted (see B02-1); `madness`, `armorCategory` extras, `tools`, `weight`/`weightCondition`, `wepSimple/Martial` and the whole equipment table are absent.
- **found_in_txt**: n/a — this is an internal consistency defect, but it means a legacy hunter's printed sheet shows different numbers from the same hunter's app sheet.
- **proposed_change**: update — replace the body with `calculatedSheetFields(card)` and keep only the genuinely legacy-specific puts (`class`/`subclass` name resolution). One function, no UI touched. If that is too large a change for this pass, the minimum fix is applying the same Expertise multiplier and the four custom modifiers so the two projections agree.
- **stored_data_impact**: none directly; it changes what a legacy card's *first* save writes into `sheet`, which is the desired outcome.

### B02-12 · Confirmed matches worth recording (no change)
- **app_location**: `characterAutomation.ts:251-255` (Rite block), `:199-219` (abilities/skills), `src/lib/inventory.ts:81` (`carryCondition`), `src/data/skills.ts` (`SKILLS`, `SHEET_SKILL_FIELD`)
- **ui_or_logic_summary / found_in_txt**: yes —
  - Rite save DC `8 + prof + INT mod` and Rite attack `prof + INT mod` match core-rulebook.txt [page 43] verbatim, and "Rite Performing Ability = Intelligence" matches "In C&S that is probably only going to be intelligence".
  - All **19** skills and their ability assignments match character-sheet.txt [page 1–2] and core-rulebook.txt [page 8–9] exactly, including the C&S-specific Grit (CON), Eldritch Knowledge / Old World History / Blood Nature (INT) and Presence (CHA). `SHEET_SKILL_FIELD` covers all 19.
  - The four carry conditions and their Strength × 2 / 5 / 10 / 15 thresholds match core-rulebook.txt [page 40] value for value.
  - Add-on limit of five with a Balanced Fit sixth matches [page 34] + [page 35].
  - Shield Arm (`armor.shieldArm`, pauldron + vambrace on the same arm) matches [page 34] "count together as one Shield Arm and give +2 AC total".
  - Transformation Level ceiling of 10 in `CharacterSheetResources.tsx:36` matches the Transformation Table's 1–10 columns at [page 27].
  - Five storage slot locations (hand/back/hip/chest/ankle) match character-sheet.txt [page 3]; the *default* three (back, chest/front, hip) plus "hands carry 2 Significant or 1 Oversized" in `src/lib/slots.ts` match [page 41] exactly.
- **proposed_change**: keep
- **stored_data_impact**: none

---

## Deferred to Direction A findings (not re-litigated here)

- Passive Perception dropping Expertise — A06.
- Studs threshold/weight arithmetic in `src/lib/character.ts` — A06.
- Current Sanity → Madness inversion — A06 (B02-1 adds only the sheet-UI specifics).
- **Not Tonight!** and **Favor**, both of which core-rulebook.txt [page 44] explicitly says to "Record … on your Character Sheet" and which have **no** field, no box on `character-sheet.txt`, and no `HunterCard` property — A04 and A06. From the sheet's side the natural home for both is the existing "Battle states" grid in `CharacterSheetResources.tsx:30-34`, alongside Blood Tinge and the six death-save boxes; no new panel is needed.
- Armor `special` / scarf / gloves string corrections in `src/data/armor.ts` — A05. Note that `small-scarf` there also carries the **Boots'** special ("Prevents barefoot penalties.") and 2 lb instead of the source's 1 lb; both surface directly on the sheet's armor doll and Special panel.
