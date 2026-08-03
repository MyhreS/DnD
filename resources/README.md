# `resources/` — Catacombs & Starspawns source material

> **This folder is the source of truth for the game's content.** It holds the DM's
> original books (PDF), the tabular exports (CSV), the machine-readable
> derivations the app is generated from, a single consolidated **`master.json`**,
> and an **`images/`** library of art/figures extracted from the books.
>
> The app's UI is data-driven from `src/data/` (generated — see
> [`extracted/gen.py`](extracted/gen.py)); these files are where that content
> originates. When the DM ships new material, it lands here first.

## TL;DR — where to look

| You want… | Go to |
|---|---|
| **Everything, structured & searchable** (all rules, classes, rites, sheets, glossary) | [`master.json`](master.json) |
| The **original documents** (authoritative) | [`pdf/`](pdf/) |
| **Art & figures** (emblem, class splashes, armor, weapons, creatures, sheets) | [`images/`](images/) |
| The **tables that feed the app** | [`csv/`](csv/), [`extracted/`](extracted/) |
| How the app's `classes.ts`/`rites.ts` are generated | [`extracted/gen.py`](extracted/gen.py) |

## Layout

```
resources/
  README.md                 ← you are here
  master.json               consolidated, structured extraction of ALL content (see below)
  class-descriptions.txt     DM's official one-paragraph class blurbs (feeds gen.py)
  pdf/                       ORIGINAL documents — the source of truth
    handbook/                the core Player's Handbook
    classes/                 per-class boards + the combined classes board
    rites/                   the Deepcaller's Rites, by school
    appendices/              Book of the Deepcaller, Whispers, Rules Glossary scan
    character-sheets/        printable + sim character sheets
  csv/                       tabular exports (feed gen.py)
    Character Sheet For Sim/
    Classes Boards for send/ ← per-class Core Traits + Features tables
  extracted/                 machine-readable derivations
    text/                    pdftotext mirror of each PDF (grep-friendly)
    content.json             structured classes + rites that gen.py consumes
    gen.py                   regenerates src/data/classes.ts + rites.ts
  images/                    art/figures pulled out of the PDFs (see "Image library")
    branding/ covers/ classes/ armor/ items-weapons/ creatures/ scenes/ character-sheets/
```

**Source vs derived.** `pdf/`, `csv/`, and `class-descriptions.txt` are the
**authoritative source**. `extracted/` and `master.json` are **derived** from
them (re-generatable); `images/` are extracted *from* the PDFs. If something
disagrees, the PDFs win — and see **Known source conflicts** below.

---

## `master.json` — the consolidated content

One file containing **all** game content, structured for search/reading. Rules
text is **verbatim** (OCR ligature artifacts repaired, e.g. `pro ciency`→
`proficiency`); only `description` fields summarize. Built by per-source
extraction passes and **adversarially verified** against the sources.

Top-level keys:

| Key | What's in it |
|---|---|
| `meta` | title, description, the list of every source file |
| `index` | one row per source section (title + 1-line description + sourceFiles) — the table of contents |
| `sourceConflicts` | curated reconciliation of places where the sources disagree (Sanity dice, Stalker hit die, Bloodbound saves, starting equipment) — **read this before trusting a single number** |
| `handbook` | the Player's Handbook: 5 chapters (creation, classes overview, backgrounds, feats, equipment) + 17 tables, verbatim |
| `classes` | the 6 Hunter classes: overview, Core Traits, full 1–20 progression, every feature (full text), subclasses |
| `rites` | `bySchool` (27 rites across 7 schools), `bookOfDeepcaller` (21 leveled rites), `whispers` (6 cantrip-like rites) |
| `characterSheets` | the R1.0 sheets (per-page fields + numbered creation-step mapping) and the sim sheet legend |
| `rulesReference` | the 18-page Rules Glossary (Appendix C), 188 entries + 14 tables, verbatim |
| `images` | index of the `images/` library (path, category, source page, description) |

---

## `pdf/` — original documents (authoritative)

**`handbook/`**
- `CATACOMBS & STARSPAWNS Players Handbook.pdf` — the core 94-page Player's
  Handbook: character creation, the two-part Class Overview, backgrounds, feats,
  the full armory/equipment, Sanity/Madness & rest rules, and all the art.

**`classes/`** — standalone per-class "boards": Core Traits + the full 1–20
Features table + subclasses, one PDF each.
- `Brute.pdf`, `Scout.pdf`, `Staker.pdf` *(note: file is misspelled — this is the
  **Stalker**)*, `Deepcaller.pdf`, `Bloodbound.pdf`, `Warden.pdf`
- `Classes Boards for send.pdf` — the combined traits/features boards for all six.

**`rites/`** — the Deepcaller's Rites, grouped by school: `Detection`, `Evocation`,
`Illusion`, `Mind Influence`, `Protection`, `Summoning`, `Traversal` (`* Rite.pdf`).

**`appendices/`**
- `V1.0 Book of The Deepcaller.pdf` — Appendix B: the Deepcaller's leveled Rites (1–9).
- `V1.0 Whispers.pdf` — Appendix C: "Hushed Whispers", the cantrip-like lesser Rites.
- `Rules Reference Scan.pdf` — an 18-page **scanned** generic (5e-style) "Rules
  Glossary" the DM included as reference. *Image-only — no text layer* (transcribed
  into `master.json` from page images).

