# Shared brief for reconciliation analysis agents

## Context

Repo: Catacombs & Starspawns companion app (React 19 + TS + Vite + Firebase PWA).
Worktree: `/Users/simonmyhre/workdir/gitdir/DnD/.claude/worktrees/cs-beta-release-integration-be1e76`
READ `CLAUDE.md` at repo root first — it defines architecture rules.

The game's source documents were just replaced with a new **beta** release.
The old PDFs and `resources/master.json` are DELETED. The authoritative rules
are now the verbatim transcriptions in `docs/rules/`:

- `core-rulebook.txt` (126 pages, page boundaries marked `[page N]`)
- `book-of-the-deepcaller.txt` (Rites)
- `character-sheet.txt` (the printable sheet's fields/layout)
- `whispers-sheet.txt` (6 Whisper rites)
- `hidden-condition-sheet.txt` (**GM-ONLY** — its content must NEVER reach
  public app UI, API, Codex, or build output)

## Goal

A genuine TWO-WAY reconciliation between the txts and the app's code/UI:

- Code/UI that **contradicts** the new txts, or whose underlying concept no
  longer appears **anywhere** in the new txts → REMOVE or correct. Removing
  whole sections/drawers/fields/content is expected and wanted.
- Content the txts introduce that the app lacks → ADD, fitting existing
  component structure and visual language.
- Already correct and still present → LEAVE UNTOUCHED.

## Hard constraint: preserve the design

The user **loves** the existing visual design, page layouts and UX flows of the
Hunter builder and the canonical character sheet. This is a **content/logic**
sync, NOT a redesign. Do not propose restyling, re-layout, or new navigation.
Changes must fit the existing components and visual language.

## Where the app implements rules

- `src/features/hunter/**` — guided builder + canonical character sheet
  (`components/character-sheet/`, `components/appsheet/`, `components/papersheet/`,
  `lib/characterAutomation.ts`, `lib/abilityBuy.ts`, `lib/levelUpVitals.ts`,
  `lib/deriveSheetFromCard.ts`, `lib/insightAward.ts`, `lib/legacyMigration.ts`)
- `src/data/**` — catalogs: `classes.ts`, `abilities.ts`, `armor.ts`, `weapons.ts`,
  `items.ts`, `skills.ts`, `backgrounds.ts`, `feats.ts`, `conditions.ts`,
  `creatures.ts`, `characterOptions.ts`, `storage.ts`, `codex.ts`
- `src/lib/**` — `character.ts` (calc), `slots.ts`, `inventory.ts`, `insight.ts`,
  `startingEquipment.ts`, `ability-keys.ts`
- `src/types.ts`, `src/config.ts`
- `src/features/play/**`, `src/features/game/**` — combat/session mechanics
- `src/features/codex/**` — the Codex feature

## Output format — REQUIRED

Write your findings to the file path given in your task prompt, as Markdown.
Do **not** edit any source code. Analysis only.

Use one `###` block per finding, in this shape:

```
### <short title>
- **txt_section**: <doc + page/line reference, e.g. core-rulebook.txt [page 41] "Hit Point Dice">
- **rule_summary**: <what the new source actually says, concretely — numbers, names, formulas>
- **code_location**: <absolute-ish repo path(s) + symbol, or ABSENT>
- **verdict**: match | mismatch | missing_in_code | no_longer_a_rule
- **proposed_change**: <concrete, minimal edit — or "none">
- **stored_data_impact**: <effect on Firestore `/characters/{id}` HunterCard records:
  fields to strip, values to remap, fields to backfill, derived values to recompute —
  or "none">
```

Only report findings that are actionable or that confirm a non-obvious match.
Do not pad with trivia. Be concrete: quote numbers and names from the txt.
Verify claims against the ACTUAL code — read the files, don't guess.
