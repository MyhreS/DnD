# B05 — Direction B (code/UI → txt): live game / Play surfaces

Scope walked: `src/features/play/**`, `src/features/game/**`, `src/api/games.ts`,
`src/api/players.ts`, `src/lib/slots.ts`, `src/lib/inventory.ts`,
`src/lib/insight.ts`, `src/lib/character.ts` (combat-facing parts), plus the
second-display board `src/features/status/components/StatusPage.tsx` (it renders
the live encounter and is fed entirely by the play stores).

Two notes on the task scope up front:

- **`src/api/trades.ts` does not exist.** The API surface is
  `activity.ts allowlist.ts campaigns.ts combat.ts enemies.ts games.ts players.ts
  sessionLoot.ts sessionNotes.ts users.ts workshop.ts`. Player-to-player trading
  is not implemented anywhere in the current tree; the only item transfer paths
  are DM→player (`charactersStore.dmPatch`), death-drop loot
  (`api/games.ts createLoot`) and session loot claiming (`api/sessionLoot.ts`).
- **No GM-only leak found in this scope.** The battle tracker's condition list is
  generated from `conditionsNamedByCurrentSources` in
  `src/data/codex.generated.json` = `["Blinded","Frightened","Incapacitated",
  "Insane","Invisible","Restrained"]`. Nothing from `hidden-condition-sheet.txt`
  ("Old One Vessel", "Second Threshold", "Lost", "Player Alterations") appears
  anywhere under `src/` or `public/` — grepped and confirmed clean. The two
  Special conditions the core rulebook *does* name in public text (`Lost
  Condition`, `Second Threshold`) are correctly present only as pointers in the
  txt, not in app data.

---

### Initiative roll: d20 + Dex modifier

- **app_location**: `/Users/simonmyhre/workdir/gitdir/DnD/.claude/worktrees/cs-beta-release-integration-be1e76/src/features/play/store/combatStore.ts` — `rollD20()`, `startEncounter` / `startSessionEncounter` / `startNewSessionEncounter` (`initiative: rollD20() + p.dexMod`); `/Users/simonmyhre/.../src/features/game/lib/combatPresentation.ts` — `participantInitiative()` (sheet `initiative` field, else `Math.floor((card.abilities.dex - 10) / 2)`)
- **ui_or_logic_summary**: On "Start battle" every seated Hunter is auto-rolled `1d20 + Dex mod`; enemies get a DM-entered flat number. Order is `initiative` descending, ties broken alphabetically by name (`initiativeOrder`).
- **found_in_txt**: yes — core-rulebook.txt [page 15] "When combat begins, each participant makes a Dexterity check called an Initiative roll. Act from the highest total to the lowest." and [page 43] "Initiative. Write your Dexterity modifier in the space for Initiative on your character sheet."
- **proposed_change**: keep. The roll formula and the descending order are correct.
- **stored_data_impact**: none.

### Initiative ties are auto-resolved by name; the rules give the choice to the players/GM

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/combatStore.ts` — `initiativeOrder()`: `b.initiative - a.initiative || a.name.localeCompare(b.name)`
- **ui_or_logic_summary**: Equal initiative silently sorts alphabetically, with no way to reorder except editing one combatant's initiative number in `BattleCombatantRow`.
- **found_in_txt**: changed — core-rulebook.txt [page 15]: "If players tie, they decide their order. The GM decides ties between monsters and ties between a monster and a player character."
- **proposed_change**: update (minimal). Keep the alphabetical fallback as the *default* ordering, but the existing per-row initiative stepper already lets the DM break a tie by ±1. The truly minimal edit is copy only: no code change is required for correctness — flag as acceptable divergence, or (if wanted) change the tiebreak to `a.createdAt - b.createdAt` so the DM's/party's stated order is preserved rather than being reshuffled by name.
- **stored_data_impact**: none.

### Surprise → Initiative with Disadvantage is not modelled

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/combatStore.ts` — `startEncounter` (single `rollD20()` per PC, no advantage/disadvantage input); `/Users/simonmyhre/.../src/features/game/components/StartBattleDialog.tsx` (enemy picker only)
- **ui_or_logic_summary**: Start battle rolls one flat d20 per Hunter. There is no surprise flag anywhere in `EncounterState` or the start dialog.
- **found_in_txt**: yes (rule exists, app lacks it) — core-rulebook.txt [page 15]: "A creature unaware of every opposing threat is surprised and rolls Initiative with Disadvantage"; also [page 26] "Characters surprised by an interruption roll Initiative with Disadvantage"; and the `Incapacitated` condition [page 21]: "If Incapacitated when Initiative is rolled, roll with Disadvantage."
- **proposed_change**: keep (no redesign). The DM can already overwrite any rolled initiative in `BattleCombatantRow`. If an addition is wanted later it belongs in `StartBattleDialog` as a per-Hunter "surprised" checkbox feeding `Math.min(rollD20(), rollD20()) + dexMod` — but that is new UI, out of the design-preserving remit.
- **stored_data_impact**: none.

