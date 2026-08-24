<div align="center">

# Catacombs & Starspawns

**A mobile-first companion for the tabletop game.**

[Open the app](https://dandd-ea955.web.app)

</div>

## What it does

The app keeps the game maker's current material, Hunters, and live table tools
in one place:

- **Hunters** use one autosaving manual editor matching the current six-section
  character sheet. The app records values; it does not invent class,
  background, equipment, progression, or derived-stat rules.
- **Games** provide session lobbies, invitations, shared notes, an enemy
  library, initiative and combat controls, recorded vitals, and session items.
- **Codex** searches the current Rites, Whispers, sheet fields, and source
  notes. Every result identifies and links to its source PDF.
- **Status** gives the table a large-screen view of recorded Hunter values and
  the current battle.

The Codex and its four current documents are public. Google sign-in is needed
to save Hunters or join games.

## Current source set

These four PDFs replace every earlier game document and derived catalog:

1. `C&S Book of the Deepcaller.pdf`
2. `C&S Character Sheet.pdf`
3. `C&S Hidden Condition Sheet.pdf`
4. `C&S Whispers Sheet.pdf`

Their canonical copies live in `resources/pdf/`; the structured record is
`resources/master.json`. A build fails if a source is missing, duplicated, or
does not match its recorded SHA-256 hash.

## Development

The stack is React 19, TypeScript, Vite, Bun, Zustand, and Firebase Auth,
Firestore, Functions, Storage, and Hosting. See [`CLAUDE.md`](./CLAUDE.md) for
the repository workflow, source-update contract, checks, and release process.
