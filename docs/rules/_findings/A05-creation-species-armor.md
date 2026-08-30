# A05 — Character creation, species, ability scores, armor

Scope: `docs/rules/core-rulebook.txt` lines 1435–1700 (pages 30–36), plus the
armor tables/AC rules that the same step continues into (pages 38–41).

---

### Creation has five steps and NO species/ancestry step

- **txt_section**: core-rulebook.txt [page 30] "Create Your Character" — steps 1–5
- **rule_summary**: The only creation steps are 1 Choose a Class, 2 Determine a Background, 3 Determine Ability Scores, 4 Select and Equip Armor, 5 Fill in Details. There is no species / ancestry / lineage step anywhere. "Humans" appears only at [page 29] as a **Creature Type** for the bestiary/combat rules ("Humans include ordinary citizens…"), not as a player option.
- **code_location**: `src/features/hunter/**`, `src/data/**` — grep for `species|ancestry|lineage` returns **no** matches in `src/`.
- **verdict**: match
- **proposed_change**: none. (Recorded because the task brief anticipated a species step; the app correctly has none, and none should be added.)
- **stored_data_impact**: none

---

### Standard point buy (27 points, 8–15) is exactly correct

- **txt_section**: core-rulebook.txt [page 32] "ASSIGN ABILITY SCORES" + "Ability Score Point Costs"
- **rule_summary**: 27 points; no score above 15 during this step; costs 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9.
- **code_location**: `src/data/abilities.ts` — `POINT_BUY_BUDGET = 27`, `POINT_BUY_MIN = 8`, `POINT_BUY_MAX = 15`, `POINT_COST`
- **verdict**: match (verified value by value)
- **proposed_change**: none
- **stored_data_impact**: none

---

### Alternative 57-point buy: numbers correct, but the name "Maduhausu" is not in the new source

- **txt_section**: core-rulebook.txt [page 32] "Alternative point buy" + "Ability Score Point Costs V2"
- **rule_summary**: 57 points; costs escalate one column per repeat purchase of the same score; table runs 3–16 with 16's third column "Too expensive"; final level-1 total for any one ability is max 17. The source calls it only *"Alternative point buy … the more extreme version only recommended for experienced players and GMs."* The word "Maduhausu" appears **nowhere** in any of the five new txts.
- **code_location**: `src/data/abilities.ts` — `MADUHAUSU_BUDGET = 57`, `MADUHAUSU_MIN = 3`, `MADUHAUSU_MAX = 16`, `MADUHAUSU_FINAL_MAX = 17`, `MADUHAUSU_COST` (14:[12,14,17], 15:[14,18,23], 16:[20,26,null]); `maduhausuSpent()`; `src/features/hunter/lib/abilityBuy.ts`; UI label in `src/features/hunter/components/appsheet/AppAbilitiesSection.tsx:54` (`"Standard"` / `"Maduhausu"`); `src/types.ts:518-519` `abilityMode?: "pointbuy" | "maduhausu"`.
- **verdict**: match on every number; mismatch on the player-visible **label** only
- **proposed_change**: Change only the display string at `AppAbilitiesSection.tsx:54` from `"Maduhausu"` to `"Alternative"` (and the sub-label copy if desired). Keep the `"maduhausu"` enum value, the constant names, and the cost table untouched so saved cards keep resolving. Optionally update the doc comment at `src/data/abilities.ts:32` and `src/lib/character.ts:118`.
- **stored_data_impact**: none — `abilityMode` values must stay `"pointbuy" | "maduhausu"`; do not remap.

---

### Ability modifier table is now printed in the source; the code comment claiming otherwise is stale

- **txt_section**: core-rulebook.txt [page 32] "Ability Scores and Modifiers"
- **rule_summary**: 3 → −4; 4–5 → −3; 6–7 → −2; 8–9 → −1; 10–11 → +0; 12–13 → +1; 14–15 → +2; 16–17 → +3; 18–19 → +4; 20 → +5.
- **code_location**: `src/data/abilities.ts:71-75` — `abilityModifier()` = `Math.floor((score - 10) / 2)`, with the comment *"The replacement source set names Modifier fields but does not define a modifier formula."*
- **verdict**: match (the formula reproduces every row of the table exactly), stale comment
- **proposed_change**: Replace the comment with a reference to the [page 32] "Ability Scores and Modifiers" table. No logic change.
- **stored_data_impact**: none

