# A13 — Character Backgrounds & Origin Feats

Scope: `docs/rules/core-rulebook.txt` lines 4170–4820 (Character Backgrounds,
pages 93–95; Chapter 5 Feats, pages 96–106).

Overall: the background *roster* and the feat *roster* are both complete and
correctly named. All 14 backgrounds in the txt exist in `src/data/backgrounds.ts`
with matching ids, blurbs, ability triads, feats and skill pairs; no background
exists in code that the txt dropped. All 54 feats in `src/data/feats.generated.json`
(7 Origin, 29 General, 9 Fighting Style, 9 Epic Boon) match the txt name-for-name
with no extras and no omissions. The actionable findings are four background data
errors, two truncated feat prerequisites, and the provenance problem with
`feats.generated.json`.

---

### Noble starting coin is 30 GP in code, 50 GP in the source

- **txt_section**: core-rulebook.txt [page 95] line 4263, "Background Overview Part 2" — `Noble … 50 GP`
- **rule_summary**: Noble grants no Origin feat, no tool proficiency, skills Old World History and Persuasion, and **50 GP** of equipment.
- **code_location**: `src/data/backgrounds.ts` → `BACKGROUNDS`, `id: "noble"`, `equipment: ["30 GP"]`
- **verdict**: mismatch
- **proposed_change**: Change `equipment: ["30 GP"]` to `equipment: ["50 GP"]`. `src/lib/startingEquipment.ts` `parse()` already handles the `^(\d+)\s*GP$` form, so the extra 20 gp flows into `startingKit().coins` with no other edit.
- **stored_data_impact**: Existing `/characters/{id}` records for Noble hunters were seeded with 20 gp too little. Coins are a mutable, player-spent field — do **not** auto-backfill (it would silently reverse spending). Only newly created Noble hunters get the corrected amount.

### Cultist tool proficiency is "Mason's Tools" in code, "Cultist Tools" in the source

- **txt_section**: core-rulebook.txt [page 95] line 4269 — `Cultist … Listener … Eldritch Knowledge and Insight … Cultist Tools … Dagger`
- **rule_summary**: The Cultist background grants proficiency with **Cultist Tools**, not mason's tools.
- **code_location**: `src/data/backgrounds.ts` → `id: "cultist"`, `tool: "Mason's Tools"`
- **verdict**: mismatch
- **proposed_change**: Set `tool: "Cultist's Tools"`. That exact string already exists in `src/data/characterOptions.ts` `TOOL_PROFICIENCIES` with a `TOOL_DETAILS` entry, so the sheet's `tools` field (`characterAutomation.ts` line 222) renders it without further change.
- **stored_data_impact**: The tool string is derived from the background at render time, not stored on the card, so no `/characters` field changes. Any hunter whose sheet was printed earlier shows the wrong tool; recomputation on next load fixes it. Note: if `Mason's Tools` is no longer granted by any background or class, it becomes reachable only via the Skilled feat's free choice — leave the `TOOL_PROFICIENCIES` entry in place.

### Weaponsmith tool proficiency is "Tinker's Tools" in code, "Smiths Tools" in the source

- **txt_section**: core-rulebook.txt [page 95] lines 4276–4277 — `Weaponsmith … Persuasion and Sleight of Hand … Smiths Tools`
- **rule_summary**: Weaponsmith grants no feat, no equipment, and proficiency with **Smith's Tools**.
- **code_location**: `src/data/backgrounds.ts` → `id: "weaponsmith"`, `tool: "Tinker's Tools"`
- **verdict**: mismatch
- **proposed_change**: Set `tool: "Smith's Tools"` (already present in `TOOL_PROFICIENCIES` / `TOOL_DETAILS`).
- **stored_data_impact**: None stored; derived at render.

### Church Missionary grants an extra "Brewer's Supplies" the source does not list

