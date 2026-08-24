# `resources/` — current Catacombs & Starspawns sources

This folder contains the complete, current game-maker-maintained document set.
The four PDFs in [`pdf/`](pdf/) replace every older handbook, class board,
rite sheet, game card, rules scan, character-sheet document, image extraction,
and CSV kept as a game source.

There are deliberately no historical document copies here. When a current PDF
defines something already used by the app, its version wins and the older
version must not remain beside it. A missing topic must not be reconstructed
from a deleted document or presented as though it came from these four PDFs.

This source-library boundary is not permission to redesign or remove existing
app pages, Hunter creation, saved-character support, or table workflows. Those
product features remain until the game maker explicitly changes them.

## Canonical files

| File | Contents |
|---|---|
| `pdf/C&S Book of the Deepcaller.pdf` | 21 leveled Rites |
| `pdf/C&S Character Sheet.pdf` | The six-section printable character sheet |
| `pdf/C&S Hidden Condition Sheet.pdf` | Hidden Second Threshold, Old One Vessel, and Lost rules (GM-only) |
| `pdf/C&S Whispers Sheet.pdf` | 6 Whispers |
| `master.json` | Structured, searchable extraction and source-boundary metadata |

The Hidden Condition PDF is a searchable conversion of the supplied Apple
Pages file. It preserves the original full-resolution page and native text and
is the only copy kept in the repository. It is canonical source material, but
it is never copied into the public player source library or search index.

## Regenerating app data

Run `bun run codex:generate`. The generator validates that `master.json`
references exactly these four PDFs, verifies their SHA-256 hashes, clears the
ignored `public/source-library/` output, copies the three player downloads, and
rebuilds `src/data/codex.generated.json`. The hidden source remains excluded.

Do not edit generated Codex data or `public/source-library/` by hand.
