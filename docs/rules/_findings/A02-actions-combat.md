# A02 — Actions, action economy, movement, combat (core-rulebook.txt lines 575–905 / pages 16–20)

Scope read in full: Main Actions table (p16), Bonus Actions / Utilize Action / Reactions (p17),
Movement + Size (p18), Environmental Effects / cover / ranged difficult shots (p19),
Mounted rules + Conditions preamble (p20). Also read p15 (Initiative/Delay) for context and
p21–23 (Conditions tables) because two p16 actions apply conditions.

Code actually read: `src/api/combat.ts`, `src/features/play/store/combatStore.ts`,
`src/features/play/lib/turnTimer.ts`, `src/features/game/components/BattleCombatantRow.tsx`,
`src/data/conditions.ts`, `src/data/codex.ts`, `src/data/codex.generated.json`,
`src/data/skills.ts`, `src/data/weapons.ts`, `src/lib/character.ts`,
`src/features/hunter/lib/characterAutomation.ts`, `src/features/hunter/components/**`.

**Headline:** the app has no representation of the action economy at all. `Combatant`
(`src/types.ts`) tracks only initiative / HP / AC / conditions / note / reveal flags. There is no
Main Action, Bonus Action, Reaction, movement, Speed, or cover state anywhere in
`features/play` or `features/game`, and the Codex contains no entry for any of these pages.

---

### Action economy (Main Action / Bonus Action / Reaction) is absent from combat tracking
- **txt_section**: core-rulebook.txt [page 15–17] "Main Actions", "Bonus Actions", "Reaction"
- **rule_summary**: "You can normally take one Main Action on your turn." "You can take only one Bonus Action on your turn, and only when a feature, Rite, item, or other rule grants one." "After using a Reaction, you cannot use another until the start of your next turn." Reactions may be spent on another creature's turn.
- **code_location**: `src/features/play/store/combatStore.ts` (`nextTurn`, `patch`, `toggleCondition`), `src/api/combat.ts` (`playerProjection`/`fromDoc` — the full persisted combatant shape), `src/features/game/components/BattleCombatantRow.tsx`. ABSENT — no `mainAction`/`bonusAction`/`reaction` field exists.
- **verdict**: missing_in_code
- **proposed_change**: Add three booleans to `Combatant` (`usedAction`, `usedBonus`, `usedReaction`), default `false`; clear `usedAction`/`usedBonus` for the incoming combatant and clear `usedReaction` at the start of that combatant's turn inside `combatStore.nextTurn`; project them in `playerProjection`/`fromDoc`. Render as three small toggle pips in the existing `battle-card-body` of `BattleCombatantRow`, reusing the current condition-chip styling. No new screens.
- **stored_data_impact**: none on `/characters/{id}`. New optional fields on `/games/{id}/combatants` + `/battleView`; `fromDoc` must default missing values to `false` so live games keep working.

### Conditions list covers only 6 of the rulebook's conditions — the p16 actions can't be recorded
- **txt_section**: core-rulebook.txt [page 16] "Blood-Tense", "Taunt", "Grapple", "Shove or Shove Aside", "Haul Down", "Hide", "Dodge"; [page 22] "Conditions: BATTLEFIELD STATES"
- **rule_summary**: Blood-Tense grants **Blood-Tensed** until end of your next turn; Taunt imposes **Taunted**; Grapple imposes **Grappled**; Shove/Haul Down impose **Prone**; Hide makes you **Invisible**. The Battlefield States table names Blood-Tensed, Demoralized, Flanked, Grappled, High Ground, Invisible, Prone, Aiming Prone, Surrounded, Taunted; Impairments add Blinded, Deafened, Mesmerized, Frightened, Incapacitated, Paralyzed, Restrained, Stunned, Unconscious; Hazards & Afflictions add Dying, Exhaustion, Poisoned, Sleepless, Suffocating, Underwater; Special adds Insane.
- **code_location**: `src/data/conditions.ts` → `CONDITIONS` from `CURRENT_CONDITIONS` = `src/data/codex.generated.json` `conditionsNamedByCurrentSources` = **`["Blinded","Frightened","Incapacitated","Insane","Invisible","Restrained"]`**. Consumed by `BattleCombatantRow.tsx` (`availableConditions`) and `combatStore.toggleCondition`.
- **verdict**: mismatch
- **proposed_change**: Regenerate `conditionsNamedByCurrentSources` from the new `core-rulebook.txt` condition tables so the battle-row condition menu offers all ~26 named conditions, keeping the existing chip UI and `conditionId()` slugging unchanged. Do not hand-edit the generated file — the generator must read the new txt. (The GM-only Lost Condition and Second Threshold from p23 must stay out of the public list.)
- **stored_data_impact**: none on `/characters/{id}`. Existing `combatant.conditions` ids stay valid (`CONDITION_NAME` already falls back for unknown ids); no remap needed since the 6 current names keep the same slugs.

