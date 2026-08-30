# A12 — Hunter Warden class reconciliation

Source: `docs/rules/core-rulebook.txt` lines 3859–4165 (pages 86–92).
Code: `src/data/classes.ts` (the `warden` entry, lines 446–533) plus the
generic sheet/upgrade machinery that consumes it.

Note on scope: the Warden is almost entirely **data-driven**. There is no
Warden-specific logic in `src/data/abilities.ts`, `src/data/feats.ts`,
`CharacterSheetClassAbilities.tsx` (11 lines, generic), `AppClassAbilities.tsx`
(39 lines, generic), or `upgradeModel.ts`. The two places that special-case the
Warden are `CharacterAutomationProvider.tsx` (Expertise count) and the Play
feature's `designatedWardenId` / `isWarden` Tactical Command plumbing.

---

### Tool Proficiencies: Navigator Tools missing

- **txt_section**: core-rulebook.txt [page 87] line 3886, "Core Hunter Warden Traits" — `Tool Proficiencies  Navigator Tools`
- **rule_summary**: The Warden's core traits table grants proficiency with Navigator Tools. (Navigator's Tools also appear in the starting equipment list, line 3892.)
- **code_location**: `src/data/classes.ts` → `warden.toolProficiencies: "—"`
- **verdict**: missing_in_code
- **proposed_change**: Set `toolProficiencies: "Navigator Tools"`.
- **stored_data_impact**: none (display/derived only; no HunterCard field stores tool proficiency). If any sheet surface lists tool proficiencies from the class, existing Warden cards gain the line automatically on next render.

---

### Starting equipment is missing the Tricorn

- **txt_section**: core-rulebook.txt [page 87] lines 3891–3896 — `Hunter Rifle, Longsword, Navigators Tools, Bell, 1 Hunting Trap, Tool Belt, Bandolier, Bullets (14), Tricorn`
- **rule_summary**: Nine starting items; the last is a **Tricorn**.
- **code_location**: `src/data/classes.ts` → `warden.startingEquipment` (8 entries, no Tricorn)
- **verdict**: missing_in_code
- **proposed_change**: Append `"Tricorn"` to `warden.startingEquipment`.
- **stored_data_impact**: Existing Warden cards that took starting equipment will not retroactively gain the Tricorn (`src/lib/startingEquipment.ts` resolves at creation). Either leave legacy cards alone or backfill one Tricorn into inventory for cards whose `classId === "warden"` and whose equipment matches the untouched starting set.

---

### Level 1 feature list is wrong: "Feel Your Enemy" and "Tactical Command" vs "Sense Your Enemy" and "Demoralize"

- **txt_section**: core-rulebook.txt [page 88] line 3929 — `1 | +2 | Bands Directive, Sense Your Enemy, Demoralize | D6`
- **rule_summary**: Level 1 grants exactly three features: **Bands Directive**, **Sense Your Enemy**, **Demoralize**.
- **code_location**: `src/data/classes.ts` → `warden.progression[0].features = "Bands Directive, Feel Your Enemy, Tactical Command"`; `warden.features` entries `"Tactical Command"` (line 490) and `"Feel Your Enemy"` (line 491)
- **verdict**: mismatch
- **proposed_change**: Rewrite the level-1 progression row to `"Bands Directive, Sense Your Enemy, Demoralize"`; rename/rewrite `Feel Your Enemy` → `Sense Your Enemy` (see next finding); delete `Tactical Command`; add `Demoralize` (see below).
- **stored_data_impact**: Any `HunterCard` that records chosen/known feature names or per-feature notes keyed on `"Feel Your Enemy"` / `"Tactical Command"` must be remapped or dropped. No Warden feature at level 1 currently drives a choice, so the practical impact is only stale display strings.

---

### Sense Your Enemy replaces Feel Your Enemy (Level, not CR; new IRV rider)

- **txt_section**: core-rulebook.txt [page 88] lines 3951–3964, "LEVEL 1: SENSE YOUR ENEMY"
- **rule_summary**: Bonus Action, creature within 30 ft: **you learn the creature's Level**. You *can also add* to this Bonus Action to know whether it has any Immunities, Resistances, or Vulnerabilities; once that **added** feature is used you can't use it again until a Short or Long Rest, and you can restore a use of the added feature by expending one Bands Directive die (no action). Note the base Level-reading has **no stated per-rest limit** — only the added rider does.
- **code_location**: `src/data/classes.ts` → `warden.features` level 1 `"Feel Your Enemy"`
- **verdict**: mismatch
- **proposed_change**: Rename to `"Sense Your Enemy"` and replace the text with the txt wording. Drop the "Challenge Rating (CR)" alternative — CR is not what the new text grants — and move the rest-limit onto the Immunities/Resistances/Vulnerabilities rider rather than the whole feature.
- **stored_data_impact**: none beyond the feature-name remap noted above.

