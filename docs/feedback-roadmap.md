# Catacombs & Starspawns — DM Feedback, Structured

> Working document. This turns the game-maker's raw feedback into grounded
> workstreams, a shared architecture, a build order, and a list of decisions to
> make **before** we implement anything. Nothing here is built yet.
>
> Grounded against the real `src/`, `firestore.rules`, and the rulebook
> (`resources/pdf/CATACOMBS & STARSPAWNS Players Handbook.pdf`).

---

## 0. Two things to know first

**(a) The resources were just refreshed — the app's content is now stale.**
The owner dropped in `V1.0.1` handbook + new `Book of the Deepcaller`, `Whispers`,
`R1.0 Character Sheet`, `R1.0 Numbered Character Sheet`, and `Rules Reference Scan`
PDFs. Nothing downstream has been re-run. Concretely:
- The committed handbook text extraction is **truncated** (902 of ~2873 lines).
- `src/data/classes.ts` sanity values are **wrong** vs. the handbook (see §3b).
- The served `public/handbook/…pdf` is the **old** build (27 MB; V1.0.1 is ~90 MB).
- The new Deepcaller/Whispers/sheet/reference PDFs aren't in the app at all.

**(b) The rulebook gate the DM described is real — confirmed verbatim.**
> "When your Insight total equals or exceeds a number in the Insight column,
> **you reach the corresponding level only after a Long Rest**."

So leveling must be a *pending* state that applies on a Long Rest, never instantly.
Reading the rulebook for "these kinds of connections" surfaced more of them — they
all converge on **rest** (see §3c). That convergence is the backbone of the plan.

---

## 1. Feedback → workstream map

| # | Raw feedback | Workstream | Effort | Phase |
|---|---|---|---|---|
| 1 | (owner) resources refreshed → app needs refresh | **Content refresh** | L | 0 |
| 2 | Deepcaller book opens from inventory; Whispers PDF for everyone | **In-app documents** | M | 2 |
| 3 | Rules Reference page, powerful search | **Rules reference** | M | 2 |
| 4 | DM gives Insight/XP (DM-only); level-up only after a Long Rest | **Insight & leveling** | M | 1 |
| 5 | DM/players change madness & transformation level | **Transformation & madness** | M | 1 |
| 6 | DM sets stage: exploration/combat/rest/safezone | **Play stages** | S | 0 |
| — | (rulebook) safe-zone/lodge rest math, sanity-die, transform clear | **Rest mechanics** (glue) | S–M | 1 |
| 7 | Initiative order + conditions + HP visible to all | **Combat tracker** | XL | 3 |
| 8 | Fullscreen big-screen status board | **Status screen** | M | 2→3 |
| 9 | DM full admin on any character | **DM character admin** | M | 1 |
| 10 | Players manage own vitals/items (give, drop) | **Player self-manage** | M | 1 |
| 11 | DM can create characters | **DM creates characters** | M | 4 |
| 12 | Shop: gold, DM-priced items, gated selling | **Shop & economy** | L | 4 |
| 13 | Rebuild creation to new sheet + Ch.1; neat printable | **Creation redesign** | L | 2 |
| 14 | Use book artwork for fancier animated characters | **Artwork** | L | 5 |

"Login screen — fine" → no action.

---

## 2. Workstreams in detail

Each: **want / where we are / approach / key decisions.**

### 1. Content refresh *(foundational)*
- **Want:** the app's content matches the refreshed rulebook.
- **Where we are:** real pipeline exists — `resources/extracted/gen.py` reads
  `content.json` + CSVs + `class-descriptions.txt` and writes `src/data/classes.ts`
  + `rites.ts`. It hasn't been re-run; the handbook text dump is truncated; the
  served PDF and several data values are stale.
