# Scope notes (working doc — delete before PR)

## Corrected source facts

The page counts in the original brief were wrong. Verified via `pdfinfo`:

| Document | Briefed | Actual |
|---|---|---|
| C&S Core Rulebook Beta V3.0 | 939 | **126** |
| C&S Book of the Deepcaller | 116 | **13** |
| C&S Character Sheet | 11 | 11 |
| C&S Hidden Condition Sheet | 30 | verify with `pdfinfo` |
| C&S Whispers Sheet | — | 2 |

The Core Rulebook's 92MB comes from full-page artwork, not page count.

**Extraction method:** prefer `pdftotext -layout` per page where the PDF has an
embedded text layer — byte-faithful and preserves table columns. Fall back to
reading the page as an image only for pages with no text layer, and check
whether such pages are real rules content or just artwork (page 47 of the Core
Rulebook was image-set rules content and was easy to miss).

## Additional requirement: migrate existing characters

Added by Simon after the task started.

Existing hunters are stored in production Firestore at `/characters/{id}` as
`HunterCard` records. The beta rules change means some stored characters will
have fields that are now stale, invalid, or missing.

Required work, as part of the reconciliation plan:

1. For each rule change identified in Phase 4, determine the effect on **stored**
   character data — not just on the code that reads it. Categories to look for:
   - fields whose valid value set changed (e.g. a renamed/removed class, skill,
     rite, or ability)
   - fields that no longer exist in the new rules → strip
   - new required fields with no stored value → backfill with a sensible default
   - derived/計算 values that must be recomputed under new formulas
2. Write a migration script (Node/Bun, using the admin SDK) with a **mandatory
   `--dry-run` default**. Dry run must report, per character: uid, character
   name, and every field it would change (before → after). It must not write.
3. Take an export/backup of the `characters` collection before any real write.

**HARD STOP:** do NOT execute a live migration against production Firestore.
Produce the script, run the dry run, and report the results to Simon. He must
review the dry-run output and explicitly approve before any write happens.
This is irreversible user data.