---

### Demoralize (Level 1) is entirely absent

- **txt_section**: core-rulebook.txt [page 88] lines 3951–3964 (right column), "LEVEL 1: DEMORALIZE"
- **rule_summary**: Choose a creature within 30 ft that can see or hear you. **Charisma (Presence) check contested by its Wisdom (Insight) check; the target wins a tie.** On a success, expend one use of Bands Directive and place your Bands Directive die on the target; it becomes **Demoralized** until the end of your next turn. You cannot use this action without an available Bands Directive use. If you don't use the die to affect the creature's ability check, you regain that die when the condition ends.
- **code_location**: ABSENT — no `Demoralize` feature in `src/data/classes.ts`; no `Demoralized` entry found in `src/data/conditions.ts`
- **verdict**: missing_in_code
- **proposed_change**: Add a level-1 `Demoralize` feature with the txt text, and add a **Demoralized** condition to `src/data/conditions.ts` if the rulebook's condition chapter defines it (cross-check with the conditions-chapter agent — this is a shared dependency).
- **stored_data_impact**: none (new content). Cards tracking active conditions may gain a new selectable condition value `demoralized`.

---

### Tactical Command / the 90-second Warden turn is no longer a rule

- **txt_section**: ABSENT — `grep -i "tactical command"` and `"90"`-second turn wording return **no hits anywhere in `docs/rules/`**. The Warden chapter's level-1 table (line 3929) lists no such feature.
- **rule_summary**: The beta source has no Warden feature granting an unlimited party-strategy briefing or a timed Warden turn.
- **code_location**: `src/data/classes.ts:490` (`Tactical Command` feature); `src/types.ts:215-216` (`designatedWardenId`), `src/types.ts:275-276` (`isWarden`); `src/features/play/store/combatStore.ts` (lines 35, 160, 167, 173, 193, 199, 222, 241–248, 266, 279, 285, 318, 357–378); `src/features/play/lib/turnTimer.ts:20,41`; `src/features/game/lib/combatPresentation.ts:65-69` (`isWarden`); `src/features/game/components/SessionCombatSection.tsx:44`; `src/api/combat.ts:46,78`; `src/dev/preview.ts:116,138`
- **verdict**: no_longer_a_rule
- **proposed_change**: Remove the `Tactical Command` feature from `classes.ts` and its progression mention. The Play-mode `designatedWardenId` / `isWarden` machinery exists solely to implement it — propose removing it too, but flag for the game maker first: this is a visible table-tool behaviour, and CLAUDE.md says table tools are not dropped merely because a topic is absent. Minimum safe change is the `classes.ts` removal; the combat-store removal should be a deliberate, confirmed follow-up.
- **stored_data_impact**: Firestore `/games/{id}` combat docs persist `designatedWardenId` and per-combatant `isWarden` (written in `src/api/combat.ts`). If the Play plumbing is removed, those fields become dead data on existing encounter documents and should be stripped or simply ignored (the parsers already default them). No `/characters/{id}` impact.

---

### Bands Directive number of uses: Wisdom modifier x 2, not x 1

- **txt_section**: core-rulebook.txt [page 87] lines 3904–3908 — "You can grant a Bands Directive die a number of times equal to your **Wisdom modifier x 2, (minimum of 1)**."
- **rule_summary**: Base uses = WIS mod × 2, min 1, regained on a Long Rest.
- **code_location**: `src/data/classes.ts:489` — "...equal to your Wisdom modifier, minimum of once."
- **verdict**: mismatch
- **proposed_change**: Change the Bands Directive text to "equal to your Wisdom modifier x 2 (minimum of 1)".
- **stored_data_impact**: none directly — no automation computes Directive uses (`characterAutomation.ts` has no `directive` handling and `CharacterSheetResources.tsx` shows no Directive counter). If a Directive-uses resource is later derived, existing cards' current-value fields would need clamping.

---

### Effectiveness (L5): uses become WIS x 3, not x 2

- **txt_section**: core-rulebook.txt [page 89] lines 4001–4007, "LEVEL 5: EFFECTIVENESS"
- **rule_summary**: You regain all expended Bands Directive uses on a **Short or Long Rest**, and you now have uses equal to your **Wisdom modifier x 3**.
- **code_location**: `src/data/classes.ts:497` — "...equal to your Wisdom modifier x 2."
- **verdict**: mismatch
- **proposed_change**: Change `x 2` → `x 3` in the Effectiveness text.
- **stored_data_impact**: none (text only, no derived value).

