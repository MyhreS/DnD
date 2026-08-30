# B03 — Data catalogs (Direction B: code → txt inventory audit)

Scope: `src/data/{classes,abilities,armor,weapons,items,skills,backgrounds,feats,
conditions,creatures,characterOptions,storage,classArt,creatureArt,codex}.ts`,
`feats.generated.json`, `codex.generated.json`, plus `src/types.ts` and
`src/config.ts`.

Method: every entry in every catalog was grepped against `docs/rules/*.txt`.
Direction A (A01–A17) was read first; this document does **not** repeat A's
rule-level findings except where an entry's *existence* is at stake. Where A
already covers a numeric drift, this file cites A and focuses on the **id-level
migration impact**.

**GM-only boundary:** a leak scan for `Old One Vessel`, `Second Threshold` and
`Hidden Condition` across `src/`, `public/` and `scripts/` found matches only in
`scripts/codex-data-test.ts:115` and `scripts/e2e-codex.mjs:112`, both of which
are **negative assertions** that those terms are absent from public output.
`resources/` contains only `README.md`, and `public/source-library/` does not
exist, so no Hidden Condition text reaches any build output. **No leak.**

---

## Catalog verdict summary

| Catalog | Entries | Keep | Update | Remove | Missing from catalog |
|---|---|---|---|---|---|
| `skills.ts` | 19 | 19 | 0 | 0 | 0 |
| `abilities.ts` | 6 + point-buy | 6 | 0 (comment only) | 0 | 0 |
| `classes.ts` | 6 classes / 11 subclasses | 6 / 11 ids | all 6 equipment lists | 0 | 0 |
| `backgrounds.ts` | 14 | 10 | 4 | 0 | 0 |
| `feats.generated.json` | 54 | 54 | 2 prereqs | 0 | 0 (artifact is orphaned) |
| `armor.ts` | 22 | 20 | 2 | 0 | 0 |
| `weapons.ts` (`WEAPON_FACTS`) | 11 | 10 | 0 | **1** | **19** |
| `items.ts` | 42 + 22 armor | 32 | 6 | **4** | **~35** |
| `characterOptions.ts` (`TOOL_PROFICIENCIES`) | 11 | 8 | 0 | **3** | 0 |
| `conditions.ts` (via `CURRENT_CONDITIONS`) | 6 | 5 | 0 | **1** | **21** |
| `storage.ts` | 6 | 6 | 0 | 0 | 0 |
| `creatures.ts` / `classArt.ts` / `creatureArt.ts` | 6 / 6 / 10 | all | 0 | 0 | 0 |
| `codex.generated.json` | 3 sources / 39 entries | — | — | **stale, regenerate** | core rulebook entirely |

---

## 1. `src/data/skills.ts`

### All 19 skills survive the beta unchanged — KEEP
- **app_location**: `/src/data/skills.ts` → `SKILLS`, `SKILL_BY_NAME`, `SHEET_SKILL_FIELD`
- **ui_or_logic_summary**: drives skill proficiency pickers, the sheet's skill rows, and `characterAutomation` skill modifiers.
- **txt_section**: core-rulebook.txt [page 11] "Skills" table (19 rows)
- **found_in_txt**: yes — every name and its ability matches, including the homebrew Grit (CON), Blood Nature (INT), Eldritch Knowledge (INT), Old World History (INT), Presence (CHA).
- **proposed_change**: keep. No additions, no removals.
- **stored_data_impact**: none. `HunterCard.skillProficiencies`, `sheetAutomation.classSkills` and `sheetAutomation.expertiseSkills` stay valid verbatim.

## 2. `src/data/abilities.ts`

### Six abilities, both point-buy tables — KEEP
- **app_location**: `/src/data/abilities.ts` → `ABILITIES`, `POINT_BUY_*`, `MADUHAUSU_*`, `abilityModifier()`
- **found_in_txt**: yes ([page 8] modifier table; A05 confirms 27/8–15 and the 57-point alternative numbers).
- **proposed_change**: keep. Only the stale doc comment on line 71–72 ("does not define a modifier formula") should be corrected — see A01/A05. The **name** "Maduhausu" does not appear in the beta txts (A05); it is an app-side label for a rule set whose numbers *do* match, so keep the id.
- **stored_data_impact**: none. `HunterCard.abilityMode: "pointbuy" | "maduhausu"` stays valid.

## 3. `src/data/classes.ts`

