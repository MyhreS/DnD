# A15 — Chapter 6 Equipment: weapons, weapon properties, mastery properties

Covers `core-rulebook.txt` **[page 107]–[page 113]** (Chapter 6 opening, Coins,
Bullets, Weapons preamble, Damaging Objects, Improvised Weapons, Weapon
Proficiency, Properties, Mastery Properties, the Weapons table, the two weapon
illustration plates).

This was the one uncovered stretch of the Core Rulebook: A16 picks Chapter 6 up
at [page 114] (Armor) and runs to [page 124]; A01/A02 cite the combat chapters
and touch `weapons.ts` only for Unarmed Strike, `Nick` and proficiency-adds-to-
attack. Nothing analysed the Weapons table itself.

### The Weapons table lists 29 weapons; the app catalog has 10
- **txt_section**: core-rulebook.txt [page 111] "Weapons" — Simple Melee (Club, Dagger, Greatclub, Handaxe, Javelin, Light Hammer, Mace, Sickle, Spear), Simple Ranged (Throwing Knife), Martial Melee (Battleaxe, Flail, Glaive, Greataxe, Greatsword, Halberd, Longsword, Maul, Morningstar, Pike, Rapier, Scimitar, Shortsword, Trident, Warhammer, War Pick, Whip), Martial Ranged (Hunter Rifle, Pistol).
- **rule_summary**: 29 rows, each with Damage, Properties, Mastery, Weight and Carrying category.
- **code_location**: `src/data/weapons.ts` `WEAPON_FACTS` (10 keys + `hunter-cleaver`); `src/data/items.ts` ITEMS "Weapons: blades" / "Weapons: firearms" (11 weapon items).
- **verdict**: missing_in_code
- **proposed_change**: Add the 19 absent weapons to `WEAPON_FACTS` and to `ITEMS` verbatim from the table (name, damage + type, properties string, mastery, weight, carry). Keep `hunter-cleaver` — it is class starting equipment (A08), not a table weapon. Ordering/UI unchanged; both catalogs are flat maps/arrays that the existing gear and mastery lists render as-is.
- **stored_data_impact**: none — purely additive. Existing `inventory`/`weaponMasteries` ids stay valid.

### `Hunter Rifle` is a standard Martial Ranged weapon, not a Unique Item
- **txt_section**: core-rulebook.txt [page 111] Martial Ranged Weapons — "Hunter Rifle 1d10 Piercing, Ammunition (100/400; Bullet), Two-Handed, Slow, 10 lb., Significant Item (back)". [page 113] lists it on the standard Martial Ranged plate.
- **rule_summary**: It sits in the ordinary Weapons table alongside the Pistol. The old source set treated it as a unique item; the beta does not.
- **code_location**: `src/data/items.ts` `hunter-rifle` (`unique: true`, note "The hunter's sacred thunder."); the header comment at the top of the file still says Hunter Rifle is unique "(the resources call them 'unique item')". Also `scripts/codex-data-test.ts` asserts `searchEntries(CODEX_TOPICS, "Hunter Rifle").length === 0` under the banner "retired source content returned".
- **verdict**: mismatch
- **proposed_change**: Drop `unique: true` from `hunter-rifle`, fix the file-header comment, and add `slotLocation: "back"` (see below). Remove "Hunter Rifle" from the retired-content list in `scripts/codex-data-test.ts` and `scripts/e2e-codex.mjs` — it is current content again.
- **stored_data_impact**: none structurally; any UI that badges unique items simply stops badging it.

### Carrying column: Javelin and Hunter Rifle are back-slot items
- **txt_section**: core-rulebook.txt [page 111] — "Javelin … Significant Item (back)", "Hunter Rifle … Significant Item (back)". Every other row is plain Significant / Oversized / Insignificant.
- **rule_summary**: The parenthetical pins the item to the back slot.
- **code_location**: `src/data/items.ts` — `hunter-rifle` has `carry: "Significant"` and **no** `slotLocation`. The field exists and is used (`shovel` has `slotLocation: "back"`), so the mechanism is already there.
- **verdict**: mismatch
- **proposed_change**: Add `slotLocation: "back"` to `hunter-rifle`, and to `javelin` when it is added.
- **stored_data_impact**: Stored inventories that place a Hunter Rifle in a non-back slot become invalid under `src/lib/slots.ts`. Migration should move any equipped Hunter Rifle to the back slot (or to Hand, which weapons may always use per the catalog comment) and report the move.