---

### Background bonus rule (+2/+1 or +1/+1/+1, cap 20) matches

- **txt_section**: core-rulebook.txt [page 32] "ADJUST ABILITY SCORES"
- **rule_summary**: The background lists three abilities; increase one by 2 and a different one by 1, or increase all three by 1. No increase may raise a score above 20.
- **code_location**: `src/features/hunter/lib/abilityBuy.ts` — `backgroundBonusSummary()` (`pattern === "1,2" || pattern === "1,1,1"`, cap via `finalCreationMaximum`); UI `CharacterSheetGuidedChoices.tsx` `CharacterSheetBackgroundAbilities`
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

---

### Studs: AC bonus threshold is wrong (code grants +1 from ONE studded piece; the rule requires THREE)

- **txt_section**: core-rulebook.txt [page 35] "Armor Part 1" — Studs, Armor Upgrade
- **rule_summary**: *"Studs can be added to Add-on Armor pieces. **If at least three Add-on Armor pieces are studded, you gain +1 AC. If five are studded, this bonus increases to +2 AC.**"*
- **code_location**: `src/lib/character.ts:242` — `const studBonus = studded >= 5 ? 2 : studded >= 1 ? 1 : 0;`; also the doc comment at `src/lib/character.ts:63`; player-facing copy in `src/data/armor.ts:137-139` ("One studded piece grants +1 AC") and `src/features/hunter/components/character-sheet/CharacterSheetArmorRules.tsx:17` ("One studded Add-on grants +1 AC; five grant +2 AC.")
- **verdict**: mismatch
- **proposed_change**: `studded >= 5 ? 2 : studded >= 3 ? 1 : 0`. Update the comment at `:63` and both copy strings to "Three studded Add-on pieces grant +1 AC; five grant +2 AC."
- **stored_data_impact**: AC is always derived (`armorClassFor`), never persisted, so no field changes. Any saved hunter with 1–2 studded add-ons silently loses 1 AC on next render; a sheet-derived AC cached in `card.sheet` (if present) should be recomputed.

---

### Studs: weight per studded piece is 5 lb, not 3 lb

- **txt_section**: core-rulebook.txt [page 35] — Studs, Weight column: *"+5 lb. per studded Add-on Armor piece"* / *"Each studded piece adds 5 lb."*
- **rule_summary**: Every studded Add-on Armor piece adds 5 lb to carried weight.
- **code_location**: `src/lib/character.ts:281` — `const studs = studdedAddonIdsOf(card).length * 3;`; `src/data/armor.ts:132,138` (`weightLb: 3`, "(+3 lb. each)"); `CharacterSheetAddonArmor.tsx:45` (`<small>+3 lb</small>`); `CharacterSheetArmorRules.tsx:17` ("adds 3 lb")
- **verdict**: mismatch
- **proposed_change**: Change the multiplier to `* 5`, `weightLb: 5` on the `studs` catalog entry, and the three copy strings to "+5 lb".
- **stored_data_impact**: Carried weight is derived from `studdedAddonIds`; no stored field changes. Hunters near an encumbrance threshold may shift a band (`src/lib/inventory.ts` Featherweight/Encumbered) — expected and correct.

---

### Heavy-armor Strength requirements (13 STR at 16 AC, 15 STR at 17+ AC) are not implemented

- **txt_section**: core-rulebook.txt [page 40] "2: CALCULATE YOUR ARMOR CLASS" — category table, note rows
- **rule_summary**: Unarmored 10 AC full DEX; Light 11–12 AC full DEX; Medium 13–14 AC DEX max +2; Heavy 15+ AC no DEX. Two footnote rows: **(16 AC) Requires 13 STR**, **(17+ AC) Requires 15 STR**.
- **code_location**: `src/data/armor.ts:255-286` `acCategory()` — implements the four bands correctly but has no Strength gate; `src/lib/character.ts:227-257` `armorClass()` never reads STR.
- **verdict**: partial match / missing_in_code (the four AC bands and DEX rules are exactly right; the STR requirement is absent)
- **proposed_change**: Add a non-blocking advisory to the existing "Armor rules" drawer (`CharacterSheetArmorRules.tsx`, the "Armor Class" article) when `baseArmorAc >= 16 && str < 13` or `baseArmorAc >= 17 && str < 15`. Keep it a warning line in the existing component — the source states a requirement but no penalty, and the AC formula itself is unchanged.
- **stored_data_impact**: none (advisory only, fully derived)

