# A11 — Hunter Bloodbound class (core-rulebook.txt lines 3570–3890, pages 80–85)

Scope: Core Hunter Bloodbound Traits, the level 1–20 Features table, all class
features, and the Path of the Berserker / Path of the Blood-Drunk subclasses,
compared against `src/data/classes.ts` (`bloodbound`), `src/data/abilities.ts`,
`src/data/feats.ts`, `src/features/hunter/lib/characterAutomation.ts`,
`src/features/hunter/components/character-sheet/{CharacterSheetClassAbilities.tsx,
CharacterSheetUpgrade*.tsx,upgradeModel.ts}`,
`src/features/hunter/components/appsheet/{AppClassAbilities.tsx,AppWeaponReference.tsx}`.

Core traits (D12 Hit Die, Max Sanity 20, Sanity Die 1d20, STR+CON saves, the
seven skill options with choose 2, Simple + Martial weapons, Blood-drainer's
Tools, Light + Medium armor, Speed 30 ft) and the whole Blood Frenzy **uses**
column (1–2: 2, 3–5: 3, 6–11: 4, 12–16: 5, 17–20: 6) match the code exactly and
are not repeated below.

---

### Blood Frenzy Damage progression column is entirely missing from the class data

- **txt_section**: core-rulebook.txt [page 81] "Hunter Bloodbound Features" table, `Blood Frenzy Damage` column (lines 3626–3647)
- **rule_summary**: The features table has **two** numeric columns. Blood Frenzy Damage is **+2 at levels 1–8**, **+3 at levels 9–15**, **+4 at levels 16–20**. It is the bonus added to Strength-based weapon/Unarmed Strike damage while Blood Frenzy is active (page 80), and it is also the number of d6s rolled for the Berserker's level-3 Frenzy (page 84).
- **code_location**: `src/data/classes.ts` — `bloodbound.progressionColumns = ["Blood Frenzy"]` (line 377) and all 20 `progression[].extras` rows (lines 379–398) carry only `"Blood Frenzy"`.
- **verdict**: missing_in_code
- **proposed_change**: Add `"Blood Frenzy Damage"` to `progressionColumns` and an `extras["Blood Frenzy Damage"]` value on every row: `"2"` for levels 1–8, `"3"` for 9–15, `"4"` for 16–20. This makes the value flow to the sheet through the existing `featureText()` extras rendering in `characterAutomation.ts` (lines 73–76) and lets `AppWeaponReference.tsx` show a concrete Frenzy number instead of the placeholder `"+d6s"`.
- **stored_data_impact**: none on stored fields; `sheet.features1` is recomputed by `calculatedSheetFields()` on next save/open for every Bloodbound card.

### Berserker "Mindless Blood Frenzy" names a condition that no longer exists

- **txt_section**: core-rulebook.txt [page 84] "LEVEL 6: MINDLESS BLOOD FRENZY" (lines 3777–3782)
- **rule_summary**: "You have Immunity to the **Mesmerized** and Frightened conditions while your Blood Frenzy is active. If you're Mesmerized or Frightened when you enter your Blood Frenzy, the condition ends on you." The beta condition list (page ~[line 932]) defines **Mesmerized**; the word "Charmed" appears **zero times** in the entire core rulebook.
- **code_location**: `src/data/classes.ts` line 427 — Berserker level 6 feature text says "Immunity to the **Charmed** and Frightened conditions … If you're **Charmed** or Frightened…".
- **verdict**: mismatch
- **proposed_change**: Replace both occurrences of "Charmed" with "Mesmerized" in that feature text.
- **stored_data_impact**: none directly; `features1` re-derives on the next automation pass.

### Rare Transformation cost and Madness are wrong (One Form, level 14)

- **txt_section**: core-rulebook.txt [page 85] "Rare Transformation" (lines 3827–3836)
- **rule_summary**: "**As a Bonus Action, expend four uses of Blood Frenzy** to activate this transformation for **3 rounds**. … You suffer **10 Madness**."
- **code_location**: `src/data/classes.ts` line 441 — Blood-Drunk level 14 "One Form" text: "You can activate it during combat by **spending 1 use of Blood Frenzy**. It lasts for 3 rounds before disappearing. … You suffer **6 Madness**."
- **verdict**: mismatch
- **proposed_change**: Rewrite that sentence to "As a Bonus Action, expend four uses of Blood Frenzy to activate this transformation for 3 rounds." and change "6 Madness" to "10 Madness". The activation is also explicitly a **Bonus Action** in the txt, which the code text omits entirely.
- **stored_data_impact**: none (descriptive text only).