- **Approach:** re-`pdftotext` (reading-order, *not* `-layout`) the refreshed PDFs;
  reconcile `content.json`; **fix the sanity values at their real source — the
  `gen.py` META dict** (they're hardcoded there, not in the CSVs); regenerate;
  re-export an optimized handbook PDF into `public/`.
- **Key decisions:** see §5.1.

### 2. In-app documents (Deepcaller book + Whispers)
- **Want:** clicking the Deepcaller opens the *Book of the Deepcaller* **when it's in
  inventory**; everyone can open the *Whispers* PDF in-app; handbook is the fresh one.
- **Where we are:** only one PDF is served, and "open" today means *download/share*
  (`handbookPdf.ts`) — there is **no inline PDF viewer**. The Deepcaller/Whispers PDFs
  aren't in `public/`. No "Book of the Deepcaller" inventory item exists (closest is
  `book-of-eldritch-knowledge`). Starting equipment is **not** auto-seeded into
  inventory, so an inventory gate would hide the book from almost everyone today.
- **Approach:** add `WHISPERS_PDF_PATH` + `DEEPCALLER_BOOK_PDF_PATH`; generalize
  `downloadHandbookPdf` → `openDocument(path, name, title)`; a Whispers button on the
  Rites tab (everyone); an inventory-gated open affordance for the Deepcaller book.
- **Key decisions:** see §5.2.

### 3. Rules reference (searchable)
- **Want:** a Rules Reference page from the scan, with powerful search.
- **Where we are:** no search anywhere. **Important:** the "Rules Reference Scan" is an
  **image-only** scan of the standard **D&D 5e (2024) Rules Glossary** (pp.360–377) —
  `pdftotext` yields nothing, so search needs machine-readable text.
- **Approach:** build a typed `src/data/rulesReference.ts` (`RuleEntry[]`) and a new
  `/reference` page with instant client-side filtering. Recommended text source: the
  free CC-BY 5e-2024 SRD glossary (license-clean), optionally cross-checked by OCR.
- **Key decisions:** see §5.3.

### 4. Insight & long-rest-gated leveling
- **Want:** DM awards Insight freely to any hunter (DM-only; players can't self-award);
  Insight earns levels; crossing a threshold only levels up **after a Long Rest**.
- **Where we are:** no Insight/XP concept; `level` is a manual 1–20 number the owner
  bumps in the builder. "Insight" exists only as a WIS *skill* name.
- **Approach:** add `insight: number` to `HunterCard`; add `INSIGHT_THRESHOLDS` +
  `levelForInsight()` to `lib/character.ts`; *earned level* = `levelForInsight(insight)`,
  a level-up is **pending** when earned > applied; keep `level` authoritative until a
  Long Rest applies it (see §3c). DM award control on the `DMCharacters` board.
  Thresholds (L1→20): `0,6,15,30,50,75,105,140,180,225,275,330,390,455,525,600,680,765,855,950`.
- **Key decisions:** see §5.6.

### 5. Transformation level & madness
- **Want:** Transformation Level and Madness as tracked, editable stats (player + DM).
- **Where we are:** `sanity` IS the madness pool (Madness = `maxSanity − sanity`), but
  it's never shown as a number. **No `transformationLevel` field at all.** Class sanity
  data is wrong (§3b). `sanityDie` is a `number` and can't express `2d6`/`4d4`.
- **Approach:** add `transformationLevel?: number` (default 0); show **Madness** as a
  derived read-out over `sanity` (no second stored field → no drift bug); fix the six
  class values + the Deepcaller maxSanity cap (20→**26**); rest auto-adjusts transform
  (short −1, long clears). The d20 **Transformation Table is not printed** → DM content
  gap; ship the tracker, leave the table as DM-authored data.
- **Key decisions:** see §5.4.

### 6. Play stages (exploration / combat / rest / safe zone)
- **Want:** the DM sets the current stage *and* whether the party is in a safe zone.
- **Where we are:** one `GamePhase = exploration|combat|short_rest|long_rest` on the
  game doc, set by `PhaseControl`. **No safe-zone/location concept.** Rest math is
  location-blind (and rulebook-inaccurate).
- **Approach:** treat as **two orthogonal axes** — keep `phase` ("what we're doing"),
  add a `location: 'lodge' | 'safe' | 'wild'` ("where we are") with its own
  `LocationControl`. Three states because Lodge (full long rest) ≠ Safe (hit-dice on a
  short rest; half long rest) ≠ Wild. This flag is the *input* to rest mechanics (§3c).
- **Key decisions:** see §5.5.

### — Rest mechanics *(the glue three themes defer to)*
- **Want (rulebook):** rests behave correctly — this is where Insight, Transformation,
  Sanity, and HP all reconcile. The critic flagged that themes 4/5/6 each *mention* this
  but none *owns* it. **It needs to be built once.**
- **The single Long-Rest reconciliation** (one helper, in `RestPanel`):
  1. **HP** — full in the Lodge, else half max (today: always full — wrong).
  2. **Sanity Die** — regain `sanityDie + WIS mod`.
  3. **Transformation** — clear to 0.
  4. **Pending level-up** — `level = levelForInsight(insight)`; Deepcaller also −2
     Madness × levels gained and +1 Max Sanity/level (cap 26).
  Short rest: hit-dice only in a Safe Zone; `transformationLevel -= 1`.
- **Watch:** the `CharacterTrackers` "Long rest" button is a *second* rest mechanism
  (HP-only today). Route it through the same helper or remove it, or things desync.

### 7. Combat tracker *(the tentpole)*
- **Want:** replace the DM's whiteboard — live initiative order, per-combatant HP (with
  monster damage taken), conditions on everyone incl. the DM's monsters, and a clear
  "whose turn" pointer, visible to all so players can plan.