### Round/turn advance loop matches the rules

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/combatStore.ts` — `nextTurn()`; `/Users/simonmyhre/.../src/features/game/components/SessionCombatSection.tsx` — `SessionCombatControls` ("Finish turn / Next turn →"); `/Users/simonmyhre/.../src/features/game/components/SessionBattleView.tsx` (Round badge, "Current turn", "Up next")
- **ui_or_logic_summary**: One turn pointer (`combat.turnId`) walks the initiative order; wrapping past the last combatant increments `combat.round`. `remove()` hands the turn to the next combatant and bumps the round if the removed one was last.
- **found_in_txt**: yes — core-rulebook.txt [page 13]: "Combat uses strict rounds and turns. On your turn, you can move up to your Speed, take one Main Action, and take one Bonus Action if a rule grants one."
- **proposed_change**: keep. Non-obvious confirmed match — the round-wrap and removal-reindex logic is correct under the current rules.
- **stored_data_impact**: none.

### Per-turn action economy (Main Action / Bonus Action / Reaction) is entirely absent from the battle screen

- **app_location**: `/Users/simonmyhre/.../src/features/game/components/BattleCombatantRow.tsx` (whole row: HP, initiative, AC, conditions only); `/Users/simonmyhre/.../src/types.ts` — `Combatant`
- **ui_or_logic_summary**: A combatant row tracks nothing about what the creature has spent on its turn. There is no action/bonus-action/reaction/movement state.
- **found_in_txt**: yes — core-rulebook.txt [page 13] and [page 15–16] define one Main Action, one Bonus Action, movement up to Speed, plus a 15-entry Main Actions table (Attack, Grapple, Shove, Disarm, Haul Down, Climb onto a Bigger Creature, Blood-Tense, Dash, Disengage, Dodge, Overrun, Tumble, Utilize, Search, Delay/Ready).
- **proposed_change**: keep. This is a deliberate table-tool scope decision (the app tracks the encounter, not each creature's action economy); CLAUDE.md forbids redesigning established screens because a topic exists in the sources. Recording it here so it is not mistaken for an oversight.
- **stored_data_impact**: none.

### "Designated Warden" is persisted per encounter but is not a rule and is never read

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/combatStore.ts` — `PcSeed.isWarden`, `designatedWardenId` written in `startEncounter`, `startSessionEncounter`, `startNewSessionEncounter`, `remove`; `/Users/simonmyhre/.../src/features/game/lib/combatPresentation.ts` — `isWarden()`; `/Users/simonmyhre/.../src/features/play/lib/turnTimer.ts` — `emptyEncounter()`, `normalizeEncounterState()`; `/Users/simonmyhre/.../src/types.ts` — `EncounterState.designatedWardenId`
- **ui_or_logic_summary**: Starting a battle picks the first Warden-class Hunter in initiative order and stores their combatant id on the game document; `remove()` re-elects one when that combatant leaves. **No component reads `designatedWardenId`** (grep across `src/**/*.tsx` returns zero hits) — it is write-only state.
- **found_in_txt**: no. The beta rules have no "designated Warden" of an encounter. `Warden` is only (a) a class — core-rulebook.txt [page 27]-ish class chapter, "Hunter Warden" [page 82+], and (b) an attacker-relative reference inside one condition: core-rulebook.txt [page 22] `Demoralized` — "the **Warden who Demoralized you** may roll the Bands Directive die placed on you … the condition ends at the end of **that Warden's** next turn." That is per-application and per-attacker, not a single Warden designated for the battle.
- **proposed_change**: remove. Drop `PcSeed.isWarden`, the `isWarden()` helper in `combatPresentation.ts`, `EncounterState.designatedWardenId`, its four write sites in `combatStore.ts`, and its branch in `normalizeEncounterState`. `Combatant.isWarden` should go with it (also write-only). No UI changes, since nothing renders it.
- **stored_data_impact**: none on `/characters/{id}`. On `/games/{id}`: the stale `combat.designatedWardenId` field and `/games/{id}/combatants/{id}.isWarden` become dead — `normalizeEncounterState` already tolerates missing values, so they can simply be left to rot or stripped in the same migration pass. No character field to strip, remap, or backfill.

### Turn timer state is vestigial and has no rule behind it