**`character-sheets/`**
- `R1.0 Character Sheet.pdf` — the hand-drawn 5-page printable sheet.
- `R1.0 Numbered Character Sheet.pdf` — same, with red 1–5 marks mapping fields to
  the creation steps.
- `Character Sheet For Sim.pdf` — typeset legend describing every region of the sheet.

## `csv/` — tabular source (feeds `gen.py`)

- **`Classes Boards for send/`** — per class, a `Core … Traits.csv` and a
  `… Features.csv` (the 1–20 level table). **`gen.py` reads the Features CSVs.**
- **`Character Sheet For Sim/`** — `Ability and Skills.csv` and
  `On the Character Sheet.csv` (the sim sheet's reference tables).

## `extracted/` — machine-readable derivations

- **`text/`** — a `pdftotext` mirror of each PDF (handy for grep/diff). The
  handbook mirror is the **full** re-extraction (≈2873 lines).
- **`content.json`** — structured `classes` + `rites` that `gen.py` consumes.
- **`gen.py`** — regenerates `src/data/classes.ts` + `src/data/rites.ts` from
  `content.json`, the Features CSVs, and `class-descriptions.txt`. After a content
  refresh: re-run `pdftotext`, update `content.json`, then
  `python3 resources/extracted/gen.py`.

## `class-descriptions.txt`

The DM's official one-paragraph blurb for each class. Used verbatim as the class
"blurb" in the generated `classes.ts`.

---

## Image library (`images/`)

Art and figures pulled out of the source PDFs (almost all from the Player's
Handbook) so the styles are visible and assets can be reused in the app. Two
kinds: **clean-extract** = the embedded painting on its own (often transparent
background, no page text); **page-render** = a full page captured because its
labels/multiple figures matter. The `class-art` splashes include their styled
title banner (baked into the source painting).

**`branding/`**
- `blood-drop-emblem.png` — the C&S crest (red blood-drop + black star, gold-ringed
  black roundel) on a **transparent** background. The app icon / brand mark.
- `class-emblems-overview.png` — the six class emblems with names & taglines (Ch. 2 opener).

**`covers/`**
- `front-cover.png` — front-cover splash (hunters vs. a towering eldritch entity).
- `good-hunting-splash-art.png` — "Good Hunting" closing splash.
- `back-cover.png` — back-cover splash.

**`classes/`** — full splash art per class/subclass:
- `hunter-brute-splash.png`, `hunter-scout-class-art.png`, `hunter-stalker-class-art.png`,
  `stalker-shadow-class-art.png` (Shadow subclass), `hunter-deepcaller-splash.png`,
  `zealot-deepcaller-splash.png` (Zealot prestige), `hunter-bloodbound-class-art.png`,
  `hunter-warden-class-art.png`, `hunter-figure-and-flintlock.png` (hunter + flintlock).

**`armor/`** — labeled armor visualizations:
- `leather-armor-visualization.png` — 7 leather pieces (vest/jacket/coat + reinforced + jerkin).
- `armor-leather-body-set.png` — cuirass, pauldrons, vambraces, studs detail.
- `armor-headgear-scarves-set.png` — tricorn, cavalier hat, cowl, wide-brim hat, scarves.

**`items-weapons/`**
- `simple-weapons-illustrations.png`, `martial-weapons-plate.png` — labeled weapon plates.
- `blood-vial-and-bullets.png`, `bloodvial-item-art.png` — Bloodvials.
- `silver-bullet-item-art.png`, `glowing-eldritch-amulet.png`,
  `deepcaller-book-and-robe-art.png` (Book of the Deepcaller + Robe).

**`creatures/`**
- `hound-of-tindalos-creature-art.png` — the Hound of Tindalos (Beast Caller).

**`scenes/`**
- `gothic-city-splash.png` — gothic cathedral-city skyline.

**`character-sheets/`**
- `r1.0-sheet-page01…05.png` — the hand-drawn R1.0 character sheet (5 pages).
- `r1.0-numbered-sheet-page01…05.png` — the numbered companion (creation-step labels).

> The full machine-readable index (with source page + extract kind for each asset)
> is in `master.json` → `images`.

---

## Known source conflicts

The DM's materials disagree in a few spots; `master.json` → `sourceConflicts`
records each. **Confirm with the DM before treating any of these as final:**

- **Sanity (Max Sanity / Sanity Die)** — the Player's Handbook Ch. 2 Core Traits
  (e.g. Stalker 12/1d12, Deepcaller 16/1d20, Bloodbound 20/1d20, Warden 14/4d4)
  differ from the standalone class boards (single dice D10/D12/D20) and from the
  app's current `classes.ts`.
- **Stalker Hit Die** — boards say D10; the Class Overview says D8 (app uses D8, 5e Rogue basis).
- **Bloodbound saving throws** — board says INT/WIS; the Class Overview says STR/CON (app uses STR/CON).
- **Starting equipment** — the handbook's Class Overview defers to "see chapter 2";
  exact counts (blood vials, bullets, traps) differ between sources.

## Regenerating

- **App content** (`src/data/classes.ts`, `rites.ts`): `python3 resources/extracted/gen.py`.
- **`master.json` + `images/`**: produced by a one-time extraction pass over the
  sources (per-source structured extraction, image-PDF transcription from page
  renders, and embedded-image extraction). Re-run that pass if the source PDFs change.
