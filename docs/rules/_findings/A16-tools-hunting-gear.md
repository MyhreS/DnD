# A16 — Tools, Hunting Gear, Storage Items, Unique Items

Scope: `core-rulebook.txt` lines 5119–5619 ([page 114]–[page 124]) — Tools
(Artisan's + Other), Hunting Gear A–Z, the Hunter Gear table [page 121],
Storage Items [page 122], Unique Items [page 122–124].

Primary code under review: `src/data/items.ts`, `src/data/storage.ts`,
`src/data/characterOptions.ts`, `src/lib/inventory.ts`, `src/lib/customItems.ts`,
`src/lib/startingEquipment.ts`, and the gear UI
(`features/hunter/components/appsheet/AppGearSection.tsx`,
`InventoryAddForms.tsx`, `InventoryAddPages.tsx`,
`character-sheet/CharacterSheetCarryingGear.tsx`,
`CharacterSheetStorageRack.tsx`, `CharacterSheetEquipmentPicker.tsx`).

**Note on the UI files:** all six components are catalog-driven — they read
`ITEMS` / `ITEM_BY_ID` / `STORAGE_BY_ITEM_ID` and render whatever is in the data
layer (`InventoryAddForms.tsx` groups by the fixed category list
`Weapon, Ammunition, Tool, Gear, Consumable, Valuable`). No item name, weight or
effect is hard-coded in them. Every mismatch below is therefore fixable in
`src/data/*` alone, with no component change — which satisfies the
"preserve the design" constraint.

**Note on cost:** the new source has **no price/cost column anywhere** in the
Tools or Hunter Gear tables — only Weight and Carrying Category. `Item` in
`src/types.ts` has no cost field either. Confirmed match; nothing to do.

---

### All Tools are Significant Items — code marks tools Insignificant
- **txt_section**: core-rulebook.txt [page 114] lines 5104–5105, "Tools": "Carrying Category. All Tools are Significant Items."
- **rule_summary**: Every tool (Artisan's Tools and Other Tools alike) is a Significant Item. Weights given inline: Alchemist's Supplies 8 lb, Carpenter's Tools 6 lb, Cultist's Tools 8 lb, Poisoner's Kit 2 lb, Smith's Tools 10 lb, Blood-drainer's Tools 2 lb, Navigator's Tools 2 lb, Thieves' Tools 1 lb.
- **code_location**: `src/data/items.ts` — `thieves-tools` (`carry: "Insignificant"`), `navigators-tools` (`Insignificant`), `blood-drainers-tools` (`Insignificant`), `brewers-supplies` (`Insignificant`). The header comment at lines 8–14 also codifies "tool *sets*" as Insignificant.
- **verdict**: mismatch
- **proposed_change**: Set `carry: "Significant"` on every `category: "Tool"` entry and correct the catalog header comment. This changes slot consumption via `src/lib/slots.ts` / `computeSlots`, so it is a real rules fix, not cosmetic.
- **stored_data_impact**: No `HunterCard` field changes, but existing `slotAssignments` that placed a tool in an Insignificant (unlimited) position become invalid. Recompute placements on load; tools now need a real Significant slot (typically a Tool Belt/Backpack slot) or fall back to unassigned inventory.

### Five Artisan's Tools are missing from the item catalog
- **txt_section**: core-rulebook.txt [page 115] lines 5133–5175, "Artisan's Tools" / "Other Tools"
- **rule_summary**: Alchemist's Supplies (Int, 8 lb; Identify a substance DC 15; Craft Acid ×3 vials, Oil ×1 flask); Carpenter's Tools (Str, 6 lb; Seal/pry a door or container DC 20; Craft Club, Greatclub, Barrel, Chest, Ladder, Pole, Portable Ram, Torch); Cultist's Tools (Int, 8 lb; Chisel a symbol or hole in stone DC 10; Craft Block and Tackle); Poisoner's Kit (Int, 2 lb; Detect poisoned object/drink DC 10; Craft Basic Poison ×1 vial, Antitoxin ×1 vial); Smith's Tools (**Dexterity**, 10 lb; Craft Hunter Rifle, Pistol, Bell, Bullseye Lantern, Hooded Lantern, Hunting Trap, Lock, Manacles, Mirror, Shovel, Signal Whistle, Tinderbox — no Utilize entry).
- **code_location**: `src/data/items.ts` — ABSENT. They exist only as proficiency *names* in `src/data/characterOptions.ts` `TOOL_PROFICIENCIES` / `TOOL_DETAILS`, so a Cultist background grants a proficiency for a tool that cannot be added to inventory.
- **verdict**: missing_in_code
- **proposed_change**: Add five `category: "Tool"`, `carry: "Significant"` entries with the weights above and a `note` carrying the Utilize DC and craft list. `src/lib/startingEquipment.ts` resolves by name, so `backgrounds.ts` equipment lines naming these tools will then match instead of landing in `unmatched`.
- **stored_data_impact**: None destructive; new ids become resolvable. Cards whose starting kit previously dropped these lines can optionally be backfilled.

### Tool proficiencies that no longer exist: Mason's, Tinker's, Brewer's
- **txt_section**: core-rulebook.txt [page 115] lines 5133–5175 (complete tool list — 5 Artisan's + 3 Other); background table [page ~99] lines 4267–4287
- **rule_summary**: The complete tool list is Alchemist's Supplies, Carpenter's Tools, Cultist's Tools, Poisoner's Kit, Smith's Tools, Blood-drainer's Tools, Navigator's Tools, Thieves' Tools. There is **no** Mason's Tools, Tinker's Tools, or Brewer's Supplies anywhere in the book. The background table confirms the replacements: Cultist → "Cultist Tools", Weaponsmith → "Smiths Tools", Church Missionary → Poisoner's Kit with equipment "Antitoxin" only.
- **code_location**: `src/data/characterOptions.ts` `TOOL_PROFICIENCIES` + `TOOL_DETAILS` (entries "Mason's Tools", "Tinker's Tools", "Brewer's Supplies"); `src/data/items.ts` item `brewers-supplies`; `src/data/backgrounds.ts` — `cultist.tool: "Mason's Tools"`, `weaponsmith.tool: "Tinker's Tools"`, `church-missionary.equipment: ["Brewer's Supplies", "Antitoxin"]`.
- **verdict**: no_longer_a_rule
- **proposed_change**: Drop the three names from `TOOL_PROFICIENCIES`/`TOOL_DETAILS` and delete the `brewers-supplies` item; add "Smith's Tools" descriptions already present. Repoint `cultist.tool` → `"Cultist's Tools"`, `weaponsmith.tool` → `"Smith's Tools"`, and set `church-missionary.equipment` → `["Antitoxin"]`. (Background rows themselves are another agent's section; flagged here because they are the only consumers of the removed tool names.)
- **stored_data_impact**: `HunterCard` cards with `featSkills` containing "Mason's Tools"/"Tinker's Tools"/"Brewer's Supplies" (Skilled feat, see `CharacterSheetUpgradeChoices.tsx` line 30) must have those entries stripped or remapped; `characterAutomation.ts:222` composes the tool line from `background.tool` so it recomputes automatically. Inventories holding `brewers-supplies` need that entry removed (it will otherwise be silently dropped by `resolveInventory`, which discards unknown ids).

### Blood-drainer's Tools is a normal tool, not a Unique Item
- **txt_section**: core-rulebook.txt [page 115] lines 5136–5163 ("Other Tools"); Unique Items list [page 122–124] lines 5493–5609
- **rule_summary**: Blood-drainer's Tools sits under "Other Tools" (Ability Constitution, 2 lb). The Unique Items section contains only Bloodvial, Silver Bullets, Book of the Deepcaller and Robe of the Deepcallers, plus "Hidden Unique Items".
- **code_location**: `src/data/items.ts` `blood-drainers-tools` — `unique: true`, note "The Bloodbound's signature kit."
- **verdict**: mismatch
- **proposed_change**: Drop `unique: true`; carry stays Significant per the Tools rule above. Also note the txt's own Utilize text (Identify purity DC 10; drain DC 10/20/30 → 1/2/3 Bloodvials; a creature can be drained only once) is already correct in `TOOL_DETAILS`. `src/data/classes.ts:372` `toolProficiencies: "Blood-drainer's Tools (unique item)"` should lose the parenthetical.
- **stored_data_impact**: Cosmetic only — the "· Unique" badge in `AppGearSection.tsx` line 82 stops rendering for this item. No stored field changes.

### Thirty-plus Hunting Gear items missing from the catalog
- **txt_section**: core-rulebook.txt [pages 116–121] lines 5179–5442, "Hunting Gear" + the Hunter Gear table
- **rule_summary**: The table lists 46 items with Weight / Carrying Category. Present in the txt but absent from `ITEMS`: Acid (1 lb, Insig), Ball Bearings (2 lb, Insig), Barrel (70 lb, Oversized), Basket (2 lb, Oversized), Block and Tackle (5 lb, Sig), Bottle Glass (2 lb, Insig), Bucket (2 lb, Oversized), Caltrops (2 lb, Insig), Candle (—, Insig), Chest (25 lb, Oversized), Flask (1 lb, Insig), Grappling Hook (4 lb, Sig), Ink (—, Insig), Ink Pen (—, Insig), Jug (4 lb, Sig), Ladder (25 lb, Oversized), Lock (1 lb, Insig), Mirror (1 lb, Insig), Net (3 lb, Sig), Paper (—, Insig), Parchment (—, Insig), Poison Basic (—, Insig), Pole (7 lb, Oversized), Pot Iron (10 lb, Oversized), Ram Portable (35 lb, Oversized), Signal Whistle (—, Insig), Spikes Iron (5 lb, Insig), String (—, Insig), Tinderbox (1 lb, Insig), Vial (—, Insig).
- **code_location**: `src/data/items.ts` — ABSENT
- **verdict**: missing_in_code
- **proposed_change**: Add each as a `category: "Gear"` (or `"Consumable"` for Acid / Basic Poison) entry with the table's exact weight and `carry`, and a one-line `note` from the item's prose (e.g. Acid: "Attack action — DEX save DC 8 + DEX mod + PB within 20 ft or 2d6 Acid damage"; Caltrops: "5-ft square, DC 15 DEX save or 1 Piercing and Speed 0; 5 Actions to recover"; Net: "DC 8 + DEX + PB or Restrained; AC 10, 5 HP"). No UI change — `InventoryAddPages.tsx` builds its picker from `ITEMS.filter(item => item.category !== "Armor")`.
- **stored_data_impact**: Additive only. Note that several Oversized entries (Barrel, Basket, Bucket, Ladder, Pole, Pot Iron, Portable Ram, Chest) will consume the hand Oversized slot in `computeSlots`, so they behave correctly only once added with the right `carry`.

### "Lantern" is one generic item; the source defines two distinct lanterns
- **txt_section**: core-rulebook.txt [page 118] lines 5265–5277 + table line 5433–5434
- **rule_summary**: Lantern, Bullseye — 2 lb, Significant; burns Oil, Bright Light in a 60-foot **Cone**, Dim Light +60 ft. Lantern, Hooded — 2 lb, Significant; Bright Light 30-ft radius, Dim +30 ft, Bonus Action to lower the hood to Dim Light 5-ft radius. There is no undifferentiated "Lantern".
- **code_location**: `src/data/items.ts` id `lantern`, name "Lantern", Significant, 2 lb, no note
- **verdict**: mismatch
- **proposed_change**: Add `lantern-bullseye` and `lantern-hooded` with the light notes above. Keep the legacy `lantern` id resolvable (rename it "Lantern, Hooded" and reuse the id, or add an alias in `src/lib/startingEquipment.ts` `ALIASES`) so existing inventories do not silently lose the entry.
- **stored_data_impact**: If the `lantern` id is dropped outright, `resolveInventory` discards it silently — cards holding `lantern` must be migrated to `lantern-hooded` (safest default) rather than deleted.

### Gear items in the catalog that no longer appear in the source
- **txt_section**: core-rulebook.txt [pages 116–121], Hunting Gear list and table (lines 5179–5442) — exhaustive
- **rule_summary**: The Hunter Gear table is a closed list. Bedroll, Rations, Key and Letter appear nowhere in it, nor anywhere else in the tools/gear/storage/unique sections.
- **code_location**: `src/data/items.ts` — `bedroll` (Gear, Sig, 7 lb), `rations` (Consumable, Sig, 2 lb, "One day's trail rations"), `key` (Gear, Insig, 0 lb), `letter` (Gear, Insig, 0 lb)
- **verdict**: no_longer_a_rule
- **proposed_change**: Remove `bedroll` and `rations` (no rule supports them; nothing in `classes.ts`/`backgrounds.ts` starting equipment references them). `key` and `letter` are narrative props with no mechanics — the txt does state every Lock and set of Manacles "comes with a key" (lines 5279, 5299), so `key` has a source-supported reason to remain; `letter` does not. Recommend removing `letter`, keeping `key`.
- **stored_data_impact**: Cards holding `bedroll`/`rations`/`letter` lose those entries. `resolveInventory` drops unknown ids silently, and `totalCarriedWeight` will fall (Bedroll is 7 lb), so recompute carry condition. Any `slotAssignments` referencing the removed ids should be pruned to avoid dangling placements.

### Antitoxin note contradicts the rule
- **txt_section**: core-rulebook.txt [page 116] lines 5196–5200, "ANTITOXIN"
- **rule_summary**: "As a Bonus Action, you can drink a vial of Antitoxin to gain Advantage on saving throws to avoid or end the Poisoned condition." No duration is given. Table: weight "—", Insignificant Item.
- **code_location**: `src/data/items.ts` `antitoxin` — `note: "Advantage on saves against poison for 1 hour."`
- **verdict**: mismatch
- **proposed_change**: Replace the note with "Bonus Action — Advantage on saving throws to avoid or end the Poisoned condition." The "for 1 hour" duration is a 5e holdover with no basis in the new source. Weight 0 / Insignificant already match.
- **stored_data_impact**: none

### Item notes asserting lengths the source never gives (Rope, Chain)
- **txt_section**: core-rulebook.txt [page 120] lines 5369–5382 (ROPE); [page 117] lines 5222–5238 (CHAIN); table lines 5415, 5422
- **rule_summary**: Rope — 5 lb, Significant; Utilize to tie a knot DC 10 DEX (Sleight of Hand), burst DC 20 STR (Athletics), bind a Grappled/Incapacitated/Restrained creature, escape DC 15 DEX (Acrobatics). Chain — 10 lb, Significant; wrap DC 13 STR (Athletics), escape DC 18 DEX (Acrobatics), burst DC 20 STR (Athletics). **Neither states a length** (no "50 feet", no "10 feet").
- **code_location**: `src/data/items.ts` `rope` note "50 feet of hempen rope."; `chain` note "10 feet of heavy chain."
- **verdict**: mismatch
- **proposed_change**: Replace both notes with the source's actual mechanics (the DCs above). Weights and carry categories are correct — leave them.
- **stored_data_impact**: none

### Bloodvial weight is 0.5 lb, not 0
- **txt_section**: core-rulebook.txt [page 122] lines 5497–5498, "BLOODVIAL": "Insignificant Item, 0,5 lb."
- **rule_summary**: A Bloodvial weighs 0.5 lb and is an Insignificant Item. Purities: Tainted (2d4+2 HP, −2 Madness, DC 10 Grit or +1 Transformation Level and 3 Madness), Stirred (4d4+4, −4 Madness, DC 15 → +1 TL, 6 Madness), Concentrated (8d4+8, −8 Madness, DC 20 → +2 TL, 10 Madness), Pure Old Blood (all HP + all Madness, or remove Dead within 1 round at 1 HP; DC 25 → +6 TL, 15 Madness). Drinking or administering to a willing creature within 5 ft is a Bonus Action.
- **code_location**: `src/data/items.ts` `blood-vial` — `weightLb: 0`, note "Restorative blood — the hunter's lifeline.", no `unique` flag
- **verdict**: mismatch
- **proposed_change**: Set `weightLb: 0.5`; keep `carry: "Insignificant"`; expand the note to mention purity and the Bonus Action. Purity is a per-vial property with no representation in the catalog — the minimal fit is four ids (`blood-vial-tainted`, `-stirred`, `-concentrated`, `-pure`) or a purity-bearing note, but that is a larger design call; at minimum fix the weight.
- **stored_data_impact**: `totalCarriedWeight` increases by 0.5 lb per vial for every card holding `blood-vial`; carry condition must be recomputed. If purity ids are introduced, existing `blood-vial` entries should migrate to Tainted (the "most common form").

### Silver Bullets are absent from the catalog
- **txt_section**: core-rulebook.txt [page 123] lines 5537–5564, "SILVER BULLETS"
- **rule_summary**: "Insignificant Item, weight same as Bullets." Function identically to regular Bullets and can be fired by any weapon that uses them; when a Silver Bullet damages a **Dreadblood**, add 1d6 to the damage roll.
- **code_location**: `src/data/items.ts` — only `bullets` exists (Ammunition, Insignificant, 0 lb)
- **verdict**: missing_in_code
- **proposed_change**: Add `silver-bullets` — `category: "Ammunition"`, `carry: "Insignificant"`, `weightLb: 0` (same as Bullets), note "+1d6 damage against Dreadbloods."
- **stored_data_impact**: Additive; none.

### "Book of eldritch knowledge" vs. the source's two distinct books
- **txt_section**: core-rulebook.txt [page 117] lines 5232–5238 (BOOK, generic gear, 5 lb Significant); [page 124] lines 5576–5603 (BOOK OF THE DEEPCALLER, Unique Item, Significant, 5 lb)
- **rule_summary**: Generic Book — 5 lb, Significant; consulting an accurate nonfiction Book about its topic gives **+5** to Intelligence (Eldritch Knowledge, Old World History, Blood Nature, or Religion) checks about that topic. Book of the Deepcaller — a separate Unique Item containing eldritch fragments; the source gives it no numeric mechanic in this section.
- **code_location**: `src/data/items.ts` id `book-of-eldritch-knowledge`, name "Book of eldritch knowledge", Gear/Significant/5 lb, note "Forbidden passages — the Deepcaller's tome."; alias in `src/lib/startingEquipment.ts` maps both "book of the deepcaller" and "book of eldritch knowledge" to this id.
- **verdict**: mismatch
- **proposed_change**: Rename the existing item to **"Book of the Deepcaller"** (keep the id so aliases and stored inventories still resolve) and mark `unique: true`. Add a separate generic `book` item (Gear, Significant, 5 lb, note carrying the +5 Intelligence-check rule). Keep both alias keys pointing at the existing id.
- **stored_data_impact**: Display name only; no id change, so `/characters/{id}` inventories are unaffected.

### Storage Items — exact match, confirmed
- **txt_section**: core-rulebook.txt [page 122] lines 5485–5524, "Storage Items" + ANKLE HOLSTER
- **rule_summary**: Sack — requires 1 Oversized slot (Hand), gives 15 Significant (Hand), 1 lb, Significant. Backpack — 1 Significant (Back) → 7 Significant (Back), 5 lb, Significant. Bandolier — 1 Significant (Front) → 4 Significant (Front), 4 lb, Significant. Toolbelt — 1 Significant (Hip) → 4 Significant (Hip), 3 lb, Significant. Carrying Harness — 1 Significant (Back) → 2 Significant (Back), 3 lb, Significant. Ankle Holster — 0 Item Slots (Ankle), gives 1 Significant (only Dagger, Pistol) (Ankle), 1 lb, Insignificant.
- **code_location**: `src/data/storage.ts` `STORAGE_DEFS` + the matching entries in `src/data/items.ts` (`sack`, `backpack`, `bandolier`, `tool-belt`, `carrying-harness`, `ankle-holster`)
- **verdict**: match
- **proposed_change**: none — every requires/gives/count/location/weight/carry pair matches, including the Ankle Holster's `requires: null` and `only: ["dagger","pistol"]`, and the Front→`chest` mapping documented at `storage.ts:5`. One nit: `tool-belt` is categorised `"Tool"` in `items.ts` while the source calls the Toolbelt a Storage Item, not a tool; recategorise to `"Gear"` so the "All Tools are Significant" rule and any future tool-proficiency logic do not sweep it in.
- **stored_data_impact**: none (recategorising `tool-belt` changes only its grouping in the `InventoryAddForms.tsx` optgroup list).

### Shovel's back-slot pin, and the table's slot annotations
- **txt_section**: core-rulebook.txt [page 121] line 5416, Hunter Gear table: "Shovel 5 lb. Significant Item (back)"
- **rule_summary**: The Shovel is the only Hunting Gear entry whose Carrying Category carries a pinned body location.
- **code_location**: `src/data/items.ts` `shovel` — `slotLocation: "back"`, Significant, 5 lb
- **verdict**: match
- **proposed_change**: none. Confirmed non-obvious match; no other gear row in the table carries a parenthesised location, so no further `slotLocation` pins are warranted from this section.
- **stored_data_impact**: none