- **txt_section**: core-rulebook.txt [page 95] lines 4267–4268 — `Church Missionary … Religion and Presence … Poisoner's Kit … Antitoxin`
- **rule_summary**: The equipment column lists **Antitoxin only**. The tool proficiency is Poisoner's Kit; brewer's supplies appear nowhere in the background tables.
- **code_location**: `src/data/backgrounds.ts` → `id: "church-missionary"`, `equipment: ["Brewer's Supplies", "Antitoxin"]`
- **verdict**: mismatch (extra content, no longer a rule)
- **proposed_change**: `equipment: ["Antitoxin"]`. Secondary benefit: "Brewer's Supplies" has no entry in `src/data/items.ts`, so today it falls into `startingKit().unmatched` — removing it clears a silent starting-kit failure.
- **stored_data_impact**: Existing Church Missionary hunters may hold a `brewers-supplies` inventory entry — except they cannot, since the name never resolved to a catalog id, so nothing was ever added. No inventory migration needed.

### Heavily Armored prerequisite is missing "Strength 13+"

- **txt_section**: core-rulebook.txt [page 99] lines 4441–4443 — `HEAVILY ARMORED — General Feat (Prerequisite: Level 4+, Medium Armor Training, Strength 13+)`
- **rule_summary**: Three prerequisites: level 4+, Medium Armor Training, and Strength 13 or higher.
- **code_location**: `src/data/feats.generated.json` → `Heavily Armored`, `prerequisite: "Level 4+, Medium Armor Training"`
- **verdict**: mismatch
- **proposed_change**: Set `prerequisite` to `"Level 4+, Medium Armor Training, Strength 13+"`. The string is display-only (`CharacterSheetUpgradeFeatPage.tsx` renders it beside the category; nothing parses it to gate selection), so this is a one-line data fix with no logic change.
- **stored_data_impact**: none

### Moderately Armored prerequisite is missing "Strength or Dexterity 13+"

- **txt_section**: core-rulebook.txt [page 100] lines 4510–4512 — `MODERATELY ARMORED — General Feat (Prerequisite: Level 4+, Light Armor Training, Strength or Dexterity 13+)`
- **rule_summary**: Three prerequisites, as above.
- **code_location**: `src/data/feats.generated.json` → `Moderately Armored`, `prerequisite: "Level 4+, Light Armor Training"`
- **verdict**: mismatch
- **proposed_change**: Set `prerequisite` to `"Level 4+, Light Armor Training, Strength or Dexterity 13+"`.
- **stored_data_impact**: none

### `feats.generated.json` is orphaned — no generator produces it any more

- **txt_section**: core-rulebook.txt [pages 96–106], Chapter 5 Feats (the only remaining authority for feat text)
- **rule_summary**: n/a — this is a provenance finding.
- **code_location**: `src/data/feats.generated.json` (54 records, last touched by commit `10e0cfe "Replace game sources and align the app"`), consumed by `src/data/feats.ts` (`FEATS`, `ORIGIN_FEATS`, `GENERAL_FEATS`, `FIGHTING_STYLE_FEATS`, `EPIC_BOON_FEATS`)
- **verdict**: mismatch (process, not content)
- **proposed_change**: The file's *content* is still substantively accurate — every name, category, ability-increase option set, point count and maximum I checked against pages 96–106 agrees with the txt, apart from the two truncated prerequisites above. But nothing regenerates it: `scripts/generate-codex-data.mjs` writes only `src/data/codex.generated.json` and reads `resources/master.json`, which no longer exists (`resources/` now contains only `README.md`), so `bun run codex:generate` fails outright. Recommended: **rename `feats.generated.json` to `feats.ts` data (or `feats.data.json`) and treat it as a hand-maintained catalog sourced from `docs/rules/core-rulebook.txt`**, dropping the misleading `.generated` name and the stale "generated from master.json" implication. Do not build a new feat generator against the txts — the two-column PDF-transcription layout (see the Cultist Slayer entry, whose Ability Score Increase clause continues at lines 4481–4485 on the *previous* page's right column) is not reliably parseable. Also update the comment in `src/data/characterOptions.ts` lines 3–4 and 37–38, which still cite `master.json` as the authoring source.
- **stored_data_impact**: none — this is a build/authoring concern. Cards store only feat *names* (`card.feats`, `state.levelFeats`), and every stored name remains valid under the new source.