### Weapon Category (Simple / Martial) is not modelled at all
- **txt_section**: core-rulebook.txt [page 107] "Category. Every weapon falls into a category: Simple or Martial. Weapon proficiencies are usually tied to one of these categories."; [page 108] "Weapon Proficiency — you must have proficiency with it to add your Proficiency Bonus to an attack roll".
- **rule_summary**: Proficiency is granted per category, and the Weapons table is grouped by category.
- **code_location**: `src/data/weapons.ts` `WeaponFacts` has `damage/damageType/properties/mastery/attack` — no category. `src/data/classes.ts` grants proficiencies as prose strings.
- **verdict**: missing_in_code
- **proposed_change**: Add `category: "Simple" | "Martial"` to `WeaponFacts` and populate it from the table's group headings. This is the field A09's finding ("mastery-weapon picker is a hardcoded list that contradicts the proficiency rule") needs in order to filter `automation.masteryWeapons` by what the class is actually proficient with, in `src/features/hunter/components/character-sheet/CharacterSheetWeaponMasteryChoices.tsx`.
- **stored_data_impact**: none.

### Weapon properties have no in-app glossary, unlike masteries
- **txt_section**: core-rulebook.txt [page 109]–[page 110] "Properties" — Ammunition, Finesse, Heavy, Light, Loading, Range, Close Range, Reach, Thrown, Two-Handed, Versatile (11 definitions).
- **rule_summary**: Each is a defined rule (e.g. Light grants a Bonus Action extra attack with a *different* Light weapon and adds no ability modifier to its damage unless negative; Close Range removes the within-5-feet Disadvantage).
- **code_location**: `src/data/weapons.ts` exports `WEAPON_MASTERY_DESCRIPTIONS` (8 masteries, all correct — see below) but nothing equivalent for properties. `AppGearSection.tsx` and `CharacterSheetWeaponMasteryChoices.tsx` render `facts.properties` as an opaque string.
- **verdict**: missing_in_code
- **proposed_change**: Add a sibling `WEAPON_PROPERTY_DESCRIPTIONS` record with the 11 verbatim definitions, and surface it exactly the way mastery text is already surfaced (the small description line under the weapon). No new component or layout.
- **stored_data_impact**: none.

### Heavy now carries an explicit ability-score gate
- **txt_section**: core-rulebook.txt [page 109] "HEAVY — You have Disadvantage on attack rolls with a Heavy weapon if it's a Melee weapon and your Strength score isn't at least 13 or if it's a Ranged weapon and your Dexterity score isn't at least 13."
- **rule_summary**: A hard, checkable threshold on the character's own scores.
- **code_location**: ABSENT. `src/lib/character.ts` derives no per-weapon attack state; the Heavy string is display-only.
- **verdict**: missing_in_code
- **proposed_change**: This is the same shape as the armor Strength requirement (A05/A06 propose surfacing 13 STR at 16 AC / 15 STR at 17+ AC). Handle it the same way: a warning line on the weapon in the gear section when the wielder's STR (melee) or DEX (ranged) is under 13. Do not auto-apply Disadvantage — the app does not roll attacks.
- **stored_data_impact**: none.