- **Where we are:** **none of this exists.** "combat" is a red UI tint. Games have only
  player participants (no HP/conditions/initiative/monsters). The live-sync pattern
  (`subscribe* → store → useSync`) is established and reusable.
- **Approach:** an **encounter** doc + a `combatants` subcollection under the game
  (PCs + DM-added monsters), each with initiative, HP, `conditions[]`; an
  `activeIndex`/`round` pointer. PC combatants reference `characterId` and **read HP
  live from the HunterCard** (one source of truth); monsters self-contain HP. Static
  `src/data/conditions.ts` (5e set). New `firestore.rules` blocks (→ run `bun run smoke`).
- **Key decisions:** see §5.8.

### 8. Status / spectator screen
- **Want:** a fullscreen big-screen board anyone can open so the room sees combat status.
- **Where we are:** nothing (only the cosmetic 3D fighters overlay). No Fullscreen/Wake-Lock
  usage anywhere.
- **Approach:** a chrome-less `/status` route that's a **read-only projection** (never
  writes). **Ships in two stages:** (a) a **vitals-only v1** (HP/Sanity/phase/next-session
  countdown) that's independently useful and de-risks the layout + Fullscreen + Wake-Lock
  work; (b) the full combat board once the combat tracker exists (it reads that doc).
- **Key decisions:** see §5.8 (shared with combat).

### 9. DM full character admin
- **Want:** one board where the DM changes anything on any player's hunter (HP, sanity/
  madness, transformation, blood tinge, level, coins, give/take/drop items).
- **Where we are:** `DMCharacters` is narrow (HP/level/items read-only + death).
  **Correction to an early assumption:** `firestore.rules` *already* lets the campaign DM
  write any field of a character in their campaign — so this is a **UI/store gap, not a
  rules gap.** Must NOT reuse the owner's `playerStore.save` (it would corrupt the DM's
  own selected card) — route through `patchCharacter` via a new `charactersStore.dmPatch`.
- **Key decisions:** see §5.7.

### 10. Player self-management
- **Want:** players adjust own HP (up/down), sanity, transformation; give away / drop items.
- **Where we are:** **mostly already built** — owners edit HP & Sanity with +/- today;
  inventory edits + coins work. *Gaps:* no transformation tracker; "give" exists only as a
  two-sided trade; "drop" just deletes the item (no claimable pile).
- **Approach:** add the transformation tracker (shared with theme 5); decide give/drop
  semantics. Prefer routing item transfers through the trade Cloud Function (server-
  authoritative) to avoid dupe/loss races.
- **Key decisions:** see §5.4.

### 11. DM creates characters
- **Want:** the DM can author hunter sheets.
- **Where we are:** creation is self-service/self-owned; `firestore.rules` create requires
  `ownerUid == auth.uid` — the **one real rules relaxation** in the whole plan.