### Starting equipment omits the Cowl

- **txt_section**: core-rulebook.txt [page 80] Core Hunter Bloodbound Traits, "Starting Equipment" (lines 3587–3590)
- **rule_summary**: "Greataxe, 2 Handaxes, Blood-drainer's Tools, Blood Vials (4), Tool Belt, **Cowl**".
- **code_location**: `src/data/classes.ts` line 374 — `startingEquipment: ["Greataxe", "2 Handaxes", "Blood-drainer's Tools (unique item)", "4 Blood vials", "Tool Belt"]`. The Cowl exists as a catalog entry in `src/data/armor.ts` (id `cowl`, line 165) but not in `src/data/items.ts`.
- **verdict**: missing_in_code
- **proposed_change**: Add `"Cowl"` to the class's `startingEquipment`. Note that `startingKit()` in `src/lib/startingEquipment.ts` resolves names against `ITEMS` only (`BY_NAME`, line 4), so a bare `"Cowl"` line would land in `unmatched`. The minimal fix is to have the starting-kit resolver also consult `ARMOR_BY_ID`/`ARMOR` for extra-armor pieces, or to seed `extraArmorIds` with `cowl` on class selection. (The same gap applies to the Warden's "Tricorn", `armor.ts` line 143 — out of this section's scope but the same one-line resolver fix covers both.)
- **stored_data_impact**: Existing Bloodbound cards were created without a Cowl. Do **not** retroactively inject it into saved `inventory`/`extraArmorIds`; apply to newly generated starting kits only, otherwise saved AC and carried weight shift under players.

### Berserker subclass id never matches in the weapon-damage panel

- **txt_section**: core-rulebook.txt [page 84] "LEVEL 3: FRENZY" (lines 3765–3775)
- **rule_summary**: Frenzy adds a number of d6s equal to the Blood Frenzy Damage bonus to the first Strength-based hit on your turn while Reckless Attack and Blood Frenzy are both active.
- **code_location**: `src/features/hunter/components/appsheet/AppWeaponReference.tsx` line 27 — `if (card.subclassId === "berserker")`. The catalog id is `"path-of-the-berserker"` (`src/data/classes.ts` line 421), so this branch is **dead**: no Berserker hunter ever sees the Frenzy damage bonus row.
- **verdict**: mismatch (code bug — a rule the txt still has is never surfaced)
- **proposed_change**: Change the comparison to `"path-of-the-berserker"`, and once the Blood Frenzy Damage column above exists, set `value` to `+${n}d6` from `progression.extras["Blood Frenzy Damage"]` instead of the vague `"+d6s"`. (`"zealot"` on line 30 has the same class of id mismatch against `hunter-zealot` — flagged for the Deepcaller section.)
- **stored_data_impact**: none.

### Feat cross-references point at the wrong chapter

- **txt_section**: core-rulebook.txt [page 82] line 3694 and [page 83] line 3720 — "the Ability Score Improvement feat (**see chapter 5**)" / "an Epic Boon feat (**see chapter 5**)"
- **rule_summary**: In the beta rulebook, Feats live in **chapter 5** (Feat Descriptions / Origin / General / Fighting Style / Epic Boon Feats begin at line 4298). Every class in the book now says "see chapter 5".
- **code_location**: `src/data/classes.ts` lines 406 and 416 (Bloodbound level 4 ASI and level 19 Epic Boon) say "see chapter **4**". The same stale reference appears 12 times across `classes.ts`.
- **verdict**: mismatch
- **proposed_change**: Global replace of "see chapter 4" → "see chapter 5" in `src/data/classes.ts` (safe: all 12 occurrences are feat cross-references).
- **stored_data_impact**: none.

### Path of the Blood-Drunk subclass name is spelled inconsistently