- **app_location**: `/Users/simonmyhre/.../src/features/play/lib/turnTimer.ts` — `LEGACY_TURN_DURATION_MS = 90_000`, `TIMER_PHASES` (`idle | briefing | running | paused | untimed | expired`), `normalizeEncounterState()`; `/Users/simonmyhre/.../src/types.ts` — `TurnTimerPhase`, `EncounterState.timerPhase/timerEndsAt/pausedRemainingMs`
- **ui_or_logic_summary**: Every write site in `combatStore.ts` and `GamePage.tsx` sets `timerPhase: "idle", timerEndsAt: null, pausedRemainingMs: null`. Nothing ever sets any other phase and nothing renders a countdown. The 90-second constant survives only to clamp legacy `pausedRemainingMs` values.
- **found_in_txt**: no. There is no per-turn time limit anywhere in the four sources (searched core-rulebook.txt for "timer", "seconds", "time limit", "90" — the only "90" hits are weapon ranges, e.g. [page 56] "Range: 90 feet").
- **proposed_change**: remove. Delete `TurnTimerPhase`, the three timer fields from `EncounterState`, `LEGACY_TURN_DURATION_MS`, and `TIMER_PHASES`; `emptyEncounter()` and every `setCombat` call shed three constant keys. `hasSavedBattle()` already documents that timer state is not evidence of a battle, so it is unaffected.
- **stored_data_impact**: none on `/characters/{id}`. `/games/{id}.combat.{timerPhase,timerEndsAt,pausedRemainingMs}` become dead fields; safe to leave (readers stop looking) or strip alongside `designatedWardenId`.

### Rest locations: "Hunters Lodge" is not a third, better tier than "Safe Zone"

- **app_location**: `/Users/simonmyhre/.../src/features/play/lib/phase.ts` — `LOCATIONS` (`wild` / `safe` / `lodge`); `/Users/simonmyhre/.../src/types.ts` — `GameLocation`; rendered as a chip in `/Users/simonmyhre/.../src/features/status/components/StatusPage.tsx` line 50 and logged by `gameStore.setLocation`
- **ui_or_logic_summary**: Three locations with rules hints: `wild` — "Out on the hunt — no Hit Dice on a Short Rest; a Long Rest restores only half HP"; `safe` — "Safe enough to catch a breath — spend Hit Dice on a Short Rest"; `lodge` — "A true haven — a Long Rest restores all HP and Hit Dice."
- **found_in_txt**: changed — core-rulebook.txt [page 25]: "A Safe Zone is a protected location designated by the GM. **The Hunter's Lodge is always a Safe Zone.** A locked room, hidden alley, or wilderness camp does not become a Safe Zone merely because it appears quiet." Safe-Zone benefits are one tier: Short Rest "Spend a number of Hit Point Dice up to your Proficiency Bonus … Hit Point Dice cannot be spent outside a Safe Zone"; Long Rest "Regain all lost Hit Points. Regain all expended Hit Point Dice." Outside: "Regain Hit Points equal to half your Hit Point maximum … You regain no expended Hit Point Dice." Confirmed again at [page 43].
- **proposed_change**: update. Keep all three ids (they are a nice flavour distinction and `lodge` is a legitimate named Safe Zone), but fix the hints so `safe` and `lodge` state the *same* mechanical benefits: `safe` → "A Safe Zone — spend Hit Dice on a Short Rest; a Long Rest restores all HP and Hit Dice."; `lodge` → "The Hunter's Lodge — always a Safe Zone; same rest benefits." `wild` is correct as written. Also correct the `short_rest` phase hint (below).
- **stored_data_impact**: none — `GameLocation` lives on `/games/{id}`, not on `HunterCard`.

### Short Rest phase hint omits the two benefits that always apply

- **app_location**: `/Users/simonmyhre/.../src/features/play/lib/phase.ts` — `PHASES` entry `short_rest`, hint "A breather: spend Hit Dice, regain some uses."
- **ui_or_logic_summary**: Phase hint copy shown next to the Short Rest phase.
- **found_in_txt**: changed — core-rulebook.txt [page 25] "Benefits: When you finish a Short Rest: - Regain features that recover on a Short Rest. - **Remove 1 Transformation Level.** - **Reduce your Sleepless Counters by 6.** In a Safe Zone, you may also: - Spend a number of Hit Point Dice up to your Proficiency Bonus…". Spending Hit Dice is *Safe-Zone-only*, so the current hint states the conditional benefit and omits both unconditional ones. [page 26] adds the optional "DC 13 Constitution (Grit) check" for a second Transformation Level.
- **proposed_change**: update — one-line copy edit: `"A breather: −1 Transformation Level, −6 Sleepless; Hit Dice only in a Safe Zone."` Same for `long_rest`, currently "Full rest: restore HP and reset resources" → [page 25] Long Rest also removes **all** Transformation Levels, resets Sleepless Counters to 0, rolls the Sanity Die to reduce Madness, and loses unspent Blood Tinge.
- **stored_data_impact**: none.

### `PHASES` and `LOCATIONS` (with their rules hints) are exported but unconsumed

- **app_location**: `/Users/simonmyhre/.../src/features/play/lib/phase.ts` — `PHASES`, `LOCATIONS`
- **ui_or_logic_summary**: Only the derived `PHASE_LABEL` / `LOCATION_LABEL` maps are imported anywhere (`gameStore.ts` logging, `StatusPage.tsx`). The arrays' `hint` strings — the rules text discussed in the two findings above — render nowhere in the current UI.
- **found_in_txt**: n/a (dead code, not a rule).
- **proposed_change**: update. Fix the hint text as above *and* note that it is currently invisible; `knip` may already flag `PHASES`/`LOCATIONS`. Either restore a phase picker that uses them (a product decision, out of scope) or reduce the file to the two label maps. Do not silently delete the hints without telling the game maker that the Play phase picker they describe is gone.
- **stored_data_impact**: none.