- **Approach:** reuse the builder from a DM entry point, set `ownerUid` to the target
  player (so they keep control); relax create to allow a campaign DM to author for a
  member (campaign-scoped, negative-tested, `bun run smoke`). NPC/monster authoring is a
  scope fork that overlaps the combat tracker's "monsters" — coordinate or pick one.
- **Key decisions:** see §5.7.

### 12. Shop & economy
- **Want:** a DM-run shop; players spend gold; **selling is gated — the DM must set a price
  before an item can be listed.**
- **Where we are:** no shop. `Item` has no price. Economy primitives exist (`coins`,
  `inventory`, trades settled by a Cloud Function). **Gotcha:** that trade CF is keyed on a
  **stale `/players/{uid}`** collection — a shop CF must key on `/characters/{id}`.
- **Approach:** per-campaign `/shopListings` (DM-priced) + `/sellRequests` (a status
  machine: `requested → priced → approved`, with the "no price → not listed" gate enforced
  in **rules**, not just UI). Buys can be a client-side transaction (buyer mutates own card);
  add a `settleBuy` CF only if you need limited stock / anti-tamper.
- **Key decisions:** see §5.9.

### 13. Character creation redesign + printable
- **Want:** rebuild creation to follow the new sheet + Chapter 1's five steps; mirror the
  sheet's placement on-screen; a neater printable filled with the player's entries; the
  numbered sheet's guide-numbers match the steps.
- **Where we are:** a 6-step wizard that doesn't map 1:1 to the manual's 5 steps.
  `background` is a free string granting nothing. **Missing vs. the new sheet:** structured
  Background (feat + 2 skills + 1 tool), Feats, Transformation/Insight fields, equipment/
  weapon tables, step-number alignment. The printable is a bespoke jsPDF layout, not the
  R1.0 sheet.
- **Approach:** re-number steps to the manual's 1–5; make Background structured (new
  `src/data/backgrounds.ts`); add the missing fields; mirror the R1.0 zones on-screen;
  produce the neat printable (recommend print-only HTML/CSS over redrawing in jsPDF).
- **Content blockers:** Chapter-3 Backgrounds aren't in `resources/` yet; Feats are
  external 5e PHB content. Both are decisions, not just code.
- **Key decisions:** see §5.10.

### 14. Artwork (fancier animated characters)
- **Want:** use the books' artwork to make the animated characters fancier.
- **Where we are:** two systems, neither using book art — the 3D fighter shows (generic
  KayKit models) and the 2D class sigils (game-icons silhouettes). Book art is **embedded
  in the PDFs**; there is no image-extraction pipeline.
- **Approach:** a one-time image-extraction step (`pdfimages`/`mutool`) → cropped/downscaled
  WebP under `public/art/`. **Option A (recommended, cheap):** real book art on the 2D class
  sigils (visible on every hunter card). **Option B:** textured backdrops/portraits behind
  the 3D fighters (the rigs can't be "reskinned" with a 2D painting). Option C (new rigged
  models) is out of scope.
- **Key decisions:** see §5.11.

---

## 3. Shared foundations (build once, not per-theme)

This is the spine. Several themes pile onto the same files; if each invents its own
version they'll clobber each other.

### 3a. Consolidated `HunterCard` field block (add together, all optional)
| Field | Type | Themes | Notes |
|---|---|---|---|
| `insight?` | `number` | 4 | DM-awarded XP, default 0 |
| `transformationLevel?` | `number` | 5, 6, 9, 10 | default 0, floor 0 |
| `conditions?` | `string[]` | 7 | **decision:** on card vs. on combatant (§5.8) |
| `createdByUid?` | `string` | 11 | DM authorship marker |
| `kind?` | `'pc' \| 'npc'` | 11 | only if NPC sheets are in scope |
| *pendingLevel* | — | 4 | **don't persist** — derive via `levelForInsight()` |