---

### Superior Effectiveness (L11): uses become WIS x 4, not x 3

- **txt_section**: core-rulebook.txt [page 90] lines 4049–4052, "LEVEL 11: SUPERIOR EFFECTIVENESS"
- **rule_summary**: Uses of Bands Directive die equal to your **Wisdom modifier x 4 (minimum of 1)**.
- **code_location**: `src/data/classes.ts:502` — "...equal to your Wisdom modifier x 3."
- **verdict**: mismatch
- **proposed_change**: Change `x 3` → `x 4 (minimum of 1)`.
- **stored_data_impact**: none.

---

### Level 3 "Tag Team" is missing from the table and the feature list

- **txt_section**: core-rulebook.txt [page 88] line 3931 (`3 | +2 | Hunter Warden Subclass, Tag Team | D6`) and [page 89] lines 4013–4018 + 3975–3991 (right column continuation), "LEVEL 3: TAG TEAM"
- **rule_summary**: Once per Short or Long Rest, use an **action** and expend one use of Bands Directive to coordinate an attack with another Hunter within 30 ft who can see or hear you. Choose one creature both Hunters can legally attack with a weapon, damage-dealing rite, or Unarmed Strike; the other Hunter must use their **Reaction**. Both roll attacks before either resolves; choose either **unmodified d20** result and use it for both, each adding their own modifiers and resolving separately. A chosen **natural 1** makes both attacks miss; a chosen **natural 20** makes both Critical Hits. If at least one attack hits, roll your Bands Directive die and add it to one of the attacks' damage rolls. You can restore a use of this feature by expending **two** Bands Directive dice (no action required).
- **code_location**: ABSENT — `src/data/classes.ts` `warden.progression[2].features = "Hunter Warden Subclass"` only; no `Tag Team` feature entry.
- **verdict**: missing_in_code
- **proposed_change**: Add `Tag Team` to the level-3 progression row and add a level-3 feature entry with the txt text.
- **stored_data_impact**: none (new content, no choice attached).

---

### Know Your Enemy (L7) now reveals all Traits, not Immunities/Resistances/Vulnerabilities

- **txt_section**: core-rulebook.txt [page 89] lines 4009–4019, "LEVEL 7: KNOW YOUR ENEMY"
- **rule_summary**: Bonus Action, creature within 30 ft: **you know all of that creature's Traits**. Once per Long Rest; restore a use by expending one Bands Directive die (no action).
- **code_location**: `src/data/classes.ts:498` — currently grants knowledge of Immunities/Resistances/Vulnerabilities.
- **verdict**: mismatch
- **proposed_change**: Replace the text: the IRV knowledge moved down to the level-1 Sense Your Enemy rider; L7 now reveals the creature's **Traits**.
- **stored_data_impact**: none.

---

### Counter (L7): the condition is Mesmerized, not Charmed

- **txt_section**: core-rulebook.txt [page 90] lines 4022–4029, "LEVEL 7: COUNTER"
- **rule_summary**: Reaction to force a reroll with Advantage when you or a creature within 30 ft fails a save against an effect applying the **Mesmerized** or Frightened condition.
- **code_location**: `src/data/classes.ts:499` — "...the **Charmed** or Frightened condition..."
- **verdict**: mismatch
- **proposed_change**: `Charmed` → `Mesmerized`.
- **stored_data_impact**: none. Corroborating evidence: `grep -ci charmed docs/rules/core-rulebook.txt` = **0**; `mesmerized` = 5. "Charmed" no longer exists anywhere in the beta rules — worth a repo-wide sweep beyond the Warden.

---

### Expect Your Enemy (L13) — wording drift, same effect

- **txt_section**: core-rulebook.txt [page 90] lines 4054–4064, "LEVEL 13: EXPECT YOUR ENEMY"
- **rule_summary**: Bonus Action, creature within 30 ft: the GM tells you, if known, the creature's **intended first movement and first Main Action** on its next turn, including the available details of that action. Once per Long Rest; restore by expending one Bands Directive die.
- **code_location**: `src/data/classes.ts:503`
- **verdict**: match (substantively) — but the code says "first action", the txt says "first **Main Action**", and the code says "your DM" where the txt says "The GM".
- **proposed_change**: Optional minimal text refresh to the txt wording ("first Main Action"). Low priority.
- **stored_data_impact**: none.