### Nothing in Play applies any rest mechanic — phase changes are pure labels

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/gameStore.ts` — `setPhase()` (writes `phase`, logs a chronicle line, nothing else); `/Users/simonmyhre/.../src/api/games.ts` — `setGamePhase()` (`updateDoc(..., { phase })`)
- **ui_or_logic_summary**: Setting the game to `short_rest` / `long_rest` writes one string to `/games/{id}`. It does not touch any `HunterCard`: no HP restore, no Hit Dice, no Transformation Level reduction, no Sanity Die / Madness reduction, no Sleepless reset, no Blood Tinge clear, no `Not Tonight!` restore.
- **found_in_txt**: yes (rule exists, app applies none of it) — core-rulebook.txt [page 25] Short/Long Rest benefit lists; [page 44] "Unspent Blood Tinge is lost when you finish a Long Rest"; [page 44] "Whenever you finish a Long Rest, you regain Not Tonight! if you do not already have it."
- **proposed_change**: keep the current design (rests are narrated, players update their own sheets). Flag only: the `long_rest` phase is the single obvious place a future automation would hook, and `bloodTinge` in particular is a boolean that the rules say expires on a Long Rest but which no code path ever clears.
- **stored_data_impact**: none from this finding alone; see the Blood Tinge finding below.

### Blood Tinge is a boolean with no round limit and no Long Rest expiry

- **app_location**: `/Users/simonmyhre/.../src/types.ts` — `HunterCard.bloodTinge?: boolean`; `/Users/simonmyhre/.../src/lib/character.ts` — `emptyCard()` (`bloodTinge: false`)
- **ui_or_logic_summary**: A single boolean on the card. Nothing in the play/game surfaces reads or writes it — not `BattleCombatantRow`, not `StatusPage`'s `VitalsCard`, not `charactersStore.dmPatch` callers.
- **found_in_txt**: yes — core-rulebook.txt [page 44]: "**Once per round**, when damage leaves you with **1–9 Hit Points**, you gain Blood Tinge. You can have only one Blood Tinge at a time. … Unspent Blood Tinge is lost when you finish a Long Rest."
- **proposed_change**: keep the boolean (correct shape: "only one at a time"). No minimal edit is available without new UI. Note that the trigger (`1–9 HP` after damage) is exactly computable from `BattleCombatantRow.setDamage`, which already knows `currentHp` and `maxHp` — the cheapest future hook, if the game maker asks for it.
- **stored_data_impact**: none. Existing cards carry `bloodTinge` correctly typed; no remap needed.

### Death's Door: Dying, death saves, Instant Death, and `Not Tonight!` are unrepresented — and a Hunter cannot be taken below 0 HP

- **app_location**: `/Users/simonmyhre/.../src/features/game/components/BattleCombatantRow.tsx` — `setDamage()`: `const damage = Math.min(vitals.maxHp, Math.max(0, …))`, and the "Kill enemy / Revive" control gated on `combatant.kind === "monster"`; `/Users/simonmyhre/.../src/types.ts` — `HunterCard` has no `notTonight`, no `deathSaveSuccesses`/`Failures`, no `favors`
- **ui_or_logic_summary**: Damage on a Hunter row is clamped to `maxHp`, so `currentHp` floors at exactly 0 and the excess is discarded. There is no Dying state, no d20 death-save tracker, and the kill/revive affordance exists only for enemies. `Dying` is not even in the condition picker.
- **found_in_txt**: yes (rule exists, app lacks it) — core-rulebook.txt [page 21] `Dying`: "At the start of each of your turns, roll 1d20. A result of 10 or higher is one success… Three successes make you Stable. Three failures kill you. … A natural 1 causes two failures. A natural 20 restores 1 Hit Point… Taking damage causes one failure, or two if the damage is from a Critical Hit. **Instant Death.** When damage reduces you to 0 Hit Points, you die immediately if the remaining damage equals or exceeds your Hit Point maximum." And [page 44] `Not Tonight!`: "A newly created Hunter begins with Not Tonight! … set your Hit Points to 1 instead of 0."
- **proposed_change**: update (one real bug, the rest deferred). The clamp in `setDamage` **destroys the number Instant Death depends on**: a Hunter at 10 HP taking 55 damage records "10 damage" and 0 HP, so the DM can no longer see that the remaining 45 ≥ HP max. Minimal fix: keep the display clamp but stop clamping the stored value — allow `currentHp` to go negative (`vitals.maxHp - damage` without the `Math.min` cap on `damage`), and let the existing health bar clamp at 0% as it already does via `Math.max(0, …)` in `healthPercent`. Adding `Dying` to the condition picker requires `codex:generate` to emit it (see next finding) and no component change.
- **stored_data_impact**: none on `/characters/{id}` (`currentHp` lives on `/games/{id}/combatants/{id}`, not the card). If `Not Tonight!` and Favors are ever added, both are **new required fields needing backfill**: `notTonight: true` (rules: a newly created Hunter begins with it, and every Long Rest restores it) and `favors: 0` (max 2).

### Condition picker offers 6 of the ~30 conditions the sources name

- **app_location**: `/Users/simonmyhre/.../src/data/conditions.ts` — `CONDITIONS` = `CURRENT_CONDITIONS.map(…)`; consumed by `/Users/simonmyhre/.../src/features/game/components/BattleCombatantRow.tsx` (`availableConditions`, the `+ Condition` select, and `CONDITION_NAME` for the applied chips)
- **ui_or_logic_summary**: The `+ Condition` dropdown in a battle row is generated from `codex.generated.json → conditionsNamedByCurrentSources`, currently exactly `Blinded, Frightened, Incapacitated, Insane, Invisible, Restrained`. The generator harvests names *mentioned* in prose, not the conditions tables.
- **found_in_txt**: changed — core-rulebook.txt [pages 21–23] define four subcategories with full tables. **Impairments**: Blinded, Deafened, Mesmerized, Frightened, Incapacitated, Paralyzed, Restrained, Stunned, Unconscious. **Hazards & Afflictions**: Dying, Exhaustion, Poisoned, Sleepless, Suffocating, Underwater. **Battlefield States**: Blood-Tensed, Demoralized, Flanked, Grappled, High Ground, Invisible, Prone, Aiming Prone, Surrounded, Taunted. **Special**: Insane (plus `Lost Condition` and `Second Threshold`, which the core rulebook explicitly defers to the GM-only sheet).
- **proposed_change**: update. Extend the generator so `conditionsNamedByCurrentSources` is sourced from the three public conditions tables rather than from prose mentions, yielding the 25 public names above. **Must exclude `Lost` and `Second Threshold`** — the core rulebook names them but states "Its trigger and effects appear only on the Hidden Condition Sheet", so putting them in a player-facing picker would advertise GM material. `Insane` stays (it is fully defined in the public text at [page 23]). No component change: `BattleCombatantRow` renders whatever the catalog contains, and `conditionId()` slugging handles `Blood-Tensed` → `blood-tensed` and `High Ground` → `high-ground` correctly.
- **stored_data_impact**: none on `/characters/{id}`. Applied conditions live on `/games/{id}/combatants/{id}.conditions[]` as slugs; the comment in `conditions.ts` ("Historical saved ids remain displayable") already covers ids that fall out of the catalog, and this change only *adds* names.

### Condition-duration counter is a house convention, not a rule

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/combatStore.ts` — `toggleCondition()` writes `conditionSince[conditionId] = Math.max(1, round)`; `/Users/simonmyhre/.../src/features/game/components/BattleCombatantRow.tsx` — `const rounds = since ? Math.max(1, round - since + 1) : null;` rendered as e.g. `Frightened · 3r`
- **ui_or_logic_summary**: Every applied condition shows how many rounds it has been active.
- **found_in_txt**: yes (compatible, not contradicted) — core-rulebook.txt [page 20]: "**Duration.** A condition lasts until its source says it ends. **Repeated Conditions.** Multiple instances don't intensify the condition, but their durations are tracked separately."
- **proposed_change**: keep. A round counter is exactly the tracking aid the "durations are tracked separately" rule implies, and no condition in the beta has a fixed round count the counter could contradict.
- **stored_data_impact**: none.