### All 6 class ids and all 11 subclass ids still exist — KEEP
- **app_location**: `/src/data/classes.ts` → ids `brute`, `scout`, `stalker`, `deepcaller`, `bloodbound`, `warden`; subclass ids `battle-master`, `champion`, `beast-caller`, `marksman`, `assassin`, `shadow`, `hunter-zealot`, `path-of-the-berserker`, `path-of-the-blood-drunk`, `commander`, `warbringer`.
- **found_in_txt**: yes — every subclass is named in the beta ([lines 2270, 2447, 2627, 2737, 2889, 3009, 3209, 3684, 4007]). No subclass was dropped, none added.
- **proposed_change**: keep every id. One display-name update: `path-of-the-blood-drunk` is printed **"Path of The Blood-Drunk"** (hyphen) at [line 3739] — code has "Path of the Blood Drunk" (A11).
- **stored_data_impact**: **none for `HunterCard.classId` / `subclassId`.** This is the single most important negative result for the migration script: no class or subclass id needs remapping.

### Starting-equipment lists: all six are wrong, and one names a weapon that no longer exists
- **app_location**: `/src/data/classes.ts` → `startingEquipment` on lines 25, 111, 198, 286, 374, 462
- **found_in_txt**: changed — core-rulebook.txt Core Traits tables:

| Class | txt (`Starting Equipment`) | code | delta |
|---|---|---|---|
| Brute [p49 / line 2206] | Greatsword, Shortsword, Bloodvial (1), Toolbelt, Rope, **Wide Brim Hat** | Greatsword, Shortsword, 1 Blood vial, Tool Belt, Rope | + Wide Brim Hat |
| Scout [p56 / line 2488] | Hunter Rifle, **Shortsword**, Bloodvial (1), Bullets (**20**), Toolbelt, Bandolier, Pistol, **Cavalier Hat** | Tool Belt, 1 Blood vial, **18** bullets, Hunter Rifle, **Hunter Cleaver**, Pistol, Bandolier | − Hunter Cleaver, + Shortsword, 18→20 bullets, + Cavalier Hat |
| Stalker [line 2826] | Scimitar, 4 Daggers, Pistol, Bullets (5), Toolbelt, Ankle Holster, Thieves Tools, **Cavalier Hat** | same minus the hat | + Cavalier Hat |
| Deepcaller [line 3082] | Sickle, Dagger, Bloodvial (1), Toolbelt, Book of the Deepcaller, Deepcallers Robe, **Cowl** | same minus the cowl | + Cowl |
| Bloodbound [line 3587] | Greataxe, 2 Handaxes, Blood-drainer's Tools, Blood Vials (**4**), Tool Belt, **Cowl** | same minus the cowl | + Cowl |
| Warden [line 3891] | Hunter Rifle, Longsword, Navigators Tools, Bell, 1 Hunting Trap, Tool Belt, Bandolier, Bullets (14), **Tricorn** | same minus the tricorn | + Tricorn |

- **proposed_change**: update all six lists. The four head-gear pieces already exist as **armor** ids (`wide-brim-hat`, `cavalier-hat`, `cowl`, `tricorn`), so `startingKit()` in `/src/lib/startingEquipment.ts` will push them to `unmatched` — grant them via `extraArmorIds` in the kit, or add name→armor-id handling there. This matches the "Is given by class" note in the Armor Part 2 table [page 38].
- **stored_data_impact**: `sheetAutomation.startingKitInventory` is stored per character and will no longer equal the freshly computed kit. **Do not rewrite a player's `inventory`** — the kit-diff logic exists precisely so later purchases survive. Safe migration: leave `inventory` alone; only refresh `startingKitInventory` for cards where `startingKitApplied` is true *and* the current inventory still exactly equals the stored kit.

### `primaryAbility` and `baseClass` have no source row
- **app_location**: `/src/data/classes.ts` → `primaryAbility` (lines 15, 101, 188, 276, 364, 452), `baseClass` (lines 26, 112, 199, 287, 375, 463)
- **found_in_txt**: no. The beta Core Traits tables list Hit Point Die, Max Sanity, Sanity Die, Saving Throw Proficiencies, Skill Proficiencies, Weapon Proficiencies, Tool Proficiencies, Armor Training, Starting Equipment, Speed — and no "Primary Ability". `baseClass` ("Fighter", "Ranger", "Rogue", "Warlock", "Barbarian") is 5e lineage, never printed.
- **proposed_change**: `baseClass` is display-only scaffolding with no rule behind it — candidate for removal if nothing renders it. `primaryAbility` is UI guidance in the builder; harmless, but the label should not be presented as a rule (A07/A08 flag the same).
- **stored_data_impact**: none — neither is stored on the card.

### `hitDie`, `saves`, `skillChoices`, `toolProficiencies` — KEEP
- **found_in_txt**: yes, verified against each Core Traits table (e.g. Brute D10 / STR+CON / choose 2 of Acrobatics, Athletics, Grit, Perception, Survival, Intimidation / Tools: None). Warden's tool list is missing Navigator Tools (A12).
- **stored_data_impact**: none.