---

### Armor Extras: special text no longer matches the source

- **txt_section**: core-rulebook.txt [page 38] "Armor Part 2"
- **rule_summary**: Tricorn / Cavalier Hat / Cowl / Wide Brim Hat (Extra: Head Gear, 0 AC, 1 lb) — Special is now simply *"Is given by class."*, with no transformation-concealment text. Small Scarf (1 lb): *"Can conceal a minor visible mouth or neck transformation from casual observation."* Large Scarf (2 lb): *"You have Advantage on checks to conceal visible mouth and neck transformations."* Leather Gloves (2 lb): *"May give relevant advantages / disadvantages during play. The player has to themselves explain how using the gloves in a particular situation will bring some advantage to a check."* Leather Boots (2 lb): *"Prevents barefoot penalties."*
- **code_location**: `src/data/armor.ts:142-228` — all four head-gear entries carry `special: "May hide face transformations."` plus an `impression` flavour line ("Reads as a hard-hitting brawler." etc.); Small Scarf claims *"gives little protection against smoke, ash, cold or stench"*; Large Scarf claims *"Protects against smoke, ash or stench"*; Leather Gloves lists a concrete advantage/disadvantage set ("heat, glass, bites and thorns; disadvantage on delicate hand tasks and reloading small firearms") that no longer appears in any source.
- **verdict**: mismatch (categories, AC 0, subcategories and weights are all correct — only the `special` strings drift)
- **proposed_change**: Rewrite the four head-gear `special` strings to "Is given by class."; rewrite both scarf strings and the gloves string verbatim from [page 38]. Leather Boots already matches. The `impression` fields feed the sheet's "Current impression" line (`CharacterSheetArmorRules.tsx:22`) and are app flavour outside the source — leave them if the maker wants them, otherwise they are the only removable content here.
- **stored_data_impact**: none — `extraArmorIds` store ids only; the strings are catalog-side.

---

### Robe of the Deepcallers weight is 4 lb in code, 2 lb in the source

- **txt_section**: core-rulebook.txt [page 124] "ROBE OF THE DEEPCALLERS — Armor, 2 lb."
- **rule_summary**: Unique item, Equipment Category: Armor, **2 lb**. *"If you have worn this robe continuously since your previous Long Rest, add +2 to your Sanity Die roll when rolling it during a Long Rest."*
- **code_location**: `src/data/armor.ts:233-244` — `id: "robe"`, `weightLb: 4`; effect text matches
- **verdict**: mismatch (weight only)
- **proposed_change**: `weightLb: 4` → `weightLb: 2`.
- **stored_data_impact**: none — derived carried weight only.

---

### Add-on limit of five, Balanced Fit sixth slot, and Shield Arm +2 all match

- **txt_section**: core-rulebook.txt [page 33] ("choose one Main Armor and up to five Add-on Armor pieces"), [page 34] Armor Type table, [page 35] Hunter Leather Jacket "Balanced Fit"
- **rule_summary**: One Main Armor; max five Add-on pieces; Armor Upgrades are not Add-on pieces; one Extra per subcategory; a pauldron + vambrace on the **same** arm count together as one Shield Arm for **+2 AC total** and only one Shield Arm benefits. Balanced Fit lets one Add-on piece not count toward the maximum.
- **code_location**: `src/lib/character.ts` — `maxAddonPieces()` (5, or 6 on Balanced Fit), `hasShieldArm()` (same-side pairing), `addonAcBonus()` (pauldron +1 + vambrace +0 + 1 = 2 total, single bonus); `dedupeExtras()` (first Extra per subcategory); `CharacterSheetAddonArmor.tsx` enforces the limit in the UI; Studs is `category: "Armor Upgrade"` and is not offered in the Add-on picker.
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

---

### Main Armor and Add-on catalog rows are otherwise verbatim-correct