### Blood-Tensed damage rule has no representation
- **txt_section**: core-rulebook.txt [page 16] "Blood-Tense"; [page 22] "Blood-Tensed"
- **rule_summary**: Main Action. Attacks against you have Advantage. Your next melee weapon attack before the end of your next turn "rolls its normal weapon damage dice **three times** on a hit"; you may choose Disadvantage to roll them **four times**. It multiplies only normal weapon dice — modifiers and extra damage are added once. Ends after the attack (hit or miss) or at end of your next turn.
- **code_location**: `src/features/hunter/components/appsheet/AppWeaponReference.tsx` (`bonusesFor` — lists Hunter's Mark, Sneak Attack, Brutal Strike, Frenzy, Maneuvers, Savage Attacker, Great Weapon Master, Charger; no Blood-Tense). ABSENT elsewhere.
- **verdict**: missing_in_code
- **proposed_change**: Add one entry to the existing "Potential damage bonuses" panel in `AppWeaponReference.tsx`, unconditional for every hunter: `{ label: "Blood-Tensed", value: "×3 weapon dice", detail: "Main Action. Your next melee hit rolls normal weapon dice three times (four with chosen Disadvantage); modifiers added once." }`. Same panel, same row markup.
- **stored_data_impact**: none

### Off-hand Attack is the only universal Bonus Action and is unlisted
- **txt_section**: core-rulebook.txt [page 17] "Bonus Actions" table, "Off hand Attack"
- **rule_summary**: After attacking with a **Light** melee weapon held in one hand, attack once with a **different Light** melee weapon in the other. "Do not add a positive ability modifier to its damage." Either weapon may be thrown if it has the Thrown property.
- **code_location**: `src/data/weapons.ts` — the Light/Thrown properties needed to evaluate this already exist (`dagger` "Finesse, Light, Thrown (20/60)", `handaxe` "Light, Thrown (20/60)", `sickle` "Light", `scimitar`/`shortsword` "Finesse, Light"). The Off-hand Attack rule itself is ABSENT; only the `Nick` mastery text in `WEAPON_MASTERY` alludes to it.
- **verdict**: missing_in_code
- **proposed_change**: Add an Off-hand Attack line to the same `AppWeaponReference` bonuses list, shown when the hunter's equipped weapons include two different Light melee weapons. No new component.
- **stored_data_impact**: none

### `Nick` mastery wording is consistent with the new Bonus Action rule — confirmed match
- **txt_section**: core-rulebook.txt [page 17] "Off hand Attack"
- **rule_summary**: The off-hand attack normally costs a Bonus Action.
- **code_location**: `src/data/weapons.ts:26` — `Nick: "Make the Light weapon's extra attack during the Attack action instead of using a Bonus Action (once per turn)."`
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Every skill named by the p16 action table exists with the correct ability — confirmed match
- **txt_section**: core-rulebook.txt [page 16] Grapple/Shove/Disarm/Escape/Overrun/Tumble/Hide/Search/Study/Communicate/Taunt
- **rule_summary**: The actions reference Strength (Athletics), Dexterity (Acrobatics), Dexterity (Stealth), Wisdom (Insight/Medicine/Perception/Survival), Intelligence (Blood Nature/Eldritch Knowledge/Investigation/Old World History/Religion), Charisma (Deception/Intimidation/Presence/Persuasion).
- **code_location**: `src/data/skills.ts` `SKILLS` — all 19 present with exactly those ability bindings (`Presence` → `cha`, `Blood Nature` → `int`, `Old World History` → `int`, `Grit` → `con`).
- **verdict**: match
- **proposed_change**: none
- **stored_data_impact**: none

### Movement / Speed is not tracked in combat, and Speed is the unit the p18 table is priced in
- **txt_section**: core-rulebook.txt [page 18] "Movement", "Dash", "Difficult Terrain", "Stand Up", "Take Cover", "Grapple Move"
- **rule_summary**: You move up to your Speed per turn, divisible around actions. Move 5 ft costs 5 ft; Climb/Swim/Crawl 5 ft costs 10 ft; Difficult Terrain every 5 ft costs 10 ft (multiple sources do not stack); Stand Up costs **half your Speed**; Dash grants additional movement equal to your Speed; Take Cover costs **25 feet**; Grapple Move costs 1 extra foot per foot; Mount/Dismount costs half your Speed.
- **code_location**: Speed exists only on the character sheet (`src/features/hunter/components/character-sheet/CharacterSheetDerivedStat.tsx` `speed`, `klass.speedFt` + `speedModifier`; `CharacterSheetHome.tsx`). It is never carried into `Combatant` (`src/api/combat.ts`) and no movement budget exists in `combatStore.ts`.
- **verdict**: missing_in_code
- **proposed_change**: Minimal: include the hunter's derived `speed` in the combatant row's stat line via the existing `combatVitals` helper (`src/features/game/lib/combatPresentation.ts`) so the DM can see each Hunter's Speed while adjudicating movement. Do **not** build a movement tracker — there is no grid/map surface to hang it on.
- **stored_data_impact**: none (derive from `/characters/{id}` at read time; do not denormalize onto combatant docs).

### Cover is a numeric bonus the app never surfaces
- **txt_section**: core-rulebook.txt [page 19] cover table; [page 18] "Take Cover"
- **rule_summary**: Half cover **+2** to AC and Dex-save bonus; Three-quarters cover **+5**; Total cover cannot be targeted directly but AoE Rites may still affect. Take Cover (25 ft of movement) upgrades your cover one degree; it ends when you move, attack, become Incapacitated, or start your next turn, and "ends before resolving an attack that you make."
- **code_location**: ABSENT. `BattleCombatantRow.tsx` has a manual `changeArmorClass(delta)` (±AC) which is the only way a DM can express cover today.
- **verdict**: missing_in_code
- **proposed_change**: Optional and low-cost: add "Half cover (+2)" / "Three-quarters cover (+5)" / "Total cover" as three ordinary entries in the condition list so a DM can chip them onto a combatant, rather than nudging AC by hand. They are battlefield states in everything but name. If the generated condition list is regenerated (finding 2), keep cover out of it and add these as an explicit small constant next to `CONDITIONS`.
- **stored_data_impact**: none

### Surprise gives Disadvantage on the Initiative roll; the app rolls a flat d20 + Dex
- **txt_section**: core-rulebook.txt [page 15] "Initiative"
- **rule_summary**: Initiative is a Dexterity check. "A creature unaware of every opposing threat is surprised and rolls Initiative with Disadvantage." Incapacitated creatures likewise roll Initiative with Disadvantage ([page 21], Incapacitated).
- **code_location**: `src/features/play/store/combatStore.ts:16` `rollD20()` and `startEncounter`/`startSessionEncounter`/`startNewSessionEncounter` — always `rollD20() + p.dexMod`.
- **verdict**: mismatch (incomplete)
- **proposed_change**: In `StartBattleDialog.tsx` add a per-Hunter "surprised" checkbox that makes the seed roll `Math.min(rollD20(), rollD20()) + dexMod`. Existing dialog, one extra checkbox column.
- **stored_data_impact**: none

### Initiative ties are auto-resolved alphabetically; the rules give the choice to the players/GM
- **txt_section**: core-rulebook.txt [page 15] "Initiative"
- **rule_summary**: "If players tie, they decide their order. The GM decides ties between monsters and ties between a monster and a player character."
- **code_location**: `src/features/play/store/combatStore.ts:21` `initiativeOrder()` — `b.initiative - a.initiative || a.name.localeCompare(b.name)`.
- **verdict**: mismatch (minor)
- **proposed_change**: The row already exposes `changeInitiative(±1)` in `BattleCombatantRow.tsx`, which lets the DM break a tie manually. Leave the sort as a deterministic fallback; no code change needed beyond noting that name-order is not a rule. Recommend **no change**.
- **stored_data_impact**: none

### Delay is a distinct mechanic from Ready and is unimplemented
- **txt_section**: core-rulebook.txt [page 15] "Delay"
- **rule_summary**: At the start of your turn, before doing anything else, you may Delay without using an action; you remove yourself from Initiative and may take the delayed turn immediately after another creature finishes its turn, **permanently moving** your Initiative position. You cannot take Reactions while delayed. If you stay delayed a whole cycle, the turn is lost and you return to your original position. "Delay moves your entire turn. Ready prepares one specific Reaction and does not change your Initiative."
- **code_location**: `src/features/play/store/combatStore.ts` `nextTurn` — strictly walks `initiativeOrder` and increments `round` at wraparound. ABSENT.
- **verdict**: missing_in_code
- **proposed_change**: The existing `changeInitiative` control already lets a DM move a combatant's slot, which is exactly the "permanently moves you to that position" outcome. Recommend adding only a "Delay" entry to the per-row `battle-more-menu` that sets `initiative` to just below the next combatant in order. Small, fits the existing menu.
- **stored_data_impact**: none

### Ready action's Rite/Concentration cost is unmodelled — but so is Concentration generally
- **txt_section**: core-rulebook.txt [page 16] "Ready"
- **rule_summary**: A Readied Rite expends its resources immediately and holds Concentration until the trigger or your next turn; if Concentration breaks or the Rite is not released, "it fails and the resources remain spent."
- **code_location**: ABSENT — no concentration or Strain tracking exists in `features/play` or `features/game`. Strain lives only on the character sheet (`CharacterSheetResources.tsx`).
- **verdict**: missing_in_code
- **proposed_change**: Add "Concentrating" to the condition chip list (finding 2 regeneration) so a DM can mark it. Nothing further — a full Rite-resource engine is out of scope for a content sync.
- **stored_data_impact**: none

### Creature size / space table has no counterpart, and no map surface to need one
- **txt_section**: core-rulebook.txt [page 18] "Creature Size and Space"
- **rule_summary**: Tiny 2½×2½ ft (four share a square), Small/Medium 5×5 ft (1 square), Large 10×10 (2×2), Huge 15×15 (3×3), Gargantuan 20×20 or larger (4×4+). Size gates Grapple ("no more than one size larger than you"), Climb onto a Bigger Creature ("at least two sizes larger"), Move through Creatures, Grapple Move, Flanked and Mount.
- **code_location**: ABSENT. `src/data/creatures.ts` / `src/api/enemies.ts` / `EnemyEditorDialog.tsx` carry no size field.
- **verdict**: missing_in_code
- **proposed_change**: Add an optional `size` field ("Tiny"…"Gargantuan") to the enemy template in `EnemyEditorDialog.tsx` / `src/features/game/lib/enemies.ts`, displayed as text on the combatant row. Only worth doing if enemy stat blocks elsewhere in the rulebook state sizes (verify with the creature-chapter agent). Otherwise: none.
- **stored_data_impact**: none on `/characters/{id}`; a new optional field on enemy templates.

### Mounted rules, environmental obscurement, senses and difficult-shot ranged rules are reference-only text absent from the Codex
- **txt_section**: core-rulebook.txt [page 19–20] "Environmental Effects", Blindsight/Darkvision/Truesight, "Ranged Attack Rules for Difficult Shots", "Mounted Rules"
- **rule_summary**: Lightly obscured = Disadvantage on sight-based Perception; heavily obscured = effectively Blinded. Bright/dim/darkness map to normal/lightly/heavily obscured. A creature between attacker and target grants Half Cover; one sharing/grappling the target grants Three-Quarters Cover; if an attack misses **only** because of creature-granted cover, compare the same total against that creature's AC and it is hit instead; a miss by 1–2 that would hit a creature in the first space directly behind also hits it. A trained mount shares your Initiative, may take only Dash/Disengage/Dodge, and you cannot use your own movement while mounted except to dismount; Falling Off is a DC 10 Dexterity save.
- **code_location**: `src/data/codex.generated.json` `entries` contains only Rites, Whispers, sheet sections and three creature stat blocks — **no rulebook chapter text at all**. `src/features/codex/**` therefore cannot surface any of this.
- **verdict**: missing_in_code
- **proposed_change**: The single highest-value change in this section: extend `bun run codex:generate` to ingest `docs/rules/core-rulebook.txt` chapter sections (Main Actions, Bonus Actions, Reactions, Movement, Environmental Effects, Cover, Mounted Rules, Conditions) as Codex entries, keyed by their headings and page. This makes the whole action economy searchable in the existing Codex UI with zero new components. `hidden-condition-sheet.txt` must remain excluded from the generator's public output.
- **stored_data_impact**: none