## 4. `src/data/backgrounds.ts`

All **14** background ids exist in the beta [pages 94–95] with matching prose and ability triads. No background was added or removed. Four rows need value updates (all already found by A13; repeated here for the migration inventory):

| id | field | code | txt [p95] | stored impact |
|---|---|---|---|---|
| `noble` | `equipment` | `["30 GP"]` | **50 GP** | cards built with Noble hold `coins` 20 GP short; `startingKitCoins` stale |
| `cultist` | `tool` | `Mason's Tools` | **Cultist Tools** | a stored `featSkills` entry naming "Mason's Tools" must remap |
| `weaponsmith` | `tool` | `Tinker's Tools` | **Smiths Tools** | same, remap to "Smith's Tools" |
| `church-missionary` | `equipment` | `["Brewer's Supplies","Antitoxin"]` | **Antitoxin** only | remove the `brewers-supplies` inventory line |

- **proposed_change**: update those four fields. Keep all 14 ids.
- **stored_data_impact**: `HunterCard.backgroundId` and `background` stay valid for all 14. `feat` values (Alert, Lucky, Tavern Brawler, Listener, Savage Attacker, Tough, Skilled) all still exist in the feat catalog — no remap.

## 5. `src/data/feats.ts` + `feats.generated.json`

### All 54 feats still exist; the roster is complete both ways
- **app_location**: `/src/data/feats.generated.json` (54 entries), read through `/src/data/feats.ts` → `FEATS`, `ORIGIN_FEATS`, `GENERAL_FEATS`, `FIGHTING_STYLE_FEATS`, `EPIC_BOON_FEATS`
- **found_in_txt**: yes — the ALL-CAPS feat headers in core-rulebook.txt [pages 96–110] match the 54 ids one-for-one across all four categories (7 Origin / 29 General / 9 Fighting Style / 9 Epic Boon). Nothing in the chapter is absent from the JSON, and nothing in the JSON is absent from the chapter.
- **proposed_change**: keep every id. Two prerequisite strings need the Strength gate restored (`general:heavily-armored` → "Strength 13+", `general:moderately-armored` → "Strength or Dexterity 13+" — A13/A14).
- **stored_data_impact**: **none.** `HunterCard.feat`, `HunterCard.feats[]`, `sheetAutomation.levelFeats` and `levelAbilityBonuses` keys all remain resolvable. No feat id needs remapping.

### `feats.generated.json` is an orphaned build artifact — CRITICAL for the plan
- **app_location**: `/src/data/feats.generated.json`
- **found_in_txt**: n/a
- **verdict**: **stale artifact.** Its generator input was `resources/master.json`, which is deleted (`resources/` now contains only `README.md`), and no script in `/scripts/` emits this file — `generate-codex-data.mjs` writes only `codex.generated.json`. The file is therefore frozen at its pre-beta content and cannot be regenerated.
- **proposed_change**: because the *content* is correct against the beta (see above), the cheapest correct fix is to **stop calling it generated**: rename it to a hand-maintained `feats.data.json` (or inline it into `feats.ts`), drop the "AUTO-GENERATED" framing, and apply the two prerequisite edits by hand. Do **not** leave a `.generated.json` in the tree with no generator.
- **stored_data_impact**: none (pure rename of a build-time asset).

## 6. `src/data/armor.ts`

All 22 armor ids appear in the beta Armor tables [pages 35 and 38] plus the Unique Items page [124]. No armor piece was added or removed.