- **txt_section**: core-rulebook.txt [page 35] "Armor Part 1"
- **rule_summary**: Hunter Leather Vest/Jacket AC 11 6 lb; Coat AC 11 7 lb; Reinforced Vest/Jacket AC 12 10 lb; Reinforced Coat AC 12 11 lb; Full Leather Cuirass +2 AC 10 lb; Pauldrons +1 AC 2 lb; Vambraces +0 AC 2 lb; Under Layer Leather Jerkin +1 AC* 2 lb.
- **code_location**: `src/data/armor.ts:9-127`
- **verdict**: match on every AC and weight
- **proposed_change**: One wording nit — the Jerkin's source text is *"harder to steal, **find**, or strip away"*; `armor.ts:126` omits "find". Optional single-word fix.
- **stored_data_impact**: none

---

### Layering order (step 1 "Background Garments") is absent from the app

- **txt_section**: core-rulebook.txt [page 33] "1: CHOSE AND EQUIP ARMOR" — the five-row Step/Layer table
- **rule_summary**: Visualization order: 1 Background Garments (what an unarmored character of your background wears), 2 Main Armor (worn over or replacing them), 3 Add-on Armor (over Main Armor), 4 Extras and Class-/Background-specific Gear, 5 Carried Items. Explicitly flavour/visualization, with no mechanical effect.
- **code_location**: `CharacterSheetArmorDoll.tsx` covers layers 2–4; `CharacterSheetArmorRules.tsx` covers add-on/studs/Shield Arm; nothing mentions Background Garments.
- **verdict**: missing_in_code (low priority — no mechanics attached)
- **proposed_change**: Optional: add one `<article>` to the existing "Armor rules" drawer list in `CharacterSheetArmorRules.tsx` summarising the layer order and noting that an unarmored hunter still wears their Background Garments. No new component or layout.
- **stored_data_impact**: none

---

### Class Overview (both parts) matches `classes.ts` exactly

- **txt_section**: core-rulebook.txt [pages 30–31] "Class Overview Part 1 / Part 2"; cross-checked against [page 42] "Level 1 Hit Points by Class"
- **rule_summary**: Brute STR-or-DEX / STR+CON / d10 / 30 ft / L+M+H / choose 2 / Simple+Martial / no tools. Scout DEX and WIS / STR+DEX / d10 / 35 ft / L+M / choose 3. Stalker DEX / DEX+INT / d8 / 30 ft / Light / choose 2 / Simple + Finesse-or-Light Martial / Thieves Tools. Deepcaller INT / INT+WIS / d6 / 30 ft / Light / choose 2 / Simple. Bloodbound CON / STR+CON / d12 / 30 ft / L+M / choose 2 / Blood-drainer's Tools. Warden WIS and CHA / WIS+CHA / d10 / 30 ft / L+M+H / choose 2. Level-1 HP = hit die + CON modifier.
- **code_location**: `src/data/classes.ts` (all six entries); `src/lib/character.ts:32-38` `maxHp()`; `proficiencyBonus()` gives +2 at level 1 per [page 31]
- **verdict**: match — every primary ability, saving-throw pair, hit die, speed, armor training, weapon/tool proficiency and skill-choice list is identical
- **proposed_change**: none. (The txt prints "Eldrich Knowledge" for the Deepcaller; the app's "Eldritch Knowledge" is the correct spelling used elsewhere in the source — do not "fix" the app to the typo.)
- **stored_data_impact**: none

---

### Item slots match the source

- **txt_section**: core-rulebook.txt [page 41] "By default your character has…"
- **rule_summary**: Unlimited Insignificant slots (limited only by weight); 3 Significant slots — 1 hip, 1 back, 1 front; hands carry either 2 Significant or 1 Oversized; storage gear adds Significant slots at a stated location.
- **code_location**: `src/data/storage.ts` `BASE_SLOTS` (back 1, chest 1, hip 1, ankle 0, hand 2 significant / 1 oversized); `src/lib/slots.ts` `computeSlots()` enforces the hand XOR rule and the storage grants
- **verdict**: match ("front" renders as the sheet's "chest"; the `ankle` location exists only as an Ankle Holster grant with base capacity 0)
- **proposed_change**: none
- **stored_data_impact**: none
