# `resources/` — current Catacombs & Starspawns sources

This folder contains the complete, current game-maker-maintained source set.
The four PDFs in [`pdf/`](pdf/) replace every older handbook, class board,
rite sheet, game card, rules scan, character sheet, image extraction, and CSV.

There are deliberately no historical copies here. If a rule, catalog, stat
block, table, or option is absent from the four current documents, the app must
not recover it from an older file or invent a replacement.

## Canonical files

| File | Contents |
|---|---|
| `pdf/C&S Book of the Deepcaller.pdf` | 21 leveled Rites |
| `pdf/C&S Character Sheet.pdf` | The six-section printable character sheet |
| `pdf/C&S Hidden Condition Sheet.pdf` | Blank Hidden Condition handout |
| `pdf/C&S Whispers Sheet.pdf` | 6 Whispers |
| `master.json` | Structured, searchable extraction and source-boundary metadata |

The Hidden Condition PDF is a web-usable conversion of the supplied Apple
Pages file. It preserves the original full-resolution page and is the only copy
kept in the repository.

## Regenerating app data

Run `bun run codex:generate`. The generator validates that `master.json`
references exactly these four PDFs, verifies their SHA-256 hashes, clears the
ignored `public/source-library/` output, copies one download per source, and
rebuilds `src/data/codex.generated.json`.

Do not edit generated Codex data or `public/source-library/` by hand.