---

### Presence of Power (L20) is a completely different effect

- **txt_section**: core-rulebook.txt [page 90] lines 4038–4052 (right column), "LEVEL 20: PRESENCE OF POWER"
- **rule_summary**: As an **action**, expend one Bands Directive die and choose a creature within 30 ft that can see or hear you. It makes a **Wisdom saving throw against DC 8 + your Wisdom modifier + your Proficiency Bonus**. On a failure it is **Incapacitated until the start of your next turn**; on a success, no effect. After resolving the save, the creature is **immune to your Presence of Power for 24 hours**.
- **code_location**: `src/data/classes.ts:507` — currently "command a creature within 30 feet ... to forfeit their next turn. This can not be used on the same creature twice." No save, no DC, no 24-hour immunity.
- **verdict**: mismatch
- **proposed_change**: Replace the Presence of Power text with the txt version (save DC formula, Incapacitated, 24-hour immunity).
- **stored_data_impact**: none.

---

### Commander — Master the Enemy (L14): must name both an ally and an enemy

- **txt_section**: core-rulebook.txt [page 91] lines 4094–4108, "LEVEL 14: MASTER THE ENEMY"
- **rule_summary**: As an action, spend one Band's Directive die. Choose **one ally other than yourself within 60 ft** who can see or hear you, **and one enemy you can see within 60 ft**. Before the start of your next turn, the **first attack that ally makes against that enemy** treats a natural d20 of **14–20 as a natural 20**.
- **code_location**: `src/data/classes.ts:518` (`commander` subclass, level 14)
- **verdict**: mismatch
- **proposed_change**: Rewrite to require both targets (ally + designated enemy) and to state the 14–20 range explicitly. The current text lets the ally's next attack against *anyone* crit.
- **stored_data_impact**: none.

---

### Commander/Warbringer subclass features otherwise match

- **txt_section**: core-rulebook.txt [pages 91–92] lines 4085–4164
- **rule_summary**: Commander L3 Studied Enemy, L6 Band Commander (Commander's Strike / Commanding Presence / Rally); Warbringer L3 Combat Inspiration (Defense / Offense), L6 Extra Attack, L14 War Chant.
- **code_location**: `src/data/classes.ts:509-532`
- **verdict**: match — all six subclass features are present at the correct levels with substantively correct text, including Rally's "Temporary Hit Points equal to the Bands Directive Die roll plus half your Hunter Warden level (round down)". `src/features/hunter/components/appsheet/AppWeaponReference.tsx:33-34` correctly surfaces Commander's Strike (subclass `commander`, level ≥ 6) and Combat Inspiration (`warbringer`) as weapon bonuses; both remain valid.
- **proposed_change**: none
- **stored_data_impact**: none

---

### Core traits, progression table and Expertise automation match

- **txt_section**: core-rulebook.txt [page 87] lines 3864–3898; [page 88] table lines 3928–3948; [page 89] lines 3975–3981
- **rule_summary**: Hit Point Die D10; Max Sanity 14; Sanity Die 4d4; saving throws Wisdom + Charisma; skills choose 2 from Perception, Investigation, Animal Handling, Survival, Presence, Persuasion; armor Light/Medium/Heavy; weapons Simple and Martial; Speed 30 ft. Bands Directive die D6/D8 (L5) /D10 (L10) /D12 (L15). Expertise: two skills at L2, two more at L9.
- **code_location**: `src/data/classes.ts:454-465` and `warden.progression`; `src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx:157-159` (`warden` → 2 at L2 + 2 at L9 = 4)
- **verdict**: match — every hit die / sanity / save / skill / armor / speed value and all 20 proficiency-bonus and Directive-die cells are correct, and the Expertise count special-case is right. Levels 2, 4–20 feature strings all match the table exactly (only the L1 and L3 rows are wrong, covered above).
- **proposed_change**: none
- **stored_data_impact**: none

---

### ASI / Epic Boon cross-reference points at the wrong chapter

- **txt_section**: core-rulebook.txt [page 89] lines 3993–3999 and [page 90] lines 4032–4035 — both say "see **chapter 5**".
- **rule_summary**: Feats live in chapter 5 of the beta rulebook.
- **code_location**: `src/data/classes.ts:496` and `:506` — both say "see chapter 4".
- **verdict**: mismatch (cosmetic)
- **proposed_change**: Update both to "chapter 5". Note this is almost certainly a repo-wide pattern across all six classes — best handled once, globally, rather than per-class.
- **stored_data_impact**: none