- **txt_section**: core-rulebook.txt [page 83] "Path of The Blood-Drunk" (line 3733 and heading line 3765)
- **rule_summary**: The subclass heading is hyphenated — "Path of The Blood-Drunk" — although the level-3 class feature text refers to "the Path of the Blood Drunk" unhyphenated (line 3685). The txt itself is inconsistent; the subclass's own heading is the authoritative spelling.
- **code_location**: `src/data/classes.ts` line 434 — `name: "Path of the Blood Drunk"`, id `path-of-the-blood-drunk`.
- **verdict**: mismatch (cosmetic)
- **proposed_change**: Rename to `"Path of the Blood-Drunk"`. Keep the `id` unchanged — it is what `card.subclassId` stores.
- **stored_data_impact**: none provided the `id` is untouched. If the id were changed, every saved card with `subclassId: "path-of-the-blood-drunk"` would lose its subclass; do not change it.

### Confirmed match: Improved Brutal Strike appears twice, at 13 and 17, and the sheet handles it

- **txt_section**: core-rulebook.txt [page 83] "LEVEL 13: IMPROVED BRUTAL STRIKE" (line 3719) and "LEVEL 17: IMPROVED BRUTAL STRIKE" (line 3750)
- **rule_summary**: Level 13 adds Staggering Blow and Sundering Blow as options; level 17 raises the extra damage to 2d10 and allows two different effects per use. Two distinct features sharing one name.
- **code_location**: `src/data/classes.ts` lines 412 and 414; rendered by `AppClassAbilities.tsx` (keyed on `${level}-${name}-${index}`) and matched level-first in `upgradeModel.ts` `upgradeFeatures()` (line 37, `entry.level === level && …`).
- **verdict**: match
- **proposed_change**: none — the duplicate name is deliberate and both the timeline and the upgrade flow disambiguate by level. Worth recording so a later cleanup does not "de-duplicate" them.
- **stored_data_impact**: none.

### Confirmed match: Brutal Strike damage scaling in the weapon panel

- **txt_section**: core-rulebook.txt [page 82] line 3715 (extra 1d10) and [page 83] line 3753 ("increases to 2d10")
- **rule_summary**: Brutal Strike deals an extra 1d10 from level 9 and 2d10 from level 17, of the same damage type as the weapon or Unarmed Strike.
- **code_location**: `src/features/hunter/components/appsheet/AppWeaponReference.tsx` line 26 — `card.level >= 9`, `card.level >= 17 ? "+2d10" : "+1d10"`.
- **verdict**: match
- **proposed_change**: none.
- **stored_data_impact**: none.

### Confirmed match: Primal Champion's ability increase is not applied by the calculator

- **txt_section**: core-rulebook.txt [page 83] "LEVEL 20: PRIMAL CHAMPION" (lines 3757–3761)
- **rule_summary**: "Your Strength and Constitution scores increase by 4, to a maximum of 25."
- **code_location**: `src/features/hunter/lib/characterAutomation.ts` — the ability loop (lines 199–207) reads `card.abilities[key]` straight through; `structuredCardFromSheet()` clamps every score to `Math.max(3, Math.min(20, …))` (line 291), which would silently cap a level-20 Bloodbound's Strength/Constitution below the rule's maximum of 25.
- **verdict**: mismatch
- **proposed_change**: Raise the clamp ceiling in `structuredCardFromSheet()` from 20 to 25 (the rule's stated maximum). Applying the +4 automatically is a bigger behavioural change and is **not** proposed here; the clamp is the actual bug, because a player who enters 24 STR today has it silently rewritten to 20 on the next sheet→structured sync.
- **stored_data_impact**: Any level-20 Bloodbound card that already round-tripped through `structuredCardFromSheet()` may have had STR/CON truncated to 20. There is no way to recover the pre-truncation value; no backfill is possible, so fix the clamp and leave existing values alone.

---

## Nothing in this section is a removal candidate

Every Bloodbound feature present in `src/data/classes.ts` — Blood Frenzy,
Frenzied But Sane, Danger Sense, Reckless Attack, Extra Attack, Instinctive
Pounce, Brutal Strike, Relentless Blood Frenzy, Weapon Mastery, Improved Brutal
Strike (13 and 17), Persistent Blood Frenzy, Indomitable Might, Epic Boon,
Primal Champion, and all eight subclass features — still appears verbatim in the
beta rulebook at the same level. There is **no** `no_longer_a_rule` finding for
this class chapter.