### Mastery property definitions — confirmed exact match
- **txt_section**: core-rulebook.txt [page 110] "Mastery Properties" — Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex.
- **rule_summary**: Eight properties; all eight paraphrases in code are faithful, including the once-per-turn limits on Cleave and Nick, Push's "Large or smaller … 10 feet", Topple's Constitution save, Slow's 10-foot non-stacking reduction, and Vex's "before the end of your next turn".
- **code_location**: `src/data/weapons.ts` `WEAPON_MASTERY_DESCRIPTIONS` (8 keys).
- **verdict**: match
- **proposed_change**: none. (Topple's DC — "DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus" — is omitted from the paraphrase; adding it would be a one-sentence improvement, not a correction.)
- **stored_data_impact**: none.

### Damage, properties, mastery and weight of the 10 catalogued weapons — confirmed match
- **txt_section**: core-rulebook.txt [page 111].
- **rule_summary**: Dagger 1d4 P / Finesse, Light, Thrown (20/60) / Nick / 1 lb.; Handaxe 1d6 S / Light, Thrown (20/60) / Vex / 2 lb.; Sickle 1d4 S / Light / Nick / 2 lb.; Greataxe 1d12 S / Heavy, Two-Handed / Cleave / 14 lb. Oversized; Greatsword 2d6 S / Heavy, Two-Handed / Graze / 14 lb. Oversized; Longsword 1d8 S / Versatile (1d10) / Sap / 3 lb.; Scimitar 1d6 S / Finesse, Light / Nick / 3 lb.; Shortsword 1d6 P / Finesse, Light / Vex / 2 lb.; Hunter Rifle 1d10 P / Ammunition (100/400; Bullet), Two-Handed / Slow / 10 lb.; Pistol 1d10 P / Ammunition (30/90; Bullet) / Vex / 3 lb.
- **code_location**: `src/data/weapons.ts` `WEAPON_FACTS`; `src/data/items.ts` weights and carry categories.
- **verdict**: match
- **proposed_change**: none — every value survives the beta unchanged. Worth recording so these rows are not "refreshed" during the sweep.
- **stored_data_impact**: none.

### Bullets weigh something; the catalog says they weigh nothing
- **txt_section**: core-rulebook.txt [page 107] "Bullets" — "Each bullet weighs approximately one-third of an ounce. Fifty bullets weigh one pound. Bullets is counted as Insignificant Items." Same wording for Coins ("Fifty coins weigh one pound. Coins is counted as Insignificant Items.").
- **rule_summary**: Insignificant for slot purposes, but with a real per-fifty weight.
- **code_location**: `src/data/items.ts` `bullets` — `weightLb: 0`, note "Bullets have no carried weight."
- **verdict**: mismatch
- **proposed_change**: Keep `carry: "Insignificant"` (correct), but change the note to the source's rule — 50 bullets weigh 1 lb. If the app ever totals weight, price it at 0.02 lb each. Minimal fix: correct the note text so it stops contradicting the rulebook.
- **stored_data_impact**: none unless a derived carried-weight total is stored; it is not.

### Silver Bullets are an explicit sub-type of Bullets
- **txt_section**: core-rulebook.txt [page 107] — "There are different bullets, such as Silver Bullets, but these still fall under the umbrella of Bullets."
- **rule_summary**: Silver Bullets are named by the rulebook and share the Bullets ammunition type.
- **code_location**: ABSENT (A16 records the same absence from the gear side).
- **verdict**: missing_in_code
- **proposed_change**: Same fix as A16's — one `silver-bullets` item, Insignificant, noting it counts as Bullets. Flagged here only so the two findings are not implemented twice.
- **stored_data_impact**: none.

### Improvised Weapons and Damaging Objects have no app surface
- **txt_section**: core-rulebook.txt [page 108] "Damaging Objects" — Fragile Object AC 10 / 5 HP, Sturdy AC 15 / 15 HP, Reinforced AC 20 / 30 HP; objects are normally Immune to Poison and Mind damage; destroyed at 0 HP. "Improvised Weapons" — melee 1d4 B/P/S using Strength; thrown normal range 20 ft, long range 60 ft, 1d4, using Dexterity.
- **rule_summary**: Concrete GM-facing numbers.
- **code_location**: ABSENT. No object stat blocks in `src/features/play/**` or `src/features/game/**`; the Codex carries no rulebook prose at all (see B04).
- **verdict**: missing_in_code
- **proposed_change**: Reference-only text, like the mounted/obscurement rules A02 lists. It belongs in the Codex once the Codex is repointed at `core-rulebook.txt` (B04), not in the Hunter builder. No change to game/play code.
- **stored_data_impact**: none.

### "The app is the authoritative source for prices"
- **txt_section**: core-rulebook.txt [page 107] "Coins" — "The app is the authoritative source for prices. The GM determines which goods and services are available from a particular seller. If the app is unavailable, the GM may set a price or award equipment directly."
- **rule_summary**: The rulebook deliberately publishes no price list and delegates prices to this app. Coins come in a single denomination: Gold Pieces (GP).
- **code_location**: `src/data/items.ts` `Item` has no price field; `src/api/trades.ts` and the trade UI move items without prices. Backgrounds carry starting GP (A13).
- **verdict**: missing_in_code
- **proposed_change**: **None as part of this reconciliation.** The source names the app as the price authority but supplies no numbers, so there is nothing to sync — inventing a price list would be authoring game content, which the brief forbids. Record it as an explicit product question for the game maker: does he want a price catalog? Single denomination GP is already what the app uses, so no correction is needed there.
- **stored_data_impact**: none.