### 3b. The one breaking type change: `HunterClass.sanityDie`
`number` → dice-string (`"2d6"`, `"1d12"`, `"4d4"`). It's emitted by `gen.py` and read in
3 places (hunter sheet, handbook class view, character PDF). **Land it once in the content
refresh** so the corrected data has somewhere to live. Corrected values:

| Class | now (maxSanity/die) | correct |
|---|---|---|
| Brute | 12 / d12 | 12 / **2d6** |
| Scout | 12 / d12 | 12 / **2d6** |
| Stalker | 10 / d10 | **12** / **1d12** |
| Deepcaller | 20 / d20 | **16** / **1d20** |
| Bloodbound | 18 / d12 | **20** / **1d20** |
| Warden | 15 / d12 | **14** / **4d4** |

Also fix `maxSanity()` in `lib/character.ts`: the Deepcaller per-level bump is capped at 20,
should be **26**.

### 3c. The Long-Rest reconciliation — one function
Already detailed under "Rest mechanics" above. The key architectural point: themes 4, 5, 6
and the rest button all touch the long-rest moment — centralize it in one
`applyLongRest(card, location)` helper consumed by `RestPanel`, or they desync.

### 3d. The DM write path — one store action
Themes 4, 9, 11 all need the DM to write *another user's* card. All go through
`patchCharacter(id, partial)` via a new `charactersStore.dmPatch(...)`. **Never** reuse the
owner-centric `playerStore.save`/`CharacterTrackers`/`InventoryPanel` write path for DM edits
(it corrupts the DM's own state). Give `InventoryPanel`/`CharacterTrackers` a pluggable
`onPatch` prop so both flows drive the same UI. Scope the DM board to the active campaign.

### 3e. The live-game substrate (themes 6, 7, 8 share it)
- Two axes on the game doc: `phase` (exists) + `location` (new).
- One encounter doc + `combatants` subcollection per game (built by combat, **read** by the
  status screen — the status screen owns no data).
- PC HP reads live from the HunterCard everywhere (combat tracker, DM board, player trackers,
  status screen) → never two sources of truth.
- Use field-level writes on contended live docs, not whole-doc overwrites.

### 3f. `firestore.rules` changes (each followed by `bun run smoke`)
1. **DM full admin (9) + Insight award (4):** *no rules change needed* — campaign-DM writes
   are already permitted. Optional: a field allowlist to protect `ownerUid`/`abilities`.
2. **DM creates characters (11):** the **one real relaxation** — allow create when the writer
   is the campaign DM (campaign-scoped). Security-sensitive; negative-test it.
3. **Insight self-award lock (4):** to truly stop players awarding themselves, forbid the
   owner changing `insight` unless they're the DM. (Else `saveCharacter`'s whole-doc write
   lets a player forge it — see §6.)
4. **New live collections (7, 12):** member-read / DM-write blocks for combatants, shop
   listings, and sell-requests (the sell gate must live in rules).

### 3g. Content & asset pipeline (themes 1, 2, 3, 14 share it)
- Tooling runs under **Node, not Bun** on this Windows box (per machine setup).
- Text: `pdftotext` reading-order. Images: a new `pdfimages`/`mutool` step → WebP in
  `public/art/`. OCR/SRD text for the rules reference.
- The ~90 MB handbook **cannot ship raw** — re-export/compress; keep PDFs out of PWA precache.
- All new content stays a typed `src/data/*.ts` file (no Firestore).

---

## 4. Suggested build order

Principle: **land the cheap shared fields + rest/location groundwork first** — almost
everything reads them.

- **Phase 0 — Foundations & quick wins:** content refresh (corrects data, fixes `sanityDie`,
  replaces the served PDF) · `transformationLevel` field + tracker · `Game.location` flag +
  `LocationControl`. *Quick wins: the transform tracker and location toggle are tiny.*
- **Phase 1 — Rest correctness, DM oversight, progression:** rest reconciliation (uses
  `location`) · DM character admin board (the host surface for Insight awards) · Insight &
  leveling (+ Deepcaller maxSanity cap fix) · player self-manage finish (give/drop). *Built
  together — they all converge on the long-rest moment and the DM board.*