### `Insane` is togglable by hand although it is fully derivable from Madness vs Max Sanity

- **app_location**: `/Users/simonmyhre/.../src/features/game/components/BattleCombatantRow.tsx` (the `+ Condition` select); `/Users/simonmyhre/.../src/features/status/components/StatusPage.tsx` — `VitalsCard` (shows `sanityCur` / `sanityMax` from `characterVitals`); `/Users/simonmyhre/.../src/lib/character.ts` — `maxSanity()`, `normalizeCard()` (which already migrated the card to an independent `madness` counter)
- **ui_or_logic_summary**: The DM ticks `Insane` manually on a combatant row. The Status board separately shows a Sanity current/max pair read from the paper-sheet fields `sheet.sanityCur` / `sheet.sanityMax`, while the structured card carries `madness`.
- **found_in_txt**: yes — core-rulebook.txt [page 23]: "**When your Madness equals or exceeds your Max Sanity, you gain the Insane condition.** The Insane condition ends immediately when your current Madness is reduced below your Max Sanity."
- **proposed_change**: keep the manual toggle (removing it would break the DM's ability to apply Insane to a monster or NPC). Flag the *display* divergence instead: the live board's "Sanity current/max" reading is the pre-beta model; the beta tracks Madness upward toward Max Sanity, with Insane at parity. Aligning the `VitalsCard` readout to `madness / maxSanity` is a `papersheet.ts`/`characterVitals` change and therefore belongs to B02's remit, not a Play-surface edit.
- **stored_data_impact**: `normalizeCard()` already derives `madness` losslessly from the legacy `sanity`/`sheet.sanityCur` pair and preserves the previously *displayed* gap, including the pre-cap Deepcaller maximum. No further remap needed for the Play surfaces; recomputation of `sanityCur`/`sanityMax` sheet strings is B02's call.

### Insight thresholds match exactly; the "only after a Long Rest" gate is not enforced

- **app_location**: `/Users/simonmyhre/.../src/lib/insight.ts` — `INSIGHT_BY_LEVEL`, `levelForInsight()`; `/Users/simonmyhre/.../src/api/players.ts` — `awardInsight()`; `/Users/simonmyhre/.../src/features/hunter/lib/insightAward.ts` — `insightAwardPatch()`; `/Users/simonmyhre/.../src/features/play/store/charactersStore.ts` — `awardInsight()` (DM control, logs "X was awarded N Insight")
- **ui_or_logic_summary**: The DM adds/subtracts Insight from the play surfaces; the transaction writes only `insight` (a lifetime total, never spent) and the level-up itself is a separate player-driven flow.
- **found_in_txt**: yes — core-rulebook.txt [page 46] Character Advancement table: level 2 = 6, 3 = 15, 4 = 30, 5 = 50, 6 = 75, 7 = 105, 8 = 140, 9 = 180, 10 = 225, 11 = 275, 12 = 330, 13 = 390, 14 = 455, 15 = 525, 16 = 600, 17 = 680, 18 = 765, 19 = 855, 20 = 950. `INSIGHT_BY_LEVEL` reproduces all 20 values exactly.
- **proposed_change**: keep the table (confirmed non-obvious match, all 20 entries verified). Two small updates: (1) core-rulebook.txt [page 46] says "you reach the corresponding level **only after a Long Rest**" — the app makes the upgrade available the instant the threshold is crossed, with no rest gate; and (2) the doc comment on `awardInsight` in `api/players.ts` ("Atomically award Insight and **immediately apply every earned level**") is stale — `insightAwardPatch` returns `{ insight }` only. Fix the comment; the rest gate is a copy/UX note, not a code fix.
- **stored_data_impact**: none. `insight` values remain valid under the unchanged table.

### Insight awarded to a Band with mixed levels lacks the catch-up bonus

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/charactersStore.ts` — `awardInsight(id, delta)` (single character, flat delta)
- **ui_or_logic_summary**: The DM awards Insight one Hunter at a time, at face value.
- **found_in_txt**: yes (rule exists, app lacks it) — core-rulebook.txt [page 46]: "A player gains **twice** as much Insight whenever more than half of the other Hunters in the Band are at a higher Level. Otherwise, if more than half have more total Insight, increase the Insight that player gains **by half, rounding up**. This bonus cannot raise total Insight above the lowest total held by the Hunters forming that majority."
- **proposed_change**: keep the UI, note the rule. Everything the formula needs is already in scope (`charactersStore.party` holds every campaign hunter's `insight` and `level`), so if the game maker wants it, the minimal form is a pure helper computing the multiplier from `(party, targetId, delta)` and applying it inside `awardInsight` — no new UI. Do not implement unasked.
- **stored_data_impact**: none (a forward-looking award rule; it never rewrites existing totals).

### Death on the Play surfaces auto-loots the hunter's whole inventory, and the Favor return path does not exist

- **app_location**: `/Users/simonmyhre/.../src/features/play/store/charactersStore.ts` — `killCharacter()` (archives, then `createLoot(gameId, { items: card.inventory ?? [], coins: card.coins ?? 0 })`), `revive()`, `recover()`; `/Users/simonmyhre/.../src/api/players.ts` — `archiveCharacter()`, `recoverCharacter()`, `purgeArchive()`; `/Users/simonmyhre/.../src/api/games.ts` — `createLoot()`, `purgeLoot()`
- **ui_or_logic_summary**: DM confirms a death → the card moves to `/archive`, and the hunter's entire inventory + coins drop as a claimable loot pile. `recoverCharacter()` restores the archived card **verbatim** (`{ ...a.card, deathPending: false }`). Ending the game calls `purgeArchive()` + `purgeLoot()`, so recovery is only possible during the same session.
- **found_in_txt**: changed — core-rulebook.txt [pages 44–45] `Favor`: "A Hunter can have no more than two Favors. … When you die, you may expend one Favor. This decision must be made when you die. **If you expend a Favor, your body and everything you were wearing or carrying disappear from the world.** … Your body and everything you were wearing or carrying when you died return with you. Expended, consumed, lost, or destroyed equipment does not return. … **When you return, lose all Insight gained since reaching your current Level. Reduce your Insight to the minimum total required for your current Level** … You never lose a Level from expending a Favor." Also: return happens during the Band's next Long Rest, or after 8 hours in the last Safe Zone if no Band member remains alive.
- **proposed_change**: update, in two minimal parts. (1) `recoverCharacter()` is the app's stand-in for a Favor return and must apply the Insight penalty: reduce `insight` to `INSIGHT_BY_LEVEL[card.level]` rather than restoring it untouched — a two-line change reusing the existing `insight.ts` table. (2) The auto-loot in `killCharacter` contradicts the Favor path (which makes the gear vanish *with* the body and return *with* the Hunter): a recovered hunter today comes back with a full inventory while their gear also sits in the loot feed as a duplicate. Minimal fix: keep the drop as the default (no-Favor) death, but have `recover()` clear the corresponding loot pile, or gate the drop behind a DM "drop their gear" choice. Do not build a Favor counter unless asked.
- **stored_data_impact**: **yes.** Recovery currently returns an `insight` total that is too high under the rules; any character recovered before this fix keeps that surplus. A migration would need to recompute `insight = max(insight, INSIGHT_BY_LEVEL[level])` only for known-recovered records — which are not marked, so this is not retro-fixable and should be treated as forward-only. If Favors are added: new field `favors: number` (0–2), **backfill 0** on every existing card.

### `deathPending` has readers but no writer

- **app_location**: `/Users/simonmyhre/.../src/types.ts` — `HunterCard.deathPending?: boolean`; read in `/Users/simonmyhre/.../src/features/status/components/StatusPage.tsx` line 97 (`const dead = card.deathPending || (hp != null && hp <= 0)`); cleared in `charactersStore.revive()`, `charactersStore.recover()`, `api/players.ts recoverCharacter()`
- **ui_or_logic_summary**: Three code paths set `deathPending: false` and one component reads it, but **nothing anywhere sets it to `true`**. The "player declares a death, DM confirms" handshake the field was built for no longer has a trigger. In practice `StatusPage` only ever fades a hunter via the `hp <= 0` fallback.
- **found_in_txt**: no — a pending/declared death is not a rule in the beta sources. The rules put death entirely in the `Dying` condition's death saves and Instant Death ([page 21]) plus the Favor decision ([page 44], "This decision must be made when you die").
- **proposed_change**: remove, or restore a writer. Given the design-preservation constraint, the safe minimal edit is: keep `StatusPage`'s `hp <= 0` check, delete the `card.deathPending ||` term and the field from `types.ts`, and drop `charactersStore.revive()` (whose only job is clearing it — it is otherwise unreferenced). `recoverCharacter()`'s `deathPending: false` becomes a harmless no-op to delete with it.
- **stored_data_impact**: **strip** `deathPending` from `/characters/{id}` — it is `false` or absent on every live record (nothing ever writes `true`), so removal is lossless.

### Carry-condition thresholds are right; two effect strings are incomplete

- **app_location**: `/Users/simonmyhre/.../src/lib/inventory.ts` — `carryCondition(strScore, weightLb)`, `totalCarriedWeight()`
- **ui_or_logic_summary**: Five bands: `Featherweight` ≤ STR×2 (+5 ft), `Normal` ≤ STR×5 (0), `Encumbered` ≤ STR×10 (−10 ft, note "Encumbered — speed −10 ft."), `Heavily Encumbered` ≤ STR×15 (−20 ft, note "disadvantage on STR/DEX checks, attacks and saves"), else `Over Capacity`.
- **found_in_txt**: changed (thresholds match, one effect string is short) — core-rulebook.txt [page 40] carried-weight table: "No more than Strength × 2 lb. — Featherweight — Your speed increases by 5 ft."; "More than Strength × 5 lb. — Encumbered — Your speed is reduced by 10 feet. **You have Disadvantage on Dexterity (Acrobatics and Stealth) checks and Dexterity saving throws.**"; "More than Strength × 10 lb. — Heavily Encumbered — Your speed is reduced by 20 ft. You have disadvantage on Strength and Dexterity ability checks, attack rolls, and saving throws."; "More than Strength × 15 lb. — Over Capacity — You cannot carry this weight normally."
- **proposed_change**: update — one string: the `Encumbered` note becomes "Encumbered — speed −10 ft and disadvantage on Dexterity (Acrobatics, Stealth) checks and Dexterity saves." All five thresholds and both speed deltas are correct and need no change. The unnamed `Normal` band (STR×2 < w ≤ STR×5) has no counterpart in the source table but contradicts nothing — the rules simply name no condition there.
- **stored_data_impact**: none — `carryCondition` is derived at render time from `abilities.str` and inventory; nothing is persisted.

### Item slots and storage grants match the sources exactly

- **app_location**: `/Users/simonmyhre/.../src/lib/slots.ts` — `computeSlots()`, hand exclusivity in `handFreeFor()`; `/Users/simonmyhre/.../src/data/storage.ts` — `BASE_SLOTS`, `STORAGE_DEFS`
- **ui_or_logic_summary**: Base pools `back: 1, chest: 1, hip: 1, ankle: 0, handSignificant: 2, handOversized: 1`, with hands enforcing 2 Significant XOR 1 Oversized (mirrored in the display capacity). Storage grants: sack 15 (hand, consumes the Oversized hand use), backpack 7 (back), bandolier 4 (chest/"Front"), tool belt 4 (hip), carrying harness 2 (back), ankle holster 1 (ankle, Dagger or Pistol only, consumes no base slot).
- **found_in_txt**: yes — core-rulebook.txt [page 41]: "By default your character has unlimited insignificant item slots and **3 significant item slots; 1 slot on the hip, 1 on the back and 1 slot carried on the front.** Your hands can carry **either 2 Significant items or 1 Oversized item** in total… Storage gear can add Significant item slots at a stated location." And [page 122] the Storage Items entries: Ankle Holster "Requires: 0 Item Slots (Ankle). Gives: 1 Significant Item Slot (only Dagger, Pistol) (Ankle)"; Sack "Requires: 1 Oversized item slot … Gives: 15 Significant Item Slots (Hand)"; Backpack "Requires: 1 Significant Item Slot … Gives: 7 Significant Item Slots (Back)"; Bandolier "Gives: 4 Significant Item Slots (Front)"; Tool Belt "Gives: 4 Significant Item Slots (Hip)"; Carrying Harness "Gives: 2 Significant Item Slots (Back)".
- **proposed_change**: keep. Every count, location and restriction verified against the beta text — a non-obvious full match, including the "Front" → `chest` mapping already documented in `storage.ts`.
- **stored_data_impact**: none. `slotAssignments`, `equippedStorageIds` and their `storage:<id>:<n>` encoding remain valid.

### Fixed HP per level coincides with the die-average formula — but only by accident

- **app_location**: `/Users/simonmyhre/.../src/lib/character.ts` — `maxHp()`, `dieAverage(die) = Math.floor(die / 2) + 1`; `/Users/simonmyhre/.../src/data/classes.ts` — `hitDie` per class
- **ui_or_logic_summary**: Level 1 = `hitDie + CON`; each level after adds `floor(hitDie/2) + 1 + CON`, min 1. Class hit dice: Brute 10, Scout 10, Warden 10, Stalker 8, Deepcaller 6, Bloodbound 12.
- **found_in_txt**: yes — core-rulebook.txt [page 46] "Fixed Hit Points by Class": Bloodbound `7 + Con. modifier`, Brute/Scout/Warden `6 + Con. modifier`, Stalker `5 + Con. modifier`, Deepcaller `4 + Con. modifier`. `dieAverage` gives d12→7, d10→6, d8→5, d6→4 — identical for all six classes. Level 1 confirmed at [page 42]: "Brute, Scout, or Warden 10 + Con. modifier".
- **proposed_change**: keep, with a comment. The values are correct today, but the source now states them as a **fixed table keyed by class**, not as a die average — if a future class ever breaks the coincidence the formula silently diverges. Minimal edit: add a comment in `character.ts` citing core-rulebook.txt [page 46] and noting the equivalence, so the next reader checks the table rather than trusting the formula.
- **stored_data_impact**: none — no stored HP maximum changes.

### Proficiency bonus and the DM's Insight/level controls stay consistent

- **app_location**: `/Users/simonmyhre/.../src/lib/character.ts` — `proficiencyBonus(level)` = `2 + floor((clamp(level,1,20) - 1) / 4)`; used indirectly by every play-facing derived number
- **ui_or_logic_summary**: +2 at levels 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20.
- **found_in_txt**: yes — core-rulebook.txt [page 46] Character Advancement table and "3: Adjust Proficiency Bonus. A character's Proficiency Bonus increases at certain levels". The Hunter Warden features table [page 88] shows `+2` at level 3, consistent.
- **proposed_change**: keep. Confirmed match; relevant here because Short Rest Hit Dice spending is capped by Proficiency Bonus ([page 25]) — the app's number is the right one for any future rest automation.
- **stored_data_impact**: none.

### Enemy stat model carries no rule-bearing values

- **app_location**: `/Users/simonmyhre/.../src/features/game/lib/enemies.ts` — `templateStats()`, `combatantBaseStats()`, `resetEnemyPatch()`; `/Users/simonmyhre/.../src/api/enemies.ts`; `/Users/simonmyhre/.../src/features/game/components/EnemyEditorDialog.tsx`
- **ui_or_logic_summary**: A DM-authored enemy is `{ name, initiative, ac, maxHp, note, revealHp, revealStats }`, with `resetEnemyPatch` restoring the snapshot and clearing `conditions`/`conditionSince`. `combatantBaseStats` floors `maxHp` at 1.
- **found_in_txt**: n/a — these are GM bookkeeping fields, not rules. The rulebook defers creature statistics to the Bestiary ([page 46]: "the current GM Bestiary supplies creature awards"), which is not among the four beta sources.
- **proposed_change**: keep. Nothing here contradicts the beta; do not attempt to derive enemy stats from the sources, which do not contain them.
- **stored_data_impact**: none.
