# `resources/` — no longer the source folder

The game-maker document set was replaced with the **beta release**. The old
PDFs and `master.json` that lived here are deleted and must not be restored.

The current sources are the verbatim plain-text transcriptions in
[`../docs/rules/`](../docs/rules/): `core-rulebook.txt`,
`book-of-the-deepcaller.txt`, `character-sheet.txt`, `whispers-sheet.txt`, and
the **GM-only** `hidden-condition-sheet.txt`. Read those to answer any rules or
game-logic question.

`hidden-condition-sheet.txt` is GM-only: its content must never reach public app
UI, public API responses, the Codex, or build output. This repo and Firebase
Hosting bundles are public.

The old `bun run codex:generate` pipeline (SHA-256 verification of four PDFs,
the ignored `public/source-library/` downloads, `src/data/codex.generated.json`)
no longer runs — it reads files that no longer exist. See CLAUDE.md,
"Updating game content", for the accurate current state.

Replacing source documents is not permission to redesign or remove existing app
pages, Hunter creation, saved-character support, or table workflows. Those
product features remain until the game maker explicitly changes them.