- **Phase 2 — Documents & lookups (parallel to Ph.1, once Ph.0 re-export exists):** in-app
  PDFs (Deepcaller book + Whispers) · rules reference page · status-screen **vitals-only v1**
  · creation redesign data-model + step re-numbering.
- **Phase 3 — Combat (tentpole):** combat tracker (XL) · full status/spectator board
  immediately after (consumes the encounter).
- **Phase 4 — Authoring & economy:** DM creates characters (rules relaxation) · shop.
- **Phase 5 — Polish:** book artwork (Option A first).

---

## 5. Decisions for the DM/owner (this is what we iterate on)

### 5.1 Content pipeline
- `sanityDie`: switch to a dice string (recommended) or keep a number + separate die fields?
- Confirm the legacy corrections still hold for V1.0.1: Stalker Hit Die **d8**, Bloodbound
  saves **STR/CON**, Warden **no** tool proficiency?
- Did V1.0.1 change Ch.1 (steps/sanity/carrying) text the hand-authored `handbook.ts` mirrors?
- Is `python` (for `gen.py`) + a poppler/mupdf image tool available in the dev environment?

### 5.2 Serving the PDFs
- ~90 MB handbook: ship as-is, **compress** (recommended), or host externally + link? Who
  produces the optimized export, to what target size?
- Book of the Deepcaller + Whispers: separate downloads, fold into the in-app rites, or both?
- Opener UX: a true inline viewer (iffy on iOS standalone PWA) or reuse the safe
  fetch→share/download flow?
- Deepcaller gate: reuse `book-of-eldritch-knowledge` or mint `book-of-the-deepcaller`? And
  auto-seed it into a new Deepcaller's inventory, or require manual add? Visible-but-locked or
  hidden when not held? Open from where (Classes tab / hunter sheet / inventory row)?

### 5.3 Rules reference
- Text source: free 5e-2024 SRD glossary verbatim (recommended, license-clean), OCR the scan,
  or hand-curate a C&S subset?
- Scope: full glossary (~370 entries) or a curated subset (conditions + common actions)?
- Search: plain instant filter (fine for this size) or typo-tolerant fuzzy (adds a dep)?
- New `/reference` page (recommended) or a 5th Handbook tab? Public or signed-in only?

### 5.4 Player self-management & transformation/madness
- "Give an item": new one-way instant gift, or rely on the existing two-sided trade?
- "Drop an item": destroy (current) or push to a shared claimable loot pile?
- **Madness:** confirm it's always `maxSanity − sanity` (derived, recommended), or is there a
  case where they diverge (which forces a second stored field)?