### Confirmed match: Tough's HP formula, Alert's initiative bonus, Skilled's three proficiencies, Listener's whisper

- **txt_section**: core-rulebook.txt [page 97] lines 4380–4387 (TOUGH), [page 96] lines 4302–4314 (ALERT), lines 4351–4357 (SKILLED), lines 4332–4338 (LISTENER)
- **rule_summary**: Tough — HP max +2× character level on gain, +2 per level thereafter (i.e. `2 × level` at any level for a level-1 background grant). Alert — add Proficiency Bonus to Initiative. Skilled — proficiency in any combination of three skills **or tools**. Listener — learn one Whisper, Intelligence is the Rite Performing ability for it.
- **code_location**: `src/features/hunter/lib/characterAutomation.ts` — `featNames.has("Tough") ? level * 2 : 0` (hp), `featNames.has("Alert") ? prof : 0` (initiative), `pending.featSkills` + line 222 splitting `card.featSkills` into skills vs. tools, `src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx:187` (`background?.feat === "Listener" ? 1 : 0` extra whisper)
- **verdict**: match
- **proposed_change**: none — flagged because the Skilled "skills **or** tools" split and the Listener whisper grant are non-obvious and correctly implemented; do not "simplify" them during the sync.
- **stored_data_impact**: none

### Confirmed match: background ability-score step (+2/+1 or +1/+1/+1, cap 20)

- **txt_section**: core-rulebook.txt [page 93] lines 4184–4188, "PARTS OF A BACKGROUND — Ability Scores"
- **rule_summary**: A background lists three abilities. Increase one by 2 and another by 1, **or** all three by 1. No increase may raise a score above 20.
- **code_location**: `src/features/hunter/components/character-sheet/CharacterSheetGuidedChoices.tsx` → `CharacterSheetBackgroundAbilities` (3-point budget, per-ability 0/+1/+2 buttons, `base[key] + value > maximum` guard using `finalCreationMaximum(mode)` from `src/features/hunter/lib/abilityBuy.ts`)
- **verdict**: match
- **proposed_change**: none. Note `finalCreationMaximum` returns 20 for standard buy and a lower Maduhausu cap — that is a deliberate house-rule mode, not a contradiction of the 20 ceiling.
- **stored_data_impact**: none

### Confirmed match: full background and feat rosters, with no removal candidates

- **txt_section**: core-rulebook.txt [pages 94–95] Background Overview Parts 1 & 2; [pages 96–106] Chapter 5
- **rule_summary**: 14 backgrounds (Criminal, Merchant, Noble, Drifter, Church Missionary, Cultist, Street Warden, Grave Tender, Weaponsmith, Archivist, Beggar, Oiler, Graverobber, Blood Collector). 7 Origin feats (Alert, Lucky, Listener, Savage Attacker, Skilled, Tavern Brawler, Tough).
- **code_location**: `src/data/backgrounds.ts`, `src/data/feats.generated.json`
- **verdict**: match
- **proposed_change**: none. Explicitly: **there is no background and no feat in the code that the new txt has dropped**, and none in the txt that the code lacks. All background skill pairs resolve against `src/data/skills.ts` (including the campaign-specific Grit, Presence, Blood Nature, Eldritch Knowledge, Old World History), and all named equipment items (Crowbar, Chain, Manacles, Lamp, Shovel, Antitoxin, Oil, Rope, Dagger, Thieves' Tools, Blood-drainer's Tools) resolve to `src/data/items.ts` ids — the only unresolvable entry was the spurious Brewer's Supplies above.
- **stored_data_impact**: none — every stored `backgroundId` remains valid.