- 6 Main Armor (`hunter-leather-{vest,jacket,coat}`, `reinforced-hunter-leather-{vest,jacket,coat}`) — AC 11/11/11/12/12/12 and weights 6/6/7/10/10/**11** all match; the code has 11 for the reinforced coat. KEEP.
- 5 Add-on (`full-leather-cuirass` +2, `leather-pauldron-{right,left}` +1, `leather-vambrace-{right,left}` +0) + `under-layer-leather-jerkin` +1* — all match. KEEP.
- `studs` — **UPDATE**: the beta requires **three** studded Add-on pieces for +1 AC and **five** for +2, at **5 lb per studded piece**. Code grants +1 from one piece and charges 3 lb (A05/A06).
- 8 Extras (`tricorn`, `cavalier-hat`, `cowl`, `wide-brim-hat`, `small-scarf`, `large-scarf`, `leather-gloves`, `leather-boots`) — present with correct 1/1/1/1/1/2/2/2 lb. Their `special` strings are app-written paraphrases that now drift from the printed Special column (A05). KEEP the ids; align the text.
- `robe` ("Robe of the Deepcallers") — **UPDATE**: source [page 124] says "Armor, **2 lb**"; code has `weightLb: 4`.
- **stored_data_impact**: no armor id changes. `mainArmorId`, `addonArmorIds`, `extraArmorIds` all stay valid. Two **derived** values must be recomputed for every card: (a) AC, because the Studs threshold moved from 1 piece to 3 — cards with 1 or 2 studded pieces **lose +1 AC**; (b) carried weight, because studded pieces go 3 lb → 5 lb and the Robe goes 4 lb → 2 lb. `studdedAddonIds` (and the deprecated `studdedAddons` count) need no value change, only recomputation of what they produce.

## 7. `src/data/weapons.ts`

### `hunter-cleaver` no longer exists anywhere in the beta — REMOVE
- **app_location**: `/src/data/weapons.ts` → `WEAPON_FACTS["hunter-cleaver"]`; `/src/data/items.ts` id `hunter-cleaver` (Weapon, Significant, 4 lb); `/src/data/classes.ts:111` Scout `startingEquipment`.
- **ui_or_logic_summary**: appears in the Scout's starting kit, in inventory, and in the sheet's weapon reference as `damage: "—", damageType: "DM-set", properties: "Unique Scout weapon; statistics set by the DM"`.
- **found_in_txt**: **no.** A case-insensitive grep for `cleaver` across all five txts returns **zero** hits. The Scout's Starting Equipment [line 2488] now reads **Shortsword** in the slot the Cleaver occupied, and the Weapons table [page 111] has no such row.
- **proposed_change**: **remove** — from `WEAPON_FACTS`, from `ITEMS`, and from the Scout's `startingEquipment` (replaced by `Shortsword`). This is a genuine "the concept is gone" removal, exactly the kind the brief wants.
- **stored_data_impact**: **HIGH.** Every existing Scout card built through the app holds `inventory: [{ itemId: "hunter-cleaver", qty: 1 }]` and a matching entry in `sheetAutomation.startingKitInventory`, plus a `slotAssignments` placement keyed on `hunter-cleaver`. There is **no remap target** — the Shortsword is a different weapon, not a rename. Recommended migration: convert each stored `hunter-cleaver` line into a `customItems` entry (`source: "found"`, name "Hunter Cleaver", `catalogBaseId: "shortsword"`) so the player does not silently lose a carried weapon, **or** leave the line untouched and let `resolveInventory` drop it — but that must be a deliberate, dry-run-reviewed choice by Simon, not a silent delete. Also prune the dangling `slotAssignments["hunter-cleaver"]` key either way.

### 10 remaining `WEAPON_FACTS` rows match the beta exactly — KEEP
- **found_in_txt**: yes, core-rulebook.txt [page 111] Weapons table. Dagger 1d4 P / Finesse, Light, Thrown (20/60) / Nick; Handaxe 1d6 S / Light, Thrown (20/60) / Vex; Sickle 1d4 S / Light / Nick; Greataxe 1d12 S / Heavy, Two-Handed / Cleave; Greatsword 2d6 S / Heavy, Two-Handed / Graze; Longsword 1d8 S / Versatile (1d10) / Sap; Scimitar 1d6 S / Finesse, Light / Nick; Shortsword 1d6 P / Finesse, Light / Vex; Hunter Rifle 1d10 P / Ammunition (100/400; Bullet), Two-Handed / Slow; Pistol 1d10 P / Ammunition (30/90; Bullet) / Vex. **Every damage die, damage type, property string and mastery is verbatim correct.**
- **proposed_change**: keep, untouched.
- **stored_data_impact**: none.

### 19 weapons in the beta table are missing from the catalog
- **txt_section**: core-rulebook.txt [page 111], full Weapons table (30 rows)
- **missing**: Simple Melee — Club, Greatclub, Javelin, Light Hammer, Mace, Spear. Simple Ranged — Throwing Knife. Martial Melee — Battleaxe, Flail, Glaive, Halberd, Maul, Morningstar, Pike, Rapier, Trident, Warhammer, War Pick, Whip.
- **proposed_change**: add all 19 to `WEAPON_FACTS` **and** `ITEMS`, with the table's weights and Carrying Categories (e.g. Glaive 12 lb Oversized, Rapier 2 lb Significant, Throwing Knife ¼ lb Insignificant). This matters mechanically, not just cosmetically: `sheetAutomation.weaponMasteries` lets a Brute pick "three kinds of Simple or Martial weapons", and the current 11-item catalog makes most legal picks unselectable (A09 makes the same point for the Stalker).
- **stored_data_impact**: none (pure additions). Backfill not required.

### `WEAPON_MASTERY_DESCRIPTIONS` — 8 masteries, all still defined
- **found_in_txt**: yes, [pages 110–111] "Mastery Properties": Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex. The code's wording matches each printed effect, including Topple's Constitution save and Nick's "instead of using a Bonus Action".
- **proposed_change**: keep. Optional precision: Slow's "the reduction doesn't exceed 10 feet" clause when hit multiple times is not in the code's summary.
- **stored_data_impact**: none — `sheetAutomation.weaponMasteries` stores weapon names, not mastery names, and all 8 mastery names survive.

## 8. `src/data/items.ts`

### Items whose concept is gone — REMOVE
| id | name | txt evidence | migration |
|---|---|---|---|
| `hunter-cleaver` | Hunter Cleaver | zero hits in any txt | see §7 — no remap target |
| `bedroll` | Bedroll | absent from the closed Hunter Gear table [p121] | drop line; recompute weight (−7 lb) |
| `rations` | Rations | absent from the Hunter Gear table | drop line; recompute weight (−2 lb/ea) |
| `letter` | Letter | appears only inside a carried-weight *example* [line 1860], not as gear | drop line (0 lb, no weight effect) |
| `brewers-supplies` | Brewer's Supplies | not among the five Artisan's Tools [p115]; removed from Church Missionary's kit [p95] | drop line; recompute weight (−9 lb) |

`key` is borderline: it is also only in the weight example, but the Lock and Manacles entries [lines 5279, 5299] both state the item "comes with a key", so it has a source-supported reason to stay. Recommend keeping `key`.

- **stored_data_impact**: cards holding any of these lose the inventory entry. `resolveInventory` drops unknown ids silently, so nothing crashes — but `totalCarriedWeight` falls and the carry/slot state must be recomputed, and every `slotAssignments` key naming a removed id must be pruned or it becomes a dangling placement.

### Items that need value/identity updates
- `book-of-eldritch-knowledge` (Gear, Significant, 5 lb) — **split.** The beta defines two distinct things: generic **Book** (Hunting Gear, 5 lb, Significant, grants +5 to INT checks on its topic) [page 117], and **Book of the Deepcaller** (Unique Item, Significant, 5 lb) [page 124]. The alias map in `/src/lib/startingEquipment.ts:6` currently collapses *both* names onto `book-of-eldritch-knowledge`. Proposed: introduce `book` and `book-of-the-deepcaller`; keep `book-of-eldritch-knowledge` as a **legacy alias only**, remapping stored ids → `book-of-the-deepcaller` for Deepcaller cards (that is where the app granted it) and → `book` otherwise.
- `lantern` (Gear, Significant, 2 lb) — **split.** The beta has no generic "Lantern": it defines **Lantern, Bullseye** (2 lb, 60-ft cone) and **Lantern, Hooded** (2 lb, 30-ft radius, hood as a Bonus Action) [page 118], plus a separate **Lamp** (1 lb, already correct in the catalog). Proposed: add `lantern-bullseye` and `lantern-hooded`; remap stored `lantern` → `lantern-hooded` (the closer analogue, same weight, no AC/weight change).
- `blood-vial` (0 lb) — **update** to **0.5 lb** per Unique Items [page 122] "Insignificant Item, 0,5 lb". Recompute carried weight for every card (most cards carry 1–4).
- `thieves-tools`, `navigators-tools`, `blood-drainers-tools` (all `carry: "Insignificant"`) — **update** to `Significant`: [page 114] "Carrying Category. **All Tools are Significant Items.**" This changes slot consumption for essentially every Stalker, Warden and Bloodbound card.
- `blood-drainers-tools` is flagged `unique: true`; the beta lists it under plain "Other Tools" [page 115], not Unique Items. Drop the flag.
- `antitoxin` note — see A16; the note contradicts the printed Bonus-Action rule.

### Items missing from the catalog (~35)
- **Artisan's Tools (5)** [page 115]: Alchemist's Supplies (8 lb), Carpenter's Tools (6 lb), Cultist's Tools (8 lb), Poisoner's Kit (2 lb), Smith's Tools (10 lb) — all are `tool` values referenced by `backgrounds.ts` and `TOOL_DETAILS` but have **no item row**, so a background that grants them produces an `unmatched` starting-kit line today.
- **Hunting Gear (~28)** [pages 116–121]: Acid, Ball Bearings, Barrel, Basket, Block and Tackle, Book, Bottle Glass, Bucket, Caltrops, Candle, Chest, Flask, Grappling Hook, Ink, Ink Pen, Jug, Ladder, Lantern Bullseye, Lantern Hooded, Lock, Mirror, Net, Paper, Parchment, Poison Basic, Pole, Pot Iron, Ram Portable, Signal Whistle, Spikes Iron, String, Tinderbox, Vial.
- **Unique Items (1)**: Silver Bullets (Insignificant, same weight as Bullets, +1d6 vs Dreadbloods) [page 123].
- **proposed_change**: add, with the table's exact weights and Carrying Categories. Pure additions.
- **stored_data_impact**: none.

### Bloodvial purity is a rule the item catalog cannot express
- **txt_section**: core-rulebook.txt [pages 122–123] "BLOODVIAL"
- **rule_summary**: four purities — Tainted (2d4+2 HP, −2 Madness, DC 10 Grit or +1 Transformation Level & +3 Madness), Stirred (4d4+4, −4, DC 15 → +1 TL & +6 Madness), Concentrated (8d4+8, −8, DC 20 → +2 TL & +10 Madness), Pure Old Blood (full HP + all Madness removed *or* raise a 1-round-dead creature; DC 25 → +6 TL & +15 Madness).
- **app_location**: `/src/data/items.ts` id `blood-vial` — a single undifferentiated Consumable.
- **proposed_change**: this is a genuine content gap, but it is a **mechanics** change (four variants with saves), not a catalog rename. Flag it for the plan; out of scope for a pure id migration.
- **stored_data_impact**: if purities become four ids, stored `blood-vial` should default to `blood-vial-tainted` ("the most common form"). Prefer keeping one id until the mechanic is actually built.

## 9. `src/data/characterOptions.ts`

### Three tool proficiencies no longer exist — REMOVE
- **app_location**: `/src/data/characterOptions.ts` → `TOOL_PROFICIENCIES` (11 values, feeding the `ToolProficiency` union type and `TOOL_DETAILS`)
- **found_in_txt**: the beta's complete tool roster is **8**: five Artisan's Tools [page 115] — Alchemist's Supplies (INT), Carpenter's Tools (STR), Cultist's Tools (INT), Poisoner's Kit (INT), Smith's Tools (DEX) — and three Other Tools — Blood-drainer's Tools (CON), Navigator's Tools (WIS), Thieves' Tools (DEX). **Brewer's Supplies, Mason's Tools and Tinker's Tools appear nowhere in any txt.**
- **proposed_change**: remove those three from `TOOL_PROFICIENCIES` and `TOOL_DETAILS`. The remaining eight are all present with the **correct governing ability** — a non-obvious confirmed match, including Smith's Tools = Dexterity (not Strength) and Blood-drainer's = Constitution.
- **stored_data_impact**: **MEDIUM.** Tool names are stored in `HunterCard.featSkills` (the Skilled feat's three picks; skill picks are mirrored into `skillProficiencies`, tool picks live *only* here). Remaps: `"Mason's Tools"` → `"Cultist's Tools"` for Cultist-background cards (that is the slot it filled), `"Tinker's Tools"` → `"Smith's Tools"` for Weaponsmith cards, `"Brewer's Supplies"` → **drop** (no successor). A free `featSkills` pick of any of the three should be dropped and the player re-prompted rather than silently reassigned. Note the union type is compile-time only, so stale strings do not crash — they simply stop resolving in `TOOL_DETAILS`.

### `TOOL_DETAILS` descriptions — mostly verbatim, two need Craft lines
- Alchemist's/Carpenter's/Cultist's/Poisoner's/Navigator's/Thieves'/Blood-drainer's descriptions match their printed Utilize entries including DCs. Smith's Tools has no Utilize in the source (Craft only) and the code's text is app-authored. The **Craft** lists (e.g. Smith's crafts Hunter Rifle, Pistol, Bell, Bullseye Lantern, Hooded Lantern, Hunting Trap, Lock, Manacles, Mirror, Shovel, Signal Whistle, Tinderbox) are absent from the app.
- **stored_data_impact**: none.

### Rites / Whispers projections — content correct, pipeline dead
- **app_location**: `/src/data/characterOptions.ts` → `WHISPERS`, `DEEPCALLER_RITES`, `DEEPCALLER_WHISPERS`, `forbiddenRevelationOptions()`, `whisperDamageAtLevel()`, `riteDamageAtStrain()`
- **found_in_txt**: yes — A10/A17 verified all 21 Rites and 6 Whispers against book-of-the-deepcaller.txt and whispers-sheet.txt, and confirmed the Strain/damage helpers. Keep the data and the helpers as-is.
- **proposed_change**: none to the values; see §12 for the generator problem that feeds them.
- **stored_data_impact**: **none.** All 21 rite ids and 6 whisper ids in `codex.generated.json` still exist under the same names, so `HunterCard.preparedWhispers[]` needs no remapping.

## 10. `src/data/conditions.ts`

### The condition list is 6 names; the beta prints 26 public ones
- **app_location**: `/src/data/conditions.ts` → `CONDITIONS`, `CONDITION_NAME`, derived from `codex.generated.json → conditionsNamedByCurrentSources`, which currently holds `["Blinded","Frightened","Incapacitated","Insane","Invisible","Restrained"]`.
- **ui_or_logic_summary**: the only condition picker in the combat tracker; ids are slugified names.
- **found_in_txt**: changed. core-rulebook.txt [pages 21–23] defines four subcategories:
  - **Impairments (9)**: Blinded, Deafened, **Mesmerized**, Frightened, Incapacitated, Paralyzed, Restrained, Stunned, Unconscious
  - **Hazards & Afflictions (6)**: Dying, Exhaustion, Poisoned, **Sleepless**, Suffocating, Underwater
  - **Battlefield States (10)**: **Blood-Tensed**, **Demoralized**, **Flanked**, Grappled, **High Ground**, Invisible, Prone, **Aiming Prone**, **Surrounded**, **Taunted**
  - **Special (2)**: Insane, and **Lost** — whose *name and pointer* are public but whose rules live in the GM-only Hidden Condition Sheet.
  Five of the six catalog names survive; **Charmed does not exist** in the beta at all (it is **Mesmerized** now — A10/A12), and the app's own class-feature text still says "Charmed" in places.
- **proposed_change**: replace the 6-name list with the 25 public conditions (all of the above except **Lost**, which must stay out of any player-facing picker; the GM tracker may name it, but never its Hidden Sheet text). Two are not booleans and need care: **Exhaustion** is a stacking level 1–6, and **Sleepless** is driven by a 24+ counter — the tracker's `conditions: string[]` set cannot express either (A03).
- **stored_data_impact**: **none on `HunterCard`.** Condition ids are stored on `/games/{gameId}/combatants/{id}.conditions` (`src/types.ts:262`), not on the character record — so this is out of the character-migration script's scope entirely. If any legacy combatant doc holds `"charmed"`, remap it to `"mesmerized"`; combatant docs are ephemeral per-game, so a remap is optional.

## 11. `src/data/storage.ts`, `creatures.ts`, `classArt.ts`, `creatureArt.ts`

### `storage.ts` — exact match, KEEP
- **found_in_txt**: yes, core-rulebook.txt [page 122] "Storage Items". Sack requires 1 Oversized (Hand) → gives 15 Significant (Hand); Backpack 1 Sig (Back) → 7 (Back); Bandolier 1 Sig (**Front**) → 4 (Front, rendered as `chest`); Toolbelt 1 Sig (Hip) → 4 (Hip); Carrying Harness 1 Sig (Back) → 2 (Back); Ankle Holster 0 slots (Ankle) → 1 Significant restricted to **Dagger, Pistol** (Ankle). All six requires/gives pairs, the ankle restriction, and `BASE_SLOTS` match.
- **proposed_change**: none. Confirmed non-obvious match.
- **stored_data_impact**: none — `equippedStorageIds` and `storage:<id>:<n>` slot assignments stay valid.

### `creatures.ts` / `classArt.ts` / `creatureArt.ts` — cosmetic, KEEP
- **app_location**: `CLASS_CREATURE`, `CLASS_ART`, `CREATURE_ART`
- **found_in_txt**: n/a — these are app art mappings (game-icons.net sigils and class splash art), not rules content. All six keys are the six surviving class ids, so nothing dangles.
- **proposed_change**: none. Note `CLASS_ART` references `/art/classes/*.webp` built by `scripts/build-class-art.mjs` from `resources/images/classes/`, and `resources/` now holds only `README.md` — the art files themselves still ship in `public/`, so this is not broken today, but that build script can no longer be re-run.
- **stored_data_impact**: none.

## 12. `codex.generated.json` — stale and structurally wrong for the beta

- **app_location**: `/src/data/codex.generated.json`, consumed by `/src/data/codex.ts` (`CODEX_SOURCES`, `CODEX_ENTRIES`, `CURRENT_RITES`, `CURRENT_WHISPERS`, `CURRENT_CONDITIONS`) and through it by `conditions.ts` and `characterOptions.ts`.
- **verdict**: **stale.** Three separate problems:
  1. **The generator input is gone.** `scripts/generate-codex-data.mjs:12` reads `resources/master.json`; `resources/` now contains only `README.md`. Running `bun run codex:generate` fails immediately. It also asserts `master.sources.length === 4`.
  2. **The Core Rulebook is not in it.** `sources` holds only three ids — `book-of-the-deepcaller`, `character-sheet`, `whispers`. The 126-page Core Rulebook, which is the bulk of the new beta, has **no Codex representation at all**: 39 entries total, grouped 21 Rites / 7 Character Sheet / 6 Whispers / 5 Source Notes. There is no Conditions, Combat, Equipment or Class content in the Codex.
  3. **Every download link is dead.** Each source carries `publicPath: "/source-library/…​pdf"` and a `downloads[]` pointing at the same path. `public/source-library/` does not exist and the PDFs are deleted, so the Codex renders download buttons that 404 (A10/A17).
- **proposed_change**: the Codex pipeline needs re-basing on `docs/rules/*.txt` rather than a `master.json` + PDF pair. Concretely: (a) rewrite `generate-codex-data.mjs` to parse the txts (they carry `[page N]` markers, which map cleanly to the existing `locator` / `sourcePages` fields), with a hard exclusion of `hidden-condition-sheet.txt`; (b) drop `publicPath`/`downloads` from `CodexSource`, or point them at a re-exported PDF set that actually ships; (c) expand `conditionsNamedByCurrentSources` to the 25 public conditions of §10; (d) add the Core Rulebook as a fourth source. Until (a) exists, `codex.generated.json` is a hand-frozen file misnamed as generated — the same problem as `feats.generated.json`.
- **stored_data_impact**: **none directly** — the Codex is read-only reference. Indirectly, `conditions.ts` and `characterOptions.ts` derive from it, and the rite/whisper ids it defines are what `HunterCard.preparedWhispers` stores. Any regeneration **must preserve the existing 21 rite ids and 6 whisper ids verbatim**, or every Deepcaller's prepared list breaks.

## 13. `src/types.ts` and `src/config.ts`

- `src/config.ts` contains no rules data at all (super-admin emails, capability matrix, name formatting). **KEEP, untouched.**
- `src/types.ts`: `SlotLocation` (`hand|back|chest|hip|ankle`), `CarrySignificance` (`Insignificant|Significant|Oversized`), `ArmorCategory` (`Main Armor|Add-on Armor|Armor Upgrade|Extra`) and `ExtraSubcategory` (`Head Gear|Scarf|Gloves|Boots|Robe`) all match the beta's own vocabulary [pages 33–38, 122]. `ItemCategory` is an app-side grouping with no source counterpart — harmless. **KEEP.**
- One shape gap worth noting for the plan: `HunterCard` has no field for Favors [A06] or Sleepless Counters [A03/A04], and `activeTransformations: string[]` stores raw keys with no catalog to render them [A04]. These are additions, not migrations.

---

## Migration inventory — the complete id-level delta

**Nothing to remap (confirmed safe):** all 6 `classId`s, all 11 `subclassId`s, all 14 `backgroundId`s, all 54 feat ids, all 19 skill names, all 22 armor ids, all 6 storage ids, all 21 rite ids, all 6 whisper ids, `abilityMode` values. This is the large majority of a stored `HunterCard`.

**Ids that disappear with no successor** (`inventory[].itemId`, `sheetAutomation.startingKitInventory[].itemId`, `slotAssignments` keys):

| stored id | action | note |
|---|---|---|
| `hunter-cleaver` | drop or convert to `customItems` | weapon deleted from the game; **not** a rename of `shortsword` |
| `bedroll` | drop | −7 lb |
| `rations` | drop | −2 lb each |
| `letter` | drop | 0 lb |
| `brewers-supplies` | drop | −9 lb; also leaves Church Missionary's kit |

**Ids that split / rename:**

| stored id | becomes | rule |
|---|---|---|
| `lantern` | `lantern-hooded` (new) | beta has only Bullseye and Hooded lanterns; Hooded is the same 2 lb |
| `book-of-eldritch-knowledge` | `book-of-the-deepcaller` on Deepcaller cards, else `book` | beta separates the Unique Item from generic Book |

**Tool-name strings inside `featSkills[]`:**

| stored string | becomes |
|---|---|
| `Mason's Tools` | `Cultist's Tools` |
| `Tinker's Tools` | `Smith's Tools` |
| `Brewer's Supplies` | drop (no successor — re-prompt the player) |

**Values to update in place:** `coins` for Noble-background cards (+20 GP if the card still holds exactly its starting kit); `startingKitCoins` likewise.

**Derived values to recompute on every card** (no stored field changes, but the computed sheet moves):
- **AC** — Studs now need 3 studded Add-ons for +1 (5 for +2); cards with 1–2 studded pieces lose +1 AC.
- **Carried weight** — studded pieces 3 → 5 lb; Robe of the Deepcallers 4 → 2 lb; Bloodvial 0 → 0.5 lb; Thieves'/Navigator's/Blood-drainer's Tools become **Significant**, which also changes **slot occupancy** and can invalidate an existing `slotAssignments` layout.
- **Speed / HP / Passive Perception** — unchanged by this catalog audit (see A06/A08/A14 for those).

**Prune** any `slotAssignments` key naming a removed id, or the placement dangles against an item that no longer resolves.