- Transformation: open-ended counter or a display max? Can players freely lower their own
  transformation/madness, or is gaining DM-only (since the table is the DM's)?
- Editable outside an active game (main-menu sheet) or only in play?

### 5.5 Rest & location
- Location model: three-state `lodge/safe/wild` (recommended) or a single `safeZone` boolean
  (lossy — can't represent the Lodge's full long rest)?
- Separate location toggle (recommended) or one flat picker with "Safe Zone" as a 5th chip?
- Fix RestPanel's HP math now (full-in-Lodge / half-outside / no auto-heal in wild) or just
  expose the flag? Should the `CharacterTrackers` "Long rest" button stay, or move all rest
  logic into `RestPanel` (avoid two rest mechanisms)?

### 5.6 Insight & leveling
- Apply pending level-up automatically on long rest (recommended, literal rule) or require DM
  confirmation?
- Keep the manual level +/- in the builder? (Conflicts with Insight-driven leveling — remove,
  keep for non-campaign hunters, or make read-only in-campaign.)
- Does a long rest *outside* the Lodge still apply the pending level (recommend yes)?
- Can Insight be revoked, and does that de-level, or is leveling one-way?
- Multi-level jump in one rest if two thresholds crossed (rulebook implies yes)?
- Enforce DM-only awards in rules (real security) or UI-gate only for v1?

### 5.7 DM editing & authoring
- Which fields may the DM edit — vitals/items/level/coins only, or also name/abilities/class
  (a full rebuild)?
- Edit only during an active game, or anytime from the roster/Party page too?
- Rules posture: fully-permissive DM update, or a field allowlist protecting identity fields?
- An audit "edited by DM" marker, or silent live edits?
- **DM-created character ownership:** assigned player owns it (can edit) or DM owns it (player
  only plays)? Auto-wire `membership.characterId`, or just drop it in the player's list?
- **NPC/monster stat blocks in scope?** If yes — wizard or a lighter editor; hidden from the
  party gallery? (This overlaps the combat tracker's "monsters" — pick one model.)

### 5.8 Combat tracker & status screen
- PC HP source of truth: read live from the HunterCard (recommended) or snapshot onto the
  combatant?
- Initiative: auto-roll d20+DEX for PCs, DM types every value, or players roll & report?
- Who writes: DM-only (simplest) or let players toggle their own conditions/HP?
- Encounter lifecycle: auto-create on entering combat or an explicit "Start encounter"? Purge
  combatants on end?
- Monsters: ad-hoc name+HP+AC+conditions, or a reusable bestiary with multi-copy quick-add?
- **Conditions:** live on the HunterCard (so they survive a rest) or encounter-scoped only?
  (This is also the DM-admin "set conditions" question — decide once.)
- Status screen access: any signed-in member's device (v1) — or a dedicated always-on TV that
  isn't a personal Google account (needs a kiosk account or a public read token + new rules)?
- What shows out of combat (party vitals + countdown, recommended) and does it auto-follow the
  live game?

### 5.9 Shop & economy
- Per-campaign (recommended) or per-session?
- Catalog-only items, or allow custom DM items (needs a custom-item record so inventory
  resolves)?
- Buy settlement: client-side transaction (simplest) or a `settleBuy` CF (stock/anti-tamper)?
  Any CF must key on `/characters/{id}`, not the stale `/players/{uid}`.
- Stock: infinite faucet or limited (needs a transaction)? Sell price: absolute DM-set or a
  ratio (e.g. half)? A campaign "till" balance or infinite DM gold?
- UI placement: a new in-campaign tab, a Party-page panel, or inside Play alongside trades?

### 5.10 Creation redesign
- Backgrounds: curated list (needs Chapter-3 content, not yet in `resources/`), free-form, or
  hybrid?
- Feats: in scope? (External 5e PHB content.) Curated subset, free text, or out for v1?
- Printable fidelity: a clean typeset sheet "in the style of" R1.0 (recommended) or a faithful
  overlay of the hand-drawn scan (needs a vector/AcroForm master from the artist)?
- Insight/Transformation at creation: confirm Transformation starts 0; what sets Insight at L1?

### 5.11 Artwork
- Target: the 3D fighter shows, the 2D class sigils, or both? Replace the game-icons sigils or
  keep them as fallback?
- Which art: the per-class "Classes Boards", full-page handbook illustrations, or creature art?
  One clear image per class/subclass?
- OK that the 3D rigs stay and book art appears only as backdrops/portraits?
- Asset budget (target KB/class; aim <150 KB WebP)? Animate or static?

---

## 6. Flags worth knowing (from the rulebook + code read)

- **Content gaps the DM must fill:** the d20 **Transformation Table** and the **0-Sanity /
  max-Madness consequence** are referenced but *not printed* in the handbook. **Chapter 3
  (Backgrounds)** and **Feats** aren't in `resources/` either. Trackers can ship without them,
  but the "roll → consult" loop is inert until the DM provides content.
- **The Insight-vs-self-manage conflict:** `saveCharacter` writes the *whole* card doc. Once
  `insight` lives on the card, a self-managing player's normal save can forge it unless rules
  lock the field. Themes 4 and 10 must be reconciled before either ships.
- **One write path, please:** themes 4/5/9/10 (and combat reading HP) all mutate
  `/characters/{id}` live. Settle on the `patchCharacter` partial-merge route up front or
  they clobber via last-write-wins.
- **The trade Cloud Function is keyed on a dead `/players/{uid}` collection** — don't copy that
  bug into the shop.
- **`bun run smoke` after every `firestore.rules` change** — preview channels run the *old*
  rules, so `check`/preview can't catch scoping bugs (this has bitten before).
