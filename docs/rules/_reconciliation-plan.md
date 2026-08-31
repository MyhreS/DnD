# C&S Beta Reconciliation — Implementation Plan

Single, ordered, deduplicated plan merging findings A01–A17 and B01–B07.
Authority for every disputed claim is `docs/rules/*.txt`. Where two findings
disagreed, the txt was consulted and the txt wins.

---

## ⛔ HARD CONSTRAINT — READ BEFORE TOUCHING ANY COMPONENT

**Simon loves the existing visual design of the Hunter builder and the canonical
character sheet. This is a CONTENT AND LOGIC SYNC ONLY.**

- **No restyle.** No new CSS, no changed spacing, colours, typography or chrome.
- **No re-layout.** No moving panels, no changing column counts, no new grids.
- **No redesign.** No reworked flows, no reordered builder steps.
- **No new navigation.** No new routes, tabs, pages, modals or menu entries.

Every change below must land as: a data value, a string, a formula, a boolean, a
new row inside an existing list, or one extra `<article>`/checkbox inside an
existing panel using the existing markup and class names. If an item cannot be
implemented without a layout change, **stop and ask Simon** rather than
redesigning.

The builder's five-step order (Class → Background → Ability Scores → Armor →
Fill in Details) already matches core-rulebook.txt [page 30]. **Do not reorder
it.** There is no species/ancestry step in the beta and none in the app — do not
add one.

---

## 🚧 BLOCKED — AWAITING SIMON

**Implement NOTHING for these four. Do not work around them, do not pick a
default, do not "fix forward".** Every plan item that depends on one of these is
marked `[BLOCKED-n]` and must be skipped until answered.

### BLOCKED-1 — Current Sanity vs Madness ⚠️ HIGHEST VALUE — ANSWER FIRST

This one question unblocks work in **three separate places** — finding A03
(the Sanity panel + automation), B02 item 1 (the character sheet's most
source-contradicting surface), and B06 item 1 (`StatusPage` `VitalsCard`, the
big-screen board). It is the single highest-leverage answer Simon can give.

The two beta sources contradict each other:

- core-rulebook.txt [page 42] "Max Sanity and Madness": *"Start with 0 Madness
  and **do not track Current Sanity**. Madness functions like damage against Max
  Sanity."*
- character-sheet.txt [page 1] lines 32–34 still prints `SANITY (3)` with
  **CURRENT / MAX** boxes, and prints no Madness box at all.

> **Question for Simon:** The rulebook says not to track Current Sanity — Madness
> is the number that goes up until it hits Max Sanity. But the printable
> character sheet still has CURRENT and MAX Sanity boxes. Which one is right?
> Should the app stop tracking Current Sanity everywhere and show Madness
> counting up toward Max Sanity instead — and if so, should the printable sheet
> keep its CURRENT box to match the PDF, or lose it too?

### BLOCKED-2 — The Hunter Cleaver

`grep -i cleaver docs/rules/*.txt` returns **zero hits**. The Scout's starting
equipment now reads **Shortsword** where the Cleaver used to be
(core-rulebook.txt [page 56]). But existing Scout characters carry one in their
inventory, and it is not a rename — the Shortsword is a different weapon.

> **Question for Simon:** The Hunter Cleaver has disappeared from the beta rules
> entirely — the Scout now starts with a Shortsword instead. Existing hunters
> still carry a Cleaver in their gear. Do you want to (a) leave their Cleavers
> alone as a one-off keepsake weapon with DM-set stats, (b) swap each one for a
> Shortsword, or (c) remove it from their gear?

### BLOCKED-3 — Item prices

core-rulebook.txt [page 107] "Coins": *"**The app is the authoritative source for
prices.** The GM determines which goods and services are available…"* The
rulebook deliberately publishes no price list. The app has no price field.
Inventing prices would be authoring game content, which is out of scope.

> **Question for Simon:** The rulebook says the app is where prices live, but it
> doesn't print any. Do you want a price list in the app — and if so, will you
> give us the numbers?

### BLOCKED-4 — The "Maduhausu" name

The alternative 57-point buy's **numbers are all correct** (A05, B07 both
verified them value by value). But the beta calls it *"Alternative point buy"*
with the *"Ability Score Point Costs V2"* table, and the word **"Maduhausu"
appears nowhere in any of the five txts**.

> **Question for Simon:** The rulebook calls the 57-point option "Alternative
> point buy". The app calls it "Maduhausu". Is Maduhausu your own name for it
> that you want to keep, or should the app say "Alternative" like the book?

**Regardless of the answer**, the stored value stays `abilityMode: "maduhausu"`
— see item 12.

---

## 📏 REGRESSION BASELINE (verbatim — measure against this, not against green)

"Newly introduced breakage" means a deviation from **this exact baseline**,
captured on a clean worktree at `9ea2403`:

| Gate | Baseline |
|---|---|
| `tsc -b` | **clean** — exit 0, no output |
| `eslint .` | exit 0, **exactly 1 pre-existing warning**: `react-hooks/set-state-in-effect` on `setDismissedBattleKey` |
| `knip` | exit 1, **exactly 5 pre-existing findings**: unused devDependency `eslint`; unlisted binaries `tsc`, `vite`, `eslint`, `knip` |
| `bun run test:game-presentation` | **passing** |
| `bun run test:enemy-library` | **passing** |
| `bun run test:workshop-manager` | **passing** |
| `bun run test:pwa-update-policy` | **passing** |
| `bun run test:codex` | **already broken** by our `resources/master.json` deletion |
| `bun run test:ability-buy` | **already broken** by our `resources/master.json` deletion |
| `bun run test:character-automation` | **already broken** by our `resources/master.json` deletion (229 lines pass first) |

**Any NEW `tsc` error, a 2nd eslint warning, or a 6th knip finding is a
regression WE caused.** The three broken tests are ours to repair (batch 1), not
evidence of new damage.

`bun run check` is a single `&&` chain starting with `test:codex`, so it exits at
step 1 and never reaches tsc/eslint/knip. **Run the gates individually** until
batch 1 repairs the chain.

---

## 🔒 GM-ONLY BOUNDARY (non-negotiable)

`docs/rules/hidden-condition-sheet.txt` is **GM-ONLY**. Nothing from it may reach
public app UI, any `src/data/**` file, the Codex, the public API, or any build
output. Leak scans across `src/`, `public/`, `scripts/` and
`codex.generated.json` are **currently clean** (B03, B05, B06) — keep them that
way.

Specific rules:

- The **names** `Lost`, `Lost Condition` and `Second Threshold` are printed in
  the public core rulebook and may appear as bare names (e.g. in the
  Transformation Table data). **Their triggers and effects must never** enter
  `src/data/**` or the Codex.
- `Lost` must **not** appear in any player-facing condition picker.
- The new Codex generator must read the four player txts from an **explicit
  filename allowlist**, never by globbing `docs/rules/*.txt` and filtering — a
  filter is one typo away from a leak.
- Keep both existing negative assertions in `scripts/codex-data-test.ts`
  (no `hidden-condition-sheet` source id; no entry with that `sourceId`) and
  **add** an assertion that no substring of the hidden sheet appears in
  `codex.generated.json`.

---

# BATCH 1 — Unblock the build, the tests, the fixtures and the docs

Areas: **source pipeline / Codex generator · scripts & tests · dev preview ·
project docs**

Nothing else can be verified until this batch lands. `src/dev/preview.ts` is
fixed **here, first**, because it drives every screenshot run — verifying
screenshots against today's preview means verifying against fiction.

### 1.1 Source pipeline & Codex data

**1.** Rewrite `scripts/generate-codex-data.mjs` to read `docs/rules/*.txt`
instead of `resources/master.json` + `resources/pdf/*`. Replace the
`MASTER_PATH`/`PDF_ROOT` constants (lines 12–18) and the four-PDF + SHA-256 gate
(lines 41–60) with a hard-coded four-entry allowlist:
`core-rulebook` → `docs/rules/core-rulebook.txt` (126 pp);
`book-of-the-deepcaller` → `docs/rules/book-of-the-deepcaller.txt` (13 pp);
`character-sheet` → `docs/rules/character-sheet.txt` (11 pp);
`whispers` → `docs/rules/whispers-sheet.txt` (2 pp).
`hidden-condition-sheet.txt` is **not in the table and is never opened**.
Parse `[page N]` markers into the existing `sourcePages` field. Keep the emitted
`rites[]` / `whispers[]` / `entries[]` shapes **byte-compatible** so
`src/data/codex.ts`, `characterOptions.ts`, `AppDeepcallerReference.tsx`,
`upgradeModel.ts` and `CodexPage.tsx` need **no changes at all**.
(A10, A17, B04, B07)

**2.** In the same generator, keep all **21 rite ids** and all **6 whisper ids**
verbatim (`slug(name)`). A10 and A17 independently verified that every rite and
whisper matches the new txts exactly — level, Type, Performing, Range, Duration,
body, and Higher-Level Strain line — with only a Unicode ellipsis (Plane Shift)
and an em dash (Minor Illusion) differing. **Any id change breaks every
Deepcaller's stored `preparedWhispers`.** Preserve the `Hidden Truths` section
marker and Plane Shift's `sourceNote`. (A10, A17, B03)

**3.** Replace the deleted PDF SHA-256 gate with a **SHA-256 of each
`docs/rules/*.txt`** recorded in the generated file, so an edited transcription
still fails loudly. (A17)

**4.** Regenerate `conditionsNamedByCurrentSources` in
`src/data/codex.generated.json` from the **three public conditions tables** at
core-rulebook.txt [pages 21–23], not from prose mentions. Target set (25 public
names): **Impairments** Blinded, Deafened, Mesmerized, Frightened, Incapacitated,
Paralyzed, Restrained, Stunned, Unconscious; **Hazards & Afflictions** Dying,
Exhaustion, Poisoned, Sleepless, Suffocating, Underwater; **Battlefield States**
Blood-Tensed, Demoralized, Flanked, Grappled, High Ground, Invisible, Prone,
Aiming Prone, Surrounded, Taunted; **Special** Insane.
**Exclude `Lost` and `Second Threshold`** (GM-only pointers). Do not hand-edit
the generated file. (A02, A03, B03, B05, B07)

**5.** Add `Conditions`, `Equipment`, `Combat` and `Rest & Transformation` entry
groups sourced from `core-rulebook.txt`, and add `core-rulebook` as a fourth
`CodexSource` — the 126-page rulebook currently has **zero** Codex
representation. Drop the `Source Notes` group and `referencedButNotSupplied`
(both were `master.json` properties with no successor). Reference-only rules
that belong here rather than in app logic: the DC table and group checks
(A01, [page 9–10]), mounted rules / obscurement / senses / difficult shots
(A02, [pages 19–20]), Damaging Objects and Improvised Weapons
(A15, [page 108]), the Madness Die's Star/Blank/Eye faces
(A03, [page 23] + [page 3]), the Unsafe Rest Checks / Guards table
(A04, [page 26]), and rest-interruption conditions (A04, [page 25]). (A01, A02,
A03, A04, A15, B04)

**6.** Regenerate `public/source-library/<id>/<id>.txt` for the four player
documents and repoint `publicPath` / `downloads[].publicPath` from `.pdf` to
`.txt`. Drop the `#page=N` fragment on "View source" (meaningless for a txt).
Add `"core-rulebook"` to the front of `DOCUMENT_SOURCE_ORDER`. Copy edits only in
`CodexPage.tsx`: `SourceLibrary`'s `"downloadable PDF"` → `"document"`,
`CodexHome`'s `"PDFs"` → `"documents"`, and the documents-page subheading
`"The three current player documents"` → `"four"`. (A10, A17, B04, B07)

**7. ⚠️ MERGE BLOCKER ON THIS BRANCH — NOT A LIVE PRODUCTION INCIDENT.**
State this exactly that way in any report. **`main` still has `codex:generate` in
its `dev`, `build` and `build:ci` scripts**, so the deployed production build
does populate `public/source-library/` and its Codex download links work today.
**Our branch's commit `ccca065` removed that prebuild step**, which is what would
break the links **if this branch merged as-is**. Finding B07 (§"Stale shipped
artifact") overstated this as a live production 404; that is incorrect and is
corrected here. **Fix:** restore `bun run codex:generate &&` to the `dev`,
`build` and `build:ci` scripts in `package.json` once the generator of item 1
works. (B04, B07 — corrected)

### 1.2 Scripts & tests

**8.** ⚠️ `scripts/codex-data-test.ts` **lines 50–51** pin `CONDITIONS` to exactly
`["Blinded","Frightened","Incapacitated","Insane","Invisible","Restrained"]` and
assert `CONDITIONS` deep-equals it. **This assertion will actively BLOCK item 4.**
**The test must be UPDATED to the beta's ~26 conditions (core-rulebook.txt pages
21–23), not worked around, not deleted, not skipped.** Related evidence that the
6-item list is already wrong: `scripts/enemy-library-test.ts:36-37` relies on the
slug `"poisoned"`, which the current 6-item catalog cannot produce. (A03, B03,
B05, B07)

**9.** In `scripts/codex-data-test.ts`, delete every assertion reading
`resources/master.json` internals, `resources/pdf/` filenames, SHA-256 hashes,
and `public/source-library/` PDF paths (lines 11–50, 62–89 in part). **Keep and
repoint**: the regenerate-and-diff staleness check, the per-entry integrity loop,
the `SKILLS` cross-check, the search assertions, the 6-whisper count, and **both**
hidden-source exclusions. **Add** the no-hidden-substring assertion (see GM
boundary). Update the source count 3 → 4. (A17, B04, B07)

**10.** Remove `"Hunter Rifle"` from the retired-content denylist in
`scripts/codex-data-test.ts` and from the retired-content probe in
`scripts/e2e-codex.mjs`. It is **current content again**: core-rulebook.txt
[page 111] lists it as a plain Martial Ranged weapon. Re-check the other six
denied names individually — **Cracked Perception is now a real public rule**
(A03, [page 23], the Insane upside). (A15, B04)

**11.** In `scripts/e2e-codex.mjs`, drop the `content-type: application/pdf`
assertion (assert `200` + non-empty body instead), update `/3 sources.*3 PDFs/`
and the three expected document titles to four. Keep the `"Old One Vessel"`
negative check — it is a GM-leak guard. (B04, B07)

**12.** In `scripts/ability-buy-test.ts`, replace the `master`/`rules`/
`standard`/`maduhausu` fixture reads (lines 32–40, 53, 73, 114–117) with literals
asserted against `src/data/abilities.ts`. **Every value the test asserts is
unchanged by the beta** — 27 points / 8–15 / costs 8:0 9:1 10:2 11:3 12:4 13:5
14:7 15:9, and 57 points / 3–16 / 14:[12,14,17] 15:[14,18,23] 16:[20,26,null] /
final cap 17 (core-rulebook.txt [page 32]). Keep the exhaustive 262,144 +
27,132 case sweeps as-is. **Stored `abilityMode` values must stay UNCHANGED even
if the user-facing label changes** — renaming the stored `"maduhausu"` literal
would force an unnecessary data migration on every alternative-buy hunter.
[BLOCKED-4 governs the label only, never the stored value.] (A05, B01, B07)

**13.** In `scripts/character-automation-test.ts`, replace the `master` reads at
lines 230–234 with assertions against `src/data/characterOptions.ts`
cross-checked to `docs/rules/book-of-the-deepcaller.txt` and
`docs/rules/whispers-sheet.txt`. **Do not simply delete lines 233–234** — they
are the only guard that the Rite/Whisper catalog has no duplicates and matches
the source. The two point-buy budgets at 231–232 (27 / 57) are still correct.
(A17, B07)

### 1.3 Dev preview fixture — FIX EARLY, BEFORE ANY SCREENSHOT VERIFICATION

**14.** `src/dev/preview.ts` is DEV-only and never ships, **but it drives every
screenshot run** (`bun run scripts/shots.mjs`, `bun run e2e`, the simulator
walkthrough). It has **six stale values**. Fixing them is a prerequisite for any
visual verification in later batches — otherwise every screenshot is checked
against fiction:

  a. **Wrong class label** — `classId: "scout"` (line 262) but `sheet.class:
     "Stalker"` (line 311) and `previewParticipants()` `className: "Stalker"`
     (line 156). Scout and Stalker are distinct beta classes and Marksman is a
     **Scout** subclass. Set both strings to `"Scout"`. (B06-4)
  b. **Speed 30 → 35** — `sheet.speed: "30 ft"` (line 346). core-rulebook.txt
     Core Hunter Scout Traits: `Speed 35ft`; `src/data/classes.ts:106` already
     has `speedFt: 35`. (B06-5)
  c. **sanityMax 11 → 13** — line 319. Scout base Max Sanity 12
     (`classes.ts:104`) + Eileen's WIS 12 (+1) = **13** (core-rulebook.txt
     [page 42]). `[BLOCKED-1]` for the paired `sanityCur` removal / `madness`
     addition — **fix `sanityMax` to 13 now; leave `sanityCur` alone until
     BLOCKED-1 is answered.** (B06-6)
  d. **Hunter Cleaver** — `inventory` line 295 and `sheet.eq_1_0` line 369.
     `[BLOCKED-2]` — do not remove until Simon answers. (B06-7)
  e. **Three nonexistent backgrounds** — `"Plague Doctor"` (line 263),
     `"Cleric of the Old Ways"` (line 178), `"Old Hunter"` (line 201). None
     resolve against the 14 catalog ids, so the background → feat → skill wiring
     contributes nothing in preview. Replace with real ids (e.g. Grave Tender,
     Church Missionary, Drifter). (B06-8)
  f. **Level-2 Zealot** — `previewArchive()` lines 244–249: `subclassId:
     "hunter-zealot", level: 2`. The Zealot prestige class is entered at **level
     3** (core-rulebook.txt line 3125). Bump to `level: 3` / `lastSeenLevel: 3`.
     Keep both whisper ids — they are current. (B06-9)

**15.** **Keep** `previewCombatants()` conditions `["poisoned"] / ["frightened"]
/ ["prone"]` (lines 136–138) unchanged — they are real beta conditions and are
currently the only demonstration of the raw-id fallback. They become correct for
free once item 4 lands. (B06-10)

**16.** **Keep** preview `sheet.ac: "14"` (line 349) — it is accidentally the
**post-fix** value under the corrected Studs threshold (item 40). Do **not**
"fix" it to 15. (B06-11)

### 1.4 Documentation

**17.** `CLAUDE.md` has **two factual errors** to fix:
  a. Line 88 names `features/hunter/components/papersheet/SheetPage1.tsx` as the
     deliberate >200-line exception. **That file does not exist.** `papersheet/`
     contains no sheet pages at all. Remove or repoint the reference.
  b. Line 69 documents `features/<feature>/ e.g. auth, **sessions**, hunter,
     **party**, codex, profile` as current features. **Neither
     `src/features/party/**` nor `src/features/sessions/**` exists.** `src/features/`
     contains: auth, campaigns, codex, game, hunter, play, profile, status.
     Correct the list. (B06)

**18.** Rewrite `CLAUDE.md` "Updating game content" to describe the txt pipeline
(four player sources + one GM-only source, txt SHA-256s, no PDFs, no
`resources/pdf/`). It currently describes the deleted four-PDF pipeline as live
behaviour and contradicts both `resources/README.md` and reality. Update
`resources/README.md`'s paragraph saying the pipeline "no longer runs". (B04)

**19.** Once items 1–13 land, `bun run check` reaches `tsc`/`eslint`/`knip` for
the first time. Re-measure against the baseline table above. Consider adding
`bun run check` to `.github/workflows/deploy.yml`, which today runs only
`test:workshop-manager` + `build:ci`. (B07)

---

# BATCH 2 — Shared types, then the equipment catalogs

Areas: **shared types & vocabulary · weapons · armor · items / tools / gear**

Types and catalogs first; every UI item in batches 4–5 reads from them.

### 2.1 Shared types & doc comments

**20.** `src/types.ts` — correct four stale doc comments that assert the sources
lack rules they now contain. They are the stated justification for the data model
and the next agent will read them as authority:
  a. `transformationLevel` (lines 541–547): *"The supplied documents reference but
     do not include the Transformation Table"* — **false**; the full 20×10 table
     is at core-rulebook.txt [page 27] line 1275.
  b. `activeTransformations` (lines 545–547): says "duplicates allowed" —
     core-rulebook.txt [page 26] line 1236: *"Active Transformations do not stack
     with themselves. If you roll one you already have, suffer 2 Madness."*
     Change to "unique ids".
  c. `madness` (lines 538–540): the public rulebook now defines it in full at
     [page 42].
  d. `bloodTinge` (lines 550–551): *"the C&S take on heroic inspiration"* —
     "heroic inspiration" appears nowhere in the beta. Replace with the source's
     own definition ([page 44]).
  e. `sanity` (lines 536–537): `[BLOCKED-1]` — mark `@deprecated` only once
     BLOCKED-1 is answered.
  (A04, B06)

**21.** Add these new optional fields to `HunterCard` in `src/types.ts`, defaulted
in `emptyCard()` / `blankCard()` in `src/lib/character.ts`:
  - `notTonight?: boolean`, default **`true`** — core-rulebook.txt [page 44]:
    *"A newly created Hunter **begins with Not Tonight!**"* (A04, A06, B05)
  - `favors?: number` (0–2), default **`0`** — [page 45]: *"A Hunter can have no
    more than two Favors."* Clamp in `normalizeCard()`. (A06, B05)
  - `sleeplessCounter?: number`, default **`0`** — [page 21] lines 977–983 and
    [page 25] line 1197. (A03, A04)
  - `exhaustion?: number`, default **`0`** — [page 25] line 1191 *"Reduce
    Exhaustion by 1"*; the Scout's level-10 Tireless is untrackable without it.
    (A04)
  - `insaneQuirkId?: string`, optional, no default — [page 24] lines 1114–1166.
    (A03)

**22.** `src/types.ts` — confirmed correct, **leave untouched**: `SlotLocation`,
`CarrySignificance`, `ArmorCategory`, `ExtraSubcategory` all match the beta's own
vocabulary ([pages 33–38, 122]). `src/config.ts` contains no rules vocabulary at
all. (B03, B06)

**23.** `src/lib/character.ts:19` `proficiencyBonus()` clamps level at 20, giving
+6 max. The source table runs to level 30 ([page 11]), but every class table and
both derivation paths stop at 20. **Do not widen the clamp speculatively.**
Recorded so nobody "fixes" it. (A01)

### 2.2 Weapons

**24.** `src/data/weapons.ts` — add `category: "Simple" | "Martial"` to
`WeaponFacts`, populated from the four section headings of the
core-rulebook.txt [page 111] weapons table. **This field is a hard dependency**
for items 76 and 77 (the Stalker/Bloodbound mastery filters). (A09, A15, B01)

**25.** Add the **19 missing weapons** to `WEAPON_FACTS` and to `ITEMS` verbatim
from core-rulebook.txt [page 111] (name, damage + type, properties string,
mastery, weight, carrying category): **Simple Melee** Club, Greatclub, Javelin,
Light Hammer, Mace, Spear; **Simple Ranged** Throwing Knife; **Martial Melee**
Battleaxe, Flail, Glaive, Halberd, Maul, Morningstar, Pike, Rapier, Trident,
Warhammer, War Pick, Whip. The app catalogs 10 of the table's 29 weapons, which
makes most legal Weapon Mastery picks unselectable. Purely additive; no UI change
— `CharacterSheetWeaponMasteryChoices.tsx` maps over `automation.masteryWeapons`
already. (A15, B01, B03)

**26.** **Confirmed match — leave the 10 existing `WEAPON_FACTS` rows untouched.**
Every damage die, damage type, property string and mastery survives the beta
unchanged (A15, B03 both verified value by value against [page 111]). Likewise
all 8 `WEAPON_MASTERY_DESCRIPTIONS` (Cleave, Graze, Nick, Push, Sap, Slow,
Topple, Vex) match [page 110]. Optional one-sentence precision: Topple's DC
("8 + the ability modifier used for the attack + your Proficiency Bonus") and
Slow's non-stacking 10-foot cap. (A02, A15, B03)

**27.** `src/data/items.ts` — drop `unique: true` from `hunter-rifle` and fix the
file-header comment. core-rulebook.txt [page 111] lists it as an ordinary Martial
Ranged weapon alongside the Pistol. (A15)

**28.** `src/data/items.ts` — add `slotLocation: "back"` to `hunter-rifle`, and
to `javelin` when it is added (item 25). [page 111] pins both: *"Significant Item
(back)"*. The mechanism already exists (`shovel` uses it). (A15)

**29.** Add `WEAPON_PROPERTY_DESCRIPTIONS` to `src/data/weapons.ts` — the 11
verbatim definitions from core-rulebook.txt [pages 109–110] (Ammunition,
Finesse, Heavy, Light, Loading, Range, Close Range, Reach, Thrown, Two-Handed,
Versatile). Surface it exactly the way `WEAPON_MASTERY_DESCRIPTIONS` is already
surfaced — the small description line under the weapon. **No new component.**
(A15)

**30.** Add an `unarmed-strike` row to `WEAPON_FACTS` so the existing weapon
reference panel can show it. core-rulebook.txt [page 15]: attack = STR mod + PB;
damage = **1 + STR mod Bludgeoning, minimum 1**; Grapple and Shove are options of
this attack. Class features across `src/data/classes.ts` (Improved Critical,
Blood Frenzy, Brutal Strike, Retaliation, One Form) repeatedly reference Unarmed
Strikes with no catalog entry behind them. (A01)

### 2.3 Armor

**31.** `src/data/armor.ts` — `studs` entry: `weightLb: 3` → **`5`**, and change
the copy `"(+3 lb. each)"` → `"(+5 lb. each)"`. core-rulebook.txt [page 35]:
*"+5 lb. per studded Add-on Armor piece"*. (A05, A06, B02, B03)

**32.** `src/data/armor.ts` — `robe` ("Robe of the Deepcallers"): `weightLb: 4` →
**`2`**. core-rulebook.txt [page 124]: *"ROBE OF THE DEEPCALLERS — Armor, 2 lb."*
Its effect text already matches. (A05, B03)

**33.** `src/data/armor.ts` — rewrite the drifted `special` strings verbatim from
core-rulebook.txt [page 38] "Armor Part 2":
  - All four head-gear pieces (Tricorn, Cavalier Hat, Cowl, Wide Brim Hat):
    `"May hide face transformations."` → **`"Is given by class."`**
  - Small Scarf (1 lb): → *"Can conceal a minor visible mouth or neck
    transformation from casual observation."* (**note:** the current entry also
    carries the Boots' special *"Prevents barefoot penalties."* and **2 lb**
    instead of the source's **1 lb** — fix both.)
  - Large Scarf (2 lb): → *"You have Advantage on checks to conceal visible mouth
    and neck transformations."*
  - Leather Gloves (2 lb): → *"May give relevant advantages / disadvantages
    during play. The player has to themselves explain how using the gloves in a
    particular situation will bring some advantage to a check."*
  - Leather Boots: already matches — leave it.
  The `impression` fields are app flavour outside the source; see item 100.
  (A05, B02, B03)

**34.** `src/data/armor.ts` — add the studded-armor Stealth penalty to the studs
`special` text: core-rulebook.txt [page 35] *"While wearing studded armor, you
have Disadvantage on Dexterity (Stealth) checks made to hide or move silently."*
`characterAutomation.ts` already concatenates `piece.special`, so this is a data
edit only. (A06)

**35.** Optional single-word fix: the Under Layer Leather Jerkin's source text is
*"harder to steal, **find**, or strip away"*; `armor.ts:126` omits "find". (A05)

**36.** **Confirmed match — leave untouched.** All 22 armor ids exist in the beta;
none added, none removed. Main Armor AC 11/11/11/12/12/12 and weights
6/6/7/10/10/11; Add-ons Full Leather Cuirass +2/10 lb, Pauldrons +1/2 lb,
Vambraces +0/2 lb, Jerkin +1*/2 lb; all eight Extras at AC 0. The add-on limit of
5 (6 with Balanced Fit), the Shield Arm same-side pairing at +2 total, and the
four AC bands with their Dex rules in `acCategory()` are all exact. (A05, A06,
B02, B03)

### 2.4 Items, tools and gear

**37.** `src/data/items.ts` — set `carry: "Significant"` on **every**
`category: "Tool"` entry (`thieves-tools`, `navigators-tools`,
`blood-drainers-tools`) and correct the file-header comment at lines 8–14 that
codifies tool sets as Insignificant. core-rulebook.txt [page 114]: *"Carrying
Category. **All Tools are Significant Items.**"* This is a real slot-consumption
change via `src/lib/slots.ts`, not cosmetic. (A16, B03)

**38.** `src/data/items.ts` — drop `unique: true` from `blood-drainers-tools`;
[page 115] lists it under plain "Other Tools", not Unique Items. Also drop the
`"(unique item)"` parenthetical from `src/data/classes.ts:372`
`toolProficiencies`. (A16, B03)

**39.** `src/data/items.ts` — recategorise `tool-belt` from `"Tool"` to `"Gear"`.
The source calls the Toolbelt a **Storage Item** ([page 122]), so it must not be
swept into the "All Tools are Significant" rule or future tool-proficiency logic.
Grouping-only change in `InventoryAddForms.tsx`'s optgroup list. (A16)

**40.** `src/data/items.ts` — add the **five Artisan's Tools** from
core-rulebook.txt [page 115], all `category: "Tool"`, `carry: "Significant"`,
with the Utilize DC and Craft list in `note`: Alchemist's Supplies (INT, 8 lb),
Carpenter's Tools (STR, 6 lb), Cultist's Tools (INT, 8 lb), Poisoner's Kit (INT,
2 lb), Smith's Tools (**DEX**, 10 lb). They exist today only as proficiency
*names*, so a Cultist background grants a tool that cannot be added to inventory.
(A16, B03)

**41.** `src/data/items.ts` — add the ~30 missing **Hunting Gear** entries from
core-rulebook.txt [pages 116–121] with the table's exact weight and `carry`, and
a one-line `note` from each item's prose: Acid (1 lb, Insig), Ball Bearings (2,
Insig), Barrel (70, Oversized), Basket (2, Oversized), Block and Tackle (5, Sig),
Bottle Glass (2, Insig), Bucket (2, Oversized), Caltrops (2, Insig), Candle (—,
Insig), Chest (25, Oversized), Flask (1, Insig), Grappling Hook (4, Sig), Ink (—,
Insig), Ink Pen (—, Insig), Jug (4, Sig), Ladder (25, Oversized), Lock (1,
Insig), Mirror (1, Insig), Net (3, Sig), Paper (—, Insig), Parchment (—, Insig),
Poison Basic (—, Insig), Pole (7, Oversized), Pot Iron (10, Oversized), Ram
Portable (35, Oversized), Signal Whistle (—, Insig), Spikes Iron (5, Insig),
String (—, Insig), Tinderbox (1, Insig), Vial (—, Insig). Purely additive; no UI
change. (A16, B03)

**42.** `src/data/items.ts` — add `silver-bullets`: `category: "Ammunition"`,
`carry: "Insignificant"`, `weightLb: 0` (same as Bullets), note *"+1d6 damage
against Dreadbloods."* core-rulebook.txt [page 123]. (A15, A16, B03)

**43.** `src/data/items.ts` — split the Lantern. The beta has no generic
"Lantern": [page 118] defines **Lantern, Bullseye** (2 lb, Significant, Bright
Light in a 60-ft **Cone**, Dim +60 ft) and **Lantern, Hooded** (2 lb,
Significant, Bright 30-ft radius, Dim +30 ft, Bonus Action to lower the hood to
5-ft Dim). Add `lantern-bullseye` and `lantern-hooded`; **keep the legacy
`lantern` id resolvable** (rename it "Lantern, Hooded" and reuse the id, or add a
`startingEquipment.ts` alias) so existing inventories do not silently lose the
entry. Migration remaps `lantern` → `lantern-hooded` (see item 133). (A16, B03)

**44.** `src/data/items.ts` — split the Book. Rename the existing
`book-of-eldritch-knowledge` to **"Book of the Deepcaller"**, **keeping the id**
(so aliases and stored inventories resolve), and mark it `unique: true`
([page 124]). Add a separate generic `book` item (Gear, Significant, 5 lb, note
carrying the *"+5 to Intelligence (Eldritch Knowledge, Old World History, Blood
Nature, or Religion) checks about that topic"* rule from [page 117]). Then in
`src/lib/startingEquipment.ts:7`, drop the alias line collapsing *"book of the
deepcaller"* onto `book-of-eldritch-knowledge`. (A16, B01, B03)

**45.** `src/data/items.ts` — `blood-vial`: `weightLb: 0` → **`0.5`**
(core-rulebook.txt [page 122] *"Insignificant Item, 0,5 lb."*). Keep
`carry: "Insignificant"`. Expand the note to mention purity and the Bonus Action.
**Do NOT split into four purity ids in this pass** — Bloodvial purity (Tainted /
Stirred / Concentrated / Pure Old Blood, [pages 122–123], each with its own
healing, Madness reduction and Grit DC) is a mechanics change, not a catalog
rename. Flag it for Simon as a separate feature. (A16, B03)

**46.** `src/data/items.ts` — fix three notes that contradict the source:
  - `antitoxin`: *"Advantage on saves against poison for 1 hour."* → **"Bonus
    Action — Advantage on saving throws to avoid or end the Poisoned
    condition."** The "1 hour" is a 5e holdover with no basis in the beta
    ([page 116]).
  - `rope`: *"50 feet of hempen rope."* → the source's actual mechanics (tie a
    knot DC 10 DEX (Sleight of Hand); burst DC 20 STR (Athletics); bind a
    Grappled/Incapacitated/Restrained creature; escape DC 15 DEX (Acrobatics)).
    **The beta states no length** ([page 120]).
  - `chain`: *"10 feet of heavy chain."* → wrap DC 13 STR (Athletics), escape DC
    18 DEX (Acrobatics), burst DC 20 STR (Athletics). **No length stated**
    ([page 117]).
  (A16)

**47.** `src/data/items.ts` — `bullets` note *"Bullets have no carried weight."*
contradicts core-rulebook.txt [page 107]: *"Each bullet weighs approximately one-
third of an ounce. Fifty bullets weigh one pound."* Keep
`carry: "Insignificant"` (correct) and correct the note. (A15)

**48.** `src/data/items.ts` — remove items whose concept is gone from the closed
Hunter Gear table ([pages 116–121]): **`bedroll`** (7 lb), **`rations`** (2 lb),
**`letter`** (0 lb), **`brewers-supplies`** (9 lb). **Keep `key`** — Lock and
Manacles both state the item *"comes with a key"* ([lines 5279, 5299]), giving it
a source-supported reason to remain. (A16, B03)

**49.** `src/data/characterOptions.ts` — remove **"Brewer's Supplies"**,
**"Mason's Tools"** and **"Tinker's Tools"** from `TOOL_PROFICIENCIES` and
`TOOL_DETAILS`. The beta's complete tool roster is **8** ([page 115]); none of
these three appears anywhere in any txt. **Confirmed non-obvious match:** the
eight survivors all carry the correct governing ability, including Smith's Tools
= **Dexterity** (not Strength) and Blood-drainer's = **Constitution** — do not
"correct" those. Also update the file's comments at lines 3–4 and 37–38, which
still cite `master.json` as the authoring source. (A16, B01, B03)

**50.** `src/data/storage.ts` — **confirmed exact match, leave untouched.** All
six storage items' requires/gives/count/location/weight/carry pairs match
core-rulebook.txt [page 122], including the Ankle Holster's `requires: null` /
`only: ["dagger","pistol"]` and the Front→`chest` mapping. `BASE_SLOTS` matches
[page 41] exactly, including the hand XOR rule. (A05, A16, B03, B05)

---

# BATCH 3 — Class data, class text, and the starting-equipment resolver

Areas: **classes & subclasses · starting equipment resolver · backgrounds &
feats · Rites / Whispers / Zealot**

### 3.1 Repo-wide sweeps in `src/data/classes.ts`

**51.** **Global replace `"(see chapter 4)"` → `"(see chapter 5)"`** across
`src/data/classes.ts`. Feats are **Chapter 5** in the beta (Backgrounds is 4,
Equipment is 6). All 12 occurrences are feat cross-references; the Deepcaller
entries already omit the parenthetical. Affects lines 52, 62, 141, 143, 151, 231,
239, 406, 416, 496, 506 and Warden's ASI/Epic Boon. Raised independently by A07,
A08, A09, A11, A12, A14 — **do it once, globally.** (A07, A08, A09, A11, A12,
A14)

**52.** **Global replace `"Charmed"` → `"Mesmerized"`** across
`src/data/classes.ts`. `grep -ci charmed docs/rules/core-rulebook.txt` = **0**;
`mesmerized` = 5. The beta renamed the condition. Sites: `classes.ts:353`
(Deepcaller Absolute Union / Unshaken Vessel), `:427` (Berserker Mindless Blood
Frenzy, **two occurrences**), `:499` (Warden Counter). Raised by A10, A11, A12 —
**one sweep.** (A10, A11, A12)

### 3.2 Starting-equipment resolver (prerequisite for all six class lists)

**53.** Extend `startingKit()` in `src/lib/startingEquipment.ts` to return an
`extraArmorIds` list alongside `inventory`/`coins`, resolved against `ARMOR` for
`armorCategory === "Extra"`, and have `withStartingKit()` in
`CharacterAutomationProvider.tsx` merge it into `card.extraArmorIds` with the
same grant/ungrant bookkeeping it already does for `inventory` and `coins`.
**Fix this once in the resolver, not per class.** Today `startingKit()` resolves
names only against `ITEMS`, so the four class head-gear pieces (which live in
`src/data/armor.ts`) fall into `unmatched` and are written into
`sheetAutomation.legacyEquipment` as `{carrying: "Needs catalog data", slot: "—",
weight: "—"}` placeholders. The Armor & carrying step then shows the hat in its
existing Extras socket with **no UI change**. (A07, A08, A10, A11, A12, B01, B03)

### 3.3 Class starting equipment — all six lists are wrong

**54.** Brute (`classes.ts:25`) — append **`"Wide Brim Hat"`**. Source
[page 49]: *Greatsword, Shortsword, Bloodvial (1), Toolbelt and Rope, Wide Brim
Hat*. (A07, B03)

**55.** Scout (`classes.ts:111`) — set to `["Hunter Rifle", "Shortsword",
"1 Blood vial", "20 bullets", "Tool Belt", "Bandolier", "Pistol", "Cavalier
Hat"]`. Source [page 56]: *Hunter Rifle, Shortsword, Bloodvial (1), Bullets (20),
Toolbelt, Bandolier and Pistol, Cavalier Hat*. Three deltas: **Hunter Cleaver →
Shortsword `[BLOCKED-2]`**, bullets **18 → 20**, and **+ Cavalier Hat**.
Implement the bullet count and the hat now; hold the Cleaver→Shortsword swap
until BLOCKED-2 is answered. (A08, B03)

**56.** Stalker (`classes.ts:198`) — append **`"Cavalier Hat"`**. Source
[line 2826]. (A09, B03)

**57.** Deepcaller (`classes.ts:286`) — append **`"Cowl"`**. Source [line 3082]:
*Sickle, Dagger, Bloodvial (1), Toolbelt, Book of the Deepcaller and Deepcallers
Robe, Cowl*. (A10, B03)

**58.** Bloodbound (`classes.ts:374`) — append **`"Cowl"`**. Source [line 3587]:
*Greataxe, 2 Handaxes, Blood-drainer's Tools, Blood Vials (4), Tool Belt, Cowl*.
(A11, B03)

**59.** Warden (`classes.ts:462`) — append **`"Tricorn"`**. Source [line 3891],
nine items. (A12, B03)

### 3.4 Brute

**60.** `classes.ts:52` Fighting Style — replace *"Whenever you gain a **Fighter**
level"* with *"Whenever you gain a **Hunter Brute** level"* ([page 49]).
**Do NOT change** the Weapon Mastery text's *"certain Fighter levels"* — the
source itself says that on page 49; it is verbatim. (A07)

**61.** **Confirmed match — leave untouched.** Brute core traits (d10, Max Sanity
12, Sanity Die 2d6, STR+CON, 2 of 6 skills, Simple+Martial, no tools, L/M/H
armor, 30 ft), the full 20-row table, Superiority Die scaling (d8/d10/d12 gated
on `card.subclassId === "battle-master"` in `AppWeaponReference.tsx:28`), the
table-driven Weapon Mastery count in `CharacterAutomationProvider.tsx:160-169`,
and the Champion's Blood Tinge wiring. Two **deliberate source inconsistencies**
transcribed faithfully: Relentless says "1d8" though the die is d10 from level
10, and Weapon Mastery says "Fighter levels". **Do not "fix" either.** (A07)

**62.** Battle Master maneuvers exist only as two long text blobs
(`classes.ts:72-73`); no maneuver selection is modelled, and levels 7/10/15 read
"Subclass Feature" so nothing prompts a choice. Source [page 52]: learn three at
level 3, two more at 7, 10 and 15 (9 total). **Optional, design-preserving:**
split the 14 maneuvers into a `MANEUVERS` catalog in
`src/data/characterOptions.ts` (the file that already backs
`forbiddenRevelationOptions`) and have `recordedOptionsFor()` in
`upgradeModel.ts` return them for those rows, storing picks in the existing
`sheetAutomation.levelChoices` map. Reuses the Forbidden-Revelation pattern
exactly; **no new page, no new navigation.** If too large, leave as-is — the
rules text is fully visible in `AppClassAbilities`. (A07)

### 3.5 Scout

**63.** `classes.ts:138` Hunter's Mark — append the missing final sentence:
*"The mark also ends when you finish a Long Rest."* ([page 56]). (A08)

**64.** `classes.ts:162` Deepened Pact — replace **"Psychic"** with **"Mind"**.
[page 60]: *"either Mind, Bludgeoning or Piercing damage"*; the damage-type list
at [line 645] ends *"…Thunder, and Mind damage."* **"Psychic" does not appear
anywhere in the beta** and this is its only occurrence in `src/`. (A08)

**65.** `classes.ts:161` Hound of Tindalos stat block — three fixes from
[page 59]: Passive Perception **12 → 17**; replace the *"CR None (XP 0; PB equals
your Proficiency Bonus)"* line with the printed companion line *"Level
(companion; PB equals your Proficiency Bonus). Example at Scout 5 with Wisdom +3
and PB +3: AC 16, HP 30, Feral Strike +6, 2d6 + 5 damage"*; reword *"Grit Saving
Throw DC 16"* → *"DC 16 Constitution (Grit) check"*. Ability scores, AC 13 + Wis,
HP 5 + 5×level, Speed 40/Climb 40 and Feral Strike already match. (A08)

**66.** `classes.ts:173` Trained Pistol — add **", Close Range"** to the
properties ([page 60]: *Ammunition (Range 30/90; Bullet), Light, Close Range*).
The Trained Hunter's Rifle row already matches. (A08)

**67.** `classes.ts:177` Deathmark Shot — rewrite verbatim from [page 61]. Three
errors: the trigger is *"**Once per turn before** you make an Attack Roll"*, not
"After you hit"; the once-per-turn limit is absent; and the final sentence is
missing entirely — *"Other modifiers like Hunters Mark, Silver Bullet, Dexterity
or Critical Hit is only applied to one of the three instances of damage."*
Point-Blank Retort already matches. (A08)

**68.** Deepened Pact level conflict: the printed heading at [page 60] reads
**LEVEL 3**, but the class table at [page 57] lists "Subclass Feature" at level
**7**, and Beast Caller has no other level-7 feature. **Recommended: keep
`level: 7` and flag the source typo to Simon** rather than creating an empty
level-7 row that `upgradeFeatures()` would fill with the generic placeholder.
(A08)

**69.** **Confirmed match — leave untouched.** Scout core traits, the full 20-row
table with the Hunter's Mark column (4→20), Foe Slayer's d10 upgrade wiring at
`AppWeaponReference.tsx:24`, and the Expertise cadence (1 at level 2, 2 at level
9) in `CharacterAutomationProvider.tsx:153-159`. (A08)

### 3.6 Stalker

**70.** `classes.ts:229` level-3 feature text — replace *"the **Thief**
subclasses"* with *"the **Shadow** subclasses"*. The two Stalker subclasses are
Assassin and Shadow ([pages 64, 66]); no "Thief" exists in the beta. The
`subclasses[]` array (lines 242–268) is already correct. (A09)

**71.** **Confirmed match — leave untouched.** Stalker core traits (D8, Max
Sanity 12, Sanity Die 1d12, DEX+INT, 30 ft, Light armor, Thieves Tools, 2 of 9
skills), the full 20-row table including the Sneak Attack column (1d6 → 10d6),
Cunning Strike / Devious Strikes / Improved Cunning Strike / Evasion / Reliable
Talent / Elusive / Stroke of Luck, and both subclasses' features. The Expertise
2+2 split at `CharacterAutomationProvider.tsx:153-159` is deliberate and correct.
(A09)

### 3.7 Deepcaller, Rites, Whispers and the Zealot

**72.** `classes.ts` Deepcaller level-1 `Eldritch Comprehension`, final paragraph
— replace with the beta's two-tier rule from [page 71] "Break the Limits of Your
Mind": *"You may expend a Strain to perform a Rite from your Book **above** your
current Strain Level. If the Rite is **exactly one level higher**, immediately
after it is performed you gain Madness equal to your **Max Sanity**. If it is
**two or more levels higher**, you instead gain Madness equal to **twice your Max
Sanity**. The Rite otherwise uses its **printed level**."* Drop the editorial
*"This is not recommended."*, which is not in the source. (A10)

**73.** `classes.ts` — rewrite **both** the Deepcaller level-3 "The Hunter Zealot
Prestige Class" text and the Zealot's level-3 "Burn the Book" text. Both
currently say *"whenever you would gain a Hunter Deepcaller feature, you gain the
**corresponding** feature"*. The beta ([pages 71, 75]) says you *"retain the base
Deepcaller elements listed under Burn the Book and gain **only the Zealot
features explicitly listed for your level**"*, and adds *"**A level with no
listed Zealot feature grants no Prestige feature.**"* (A10)

**74.** `classes.ts` Zealot level-3 "Chosen of One Patron" — restore the source
wording *"You no longer require a Book of the Deepcaller to preform **certain
Rites**"* ([page 76]). The code says "Whispers", which makes the feature a no-op:
Whispers already never require the Book. (A10)

**75.** `classes.ts` Zealot level-3 "Zealot Whispers" — first sentence becomes
*"You **retain the ability to perform Whispers**."* ([page 76]); the code says
"You retain the Whispers you knew before entering this Prestige Class." (A10)

**76.** **Confirmed match — leave untouched.** Every row of the Deepcaller's
20-level table (Proficiency Bonus, Prepared Whispers 2/2/2/3…, Strains
2…5, Strain Level 1/1/2/2/3/3/4/4/5/5…5); Intelligence as the Rite Performing
ability; `riteDamageAtStrain` and `whisperDamageAtLevel` in
`characterOptions.ts:106-128` (every formula reproduces the printed progression
at all strain levels 1–5 and character levels 1–20); `forbiddenRevelationOptions`
at `:92-103`; and `AppDeepcallerReference.tsx:64`'s
`rite.level <= currentStrainLevel` gate, which is exactly the [page 70] Book
rule. (A10, A17)

**77.** Feature-name spellings: the beta prints **"Vailed Truth"** and
**"Fragments of a Eldritch Mind"**; the code silently corrects them to "Veiled
Truth" and "Fragments of an Eldritch Mind". **Recommend NO change** — level-up
choices may be keyed by feature name in `state.levelChoices`, and renaming would
orphan keys. Flagged so the choice is explicit. (A10)

**78.** Source inconsistency to flag to Simon, **not fix in code**: Call Lesser
Starborn is a **Level 6** rite but its upgrade line reads *"for each Strain level
above 5"*. The app shows the line verbatim in the "At higher level Strain" row,
which is the right handling. (A17)

### 3.8 Bloodbound

**79.** `classes.ts:377-398` — add the missing **`"Blood Frenzy Damage"`** column
to `progressionColumns` and to all 20 `progression[].extras` rows: **`"2"`** for
levels 1–8, **`"3"`** for 9–15, **`"4"`** for 16–20 ([page 81] features table).
The table has two numeric columns; the app models only one. The value flows to
the sheet through the existing `featureText()` extras rendering
(`characterAutomation.ts:73-76`). (A11)

**80.** `AppWeaponReference.tsx:27` — the Berserker branch tests
`card.subclassId === "berserker"`, but the catalog id is
**`"path-of-the-berserker"`** (`classes.ts:421`). **The branch is dead: no
Berserker hunter has ever seen the Frenzy damage row.** Fix the comparison, and
once item 79 lands, set `value` to `+${n}d6` from
`progression.extras["Blood Frenzy Damage"]` instead of the vague `"+d6s"`.
Check `"zealot"` on line 30 for the same class of id mismatch against
`hunter-zealot`. (A11)

**81.** `classes.ts:441` Blood-Drunk level-14 "One Form" / Rare Transformation —
three fixes from [page 85]: activation is **"As a Bonus Action"** (omitted
entirely); the cost is **"expend four uses of Blood Frenzy"**, not "spending 1
use"; and the Madness cost is **10**, not 6. (A11)

**82.** `classes.ts:434` — rename the subclass display name to **"Path of the
Blood-Drunk"** (hyphenated, per the authoritative heading at [line 3733]).
**Keep the `id` `path-of-the-blood-drunk` unchanged** — it is what
`card.subclassId` stores; changing it would strip every affected hunter's
subclass. (A11, B03)

**83.** `characterAutomation.ts:291` `structuredCardFromSheet()` clamps every
ability to `Math.max(3, Math.min(20, …))`. Raise the ceiling to **30**. Two
source rules break under a 20 clamp: Primal Champion ([page 83]) raises STR and
CON *"to a maximum of 25"*, and every Epic Boon ([pages 104–106]) raises a score
*"to a maximum of 30"*. Today a player who enters 24 STR has it silently
rewritten to 20 on the next sheet→structured sync. **The 20-cap belongs to the
individual feats, not to the card model.** Do **not** auto-apply Primal
Champion's +4 — that is a behavioural change, not a bug fix. Raised by A11 (25)
and A14 (30); **30 is correct** — it is the higher and the Epic Boons are the
binding case. (A11, A14)

**84.** **Confirmed match — leave untouched.** Bloodbound core traits, the whole
Blood Frenzy **uses** column (2/3/4/5/6), Brutal Strike scaling in
`AppWeaponReference.tsx:26` (1d10 from 9, 2d10 from 17), and the deliberate
duplicate "Improved Brutal Strike" at both level 13 and 17 — both the timeline
render (keyed `${level}-${name}-${index}`) and `upgradeModel.ts:37` disambiguate
by level. **Do not de-duplicate them.** No Bloodbound feature is a removal
candidate. (A11)

### 3.9 Warden — the most-changed class

**85.** `classes.ts` `warden.toolProficiencies: "—"` → **`"Navigator Tools"`**
([page 87] core traits). (A12)

**86.** `classes.ts` `warden.progression[0].features` — replace *"Bands
Directive, Feel Your Enemy, Tactical Command"* with **"Bands Directive, Sense
Your Enemy, Demoralize"** ([page 88] line 3929). (A12)

**87.** `classes.ts:491` — rename **"Feel Your Enemy" → "Sense Your Enemy"** and
replace the text with [page 88] lines 3951–3964: Bonus Action, creature within 30
ft, **you learn the creature's Level** (not its CR — drop the CR alternative
entirely). The Immunities/Resistances/Vulnerabilities knowledge is an **added**
rider with its own per-rest limit, restorable by expending one Bands Directive
die; the base Level-reading has **no stated per-rest limit**. Move the rest limit
onto the rider. (A12)

**88.** `classes.ts` — **add a level-1 `Demoralize` feature** ([page 88], right
column): choose a creature within 30 ft that can see or hear you; **Charisma
(Presence) check contested by its Wisdom (Insight) check; the target wins a
tie**; on success expend one use of Bands Directive and place your die on the
target, which becomes **Demoralized** until the end of your next turn; you cannot
use this without an available Bands Directive use; if you don't use the die to
affect the creature's ability check, you regain it when the condition ends.
`Demoralized` is covered by the condition catalog work in item 4. (A12)

**89.** `classes.ts` — **add `Tag Team` to the level-3 progression row and as a
level-3 feature** ([page 88] line 3931; [page 89] lines 4013–4018). Once per
Short or Long Rest, an **action** + one Bands Directive use coordinates an attack
with another Hunter within 30 ft who can see or hear you; that Hunter uses their
**Reaction**; both roll before either resolves; choose either **unmodified d20**
and use it for both, each adding their own modifiers; a chosen natural 1 makes
both miss, a natural 20 makes both Critical Hits; if at least one hits, roll your
Bands Directive die and add it to one attack's damage. Restore a use by expending
**two** Bands Directive dice (no action). (A12)

**90.** `classes.ts:489` Bands Directive — uses are **"Wisdom modifier x 2
(minimum of 1)"**, not "your Wisdom modifier, minimum of once" ([page 87] lines
3904–3908). (A12)

**91.** `classes.ts:497` Effectiveness (L5) — **x 2 → x 3** ([page 89]). (A12)

**92.** `classes.ts:502` Superior Effectiveness (L11) — **x 3 → x 4 (minimum of
1)** ([page 90]). (A12)

**93.** `classes.ts:498` Know Your Enemy (L7) — the feature now reveals **all of
that creature's Traits**, not its Immunities/Resistances/Vulnerabilities (which
moved down to the level-1 Sense Your Enemy rider). Once per Long Rest; restore by
expending one Bands Directive die ([page 89]). (A12)

**94.** `classes.ts:507` Presence of Power (L20) — **completely different effect**
([page 90]). Replace with: as an **action**, expend one Bands Directive die and
choose a creature within 30 ft that can see or hear you; it makes a **Wisdom
saving throw against DC 8 + your Wisdom modifier + your Proficiency Bonus**; on a
failure it is **Incapacitated until the start of your next turn**; on a success,
no effect; after resolving, the creature is **immune to your Presence of Power
for 24 hours**. The current text has no save, no DC and no immunity window. (A12)

**95.** `classes.ts:518` Commander — Master the Enemy (L14) — must name **both**
an ally other than yourself within 60 ft **and** an enemy you can see within 60
ft; the **first attack that ally makes against that enemy** before the start of
your next turn treats a natural d20 of **14–20 as a natural 20** ([page 91]). The
current text lets the ally's next attack against *anyone* crit. (A12)

**96.** `classes.ts:503` Expect Your Enemy (L13) — optional low-priority wording
refresh: *"first **Main Action**"* (code says "first action") and *"The GM"*
(code says "your DM") ([page 90]). Substantively already correct. (A12)

**97.** ⚠️ **`Tactical Command` and the 90-second Warden turn are no longer a
rule — but DO NOT remove the Play machinery without asking Simon.**
`grep -i "tactical command"` and the 90-second wording return **zero hits across
all of `docs/rules/`**, and the Warden's level-1 table lists no such feature.
**Minimum safe change now:** delete the `Tactical Command` feature from
`classes.ts:490` and its progression mention (already covered by item 86).
**Flag for Simon:** the `designatedWardenId` / `isWarden` plumbing
(`src/types.ts:215-216, 275-276`, `combatStore.ts` ×13 sites,
`turnTimer.ts:20,41`, `combatPresentation.ts:65-69`,
`SessionCombatSection.tsx:44`, `api/combat.ts:46,78`) exists solely to implement
it. B05 additionally found `designatedWardenId` is **write-only — no component
reads it** (`grep` across `src/**/*.tsx` returns zero hits), and the turn-timer
state is likewise vestigial (every write site sets `timerPhase: "idle"`, nothing
renders a countdown, and the only "90" hits in the rules are weapon ranges). That
makes removal safe *technically*, but CLAUDE.md says table tools are not dropped
merely because a topic is absent from the sources. **Confirmed deliberate
follow-up only.** (A12, B05)

**98.** **Confirmed match — leave untouched.** Warden core traits (D10, Max
Sanity 14, Sanity Die 4d4, WIS+CHA, 2 of 6 skills, L/M/H armor, Simple+Martial,
30 ft), all 20 proficiency-bonus and Directive-die cells (D6 / D8 at 5 / D10 at
10 / D12 at 15), the Expertise 2+2 special-case, and the Commander/Warbringer
subclass features including Rally's Temp HP formula. Only the L1 and L3
progression rows were wrong. (A12)

### 3.10 Backgrounds and feats

**99.** `src/data/backgrounds.ts` — four value fixes ([page 95]):
  - `noble.equipment: ["30 GP"]` → **`["50 GP"]`**
  - `cultist.tool: "Mason's Tools"` → **`"Cultist's Tools"`**
  - `weaponsmith.tool: "Tinker's Tools"` → **`"Smith's Tools"`**
  - `church-missionary.equipment: ["Brewer's Supplies", "Antitoxin"]` →
    **`["Antitoxin"]`**
  All three replacement tool strings already exist in `TOOL_PROFICIENCIES` /
  `TOOL_DETAILS`. Removing Brewer's Supplies also clears a silent starting-kit
  failure (it never resolved to a catalog id). (A13, A16, B03)

**100.** **Confirmed match — leave untouched.** All **14** background ids exist in
the beta with matching prose, ability triads, feats and skill pairs; none added,
none removed. Every `feat` value (Alert, Lucky, Tavern Brawler, Listener, Savage
Attacker, Tough, Skilled) still exists. All named equipment resolves to `ITEMS`
ids except the removed Brewer's Supplies. (A13, B03)

**101.** `src/data/feats.generated.json` — three data fixes:
  - `Heavily Armored.prerequisite` → **"Level 4+, Medium Armor Training, Strength
    13+"**, and append the missing **Load Bearer** benefit verbatim ([page 99]):
    *"When calculating carried weight, reduce the total weight of armor you wear
    by 10 lb., to a minimum of 0 lb. This does not change the armor's actual
    weight for any other rule."*
  - `Moderately Armored.prerequisite` → **"Level 4+, Light Armor Training,
    Strength or Dexterity 13+"**, and append the missing **Efficient Fit**
    paragraph verbatim ([page 100]).
  - `Skill Expert.description` — fix the typo **"Increase **on** ability score"**
    → **"one"** (the only typo across all 54 feat descriptions).
  (A13, A14, B03)

**102.** ⚠️ `src/data/feats.generated.json` — **`Resilient` can never be
completed; this is a blocking bug.** It has `abilityPoints: 1` but
`abilityOptions: []`, so `CharacterSheetUpgradeFeatPage.tsx:33` renders zero
selectors, `used` stays 0, and `upgradeModel.ts:99` `upgradeFeatureComplete`
requires the placed total to equal 1 — **a player who picks Resilient is
permanently stuck in the level-up flow.** Fix: set `abilityOptions` to
`["str","dex","con","int","wis","cha"]` ([page 101]: *"Choose one ability in
which you lack saving throw proficiency"*). (A14)

**103.** `src/data/feats.generated.json` is an **orphaned build artifact** — its
generator input (`resources/master.json`) is deleted and **no script emits it**
(`generate-codex-data.mjs` writes only `codex.generated.json`). Its content is
substantively correct against the beta. **Rename it to a hand-maintained
`feats.data.json`** (or inline into `feats.ts`), drop the "AUTO-GENERATED"
framing, and apply the edits above by hand. **Do not build a new feat generator**
— the two-column PDF-transcription layout is not reliably parseable (see the
Cultist Slayer entry, whose Ability Score Increase clause continues on the
previous page's right column). Do not leave a `.generated.json` in the tree with
no generator. (A13, A14, B03)

**104.** **Confirmed match — leave untouched.** All **54 feats** match the txt
name-for-name across all four categories (7 Origin / 29 General / 9 Fighting
Style / 9 Epic Boon), with no extras and no omissions. Non-obvious correct
implementations that must **not** be "simplified": Tough's `level * 2` HP,
Alert's PB-to-Initiative, Skilled's skills-**or**-tools split at
`characterAutomation.ts:222`, and Listener's extra whisper at
`CharacterAutomationProvider.tsx:187`. (A13, A14, B03)

---

# BATCH 4 — Derived logic and the guided builder

Areas: **character calculation (`src/lib`) · `characterAutomation` derived
fields · the guided builder's choice steps · upgrade / level-up model**

### 4.1 `src/lib/character.ts` — arithmetic fixes

**105.** ⚠️ `armorClass()` Studs threshold —
`const studBonus = studded >= 5 ? 2 : studded >= 1 ? 1 : 0;` becomes
**`studded >= 5 ? 2 : studded >= 3 ? 1 : 0`**. core-rulebook.txt [page 35]:
*"**If at least three** Add-on Armor pieces are studded, you gain +1 AC. If five
are studded, this bonus increases to +2 AC."* Also update the `studBonus` doc
comment at `:63` ("≥1 studded piece +1"). **Consequence:** every saved hunter
with 1–2 studded add-ons loses 1 AC, and a lower base armor AC can flip the Dex
category (13 → 12 moves Medium → Light), so the AC change may exceed 1. Raised by
A05, A06, B02, B03. (A05, A06, B02, B03)

**106.** `wornArmorWeight()` — `studdedAddonIdsOf(card).length * 3` →
**`* 5`** ([page 35]). (A05, A06, B02, B03)

**107.** `characterAutomation.ts` `passivePerception` — apply the **Expertise**
multiplier. Currently `10 + WIS mod + (allSkills.has("Perception") ? prof : 0) +
passiveModifier`; the source ([page 43]) says *"**Include all modifiers that
apply to your Wisdom (Perception) checks.**"* Reuse the same multiplier the skill
rows already use: `expertise.has("Perception") ? prof * 2 : prof`. Mirror the
doubled value in the `passive` breakdown row in `CharacterSheetDerivedStat.tsx`.
Note A01 flagged this as unsettled from pages 1–16; **A06's page-43 citation
settles it — apply the doubling.** (A01, A06)

**108.** `characterAutomation.ts:174` `speed` — currently
`klass.speedFt + speedModifier`. Add three missing terms, each with its own
`reasons` string, following the existing Tough/Alert one-line pattern:
  a. **Roving** — `+10` when `klass.id === "scout" && level >= 6` and the
     equipped main armor is not Heavy ([page 58]). Armor category is already
     available via `armorClassFor(card)`.
  b. **Speedy** feat `+10`, **Boon of Speed** `+30` ([pages 103, 106]).
     `featNames` is already built at line 136 and used for Tough/Alert/Listener.
  c. **Carry condition** — add
     `carryCondition(card.abilities.str, totalCarriedWeight(card)).speedDelta`
     ([page 40]: Featherweight +5 ft, Encumbered −10 ft, Heavily Encumbered
     −20 ft). `src/lib/inventory.ts:81-118` already computes `speedDelta` and
     **nothing uses it**. Add one row `[condition.label, speedDelta]` to the
     `kind === "speed"` breakdown array in `CharacterSheetDerivedStat.tsx`.
  **Double-count warning:** players who compensated by hand have `speedModifier`
  set; see item 137. (A08, A14, B02)

**109.** `characterAutomation.ts:199-207` — derive save proficiency as
`klass.savingThrows` **plus**, for `classId === "stalker" && level >= 15`, `wis`
and `cha`. **Slippery Mind** ([page 65]): *"You gain proficiency in Wisdom and
Charisma saving throws."* Reuse the existing `reasons` mechanism so the sheet's
why-tooltip explains it. (A09)

**110.** `src/lib/character.ts` — add `isBloodied(currentHp, maxHp)` =
`currentHp <= Math.floor(maxHp / 2)` ([page 29]: *"equal to or less than half its
Hit Point maximum, rounded down"*) and use it to flag the existing HP display on
the character sheet and the play-mode hunter cards. **No new field, no new UI
block.** The Brute's Feral Rally already references it in prose. (A04)

**111.** `src/lib/character.ts` `normalizeCard()` — normalize
`activeTransformations` to **unique** ids. [page 26]: *"Active Transformations do
not stack with themselves. If you roll one you already have, suffer 2 Madness."*
De-duplicate on write in `AppEditStage.tsx` too. Dropping a duplicate **is** the
rule, so no data is lost. (A04)

**112.** Add a comment in `src/lib/character.ts` `maxHp()` citing
core-rulebook.txt [page 46] "Fixed Hit Points by Class". `dieAverage(die) =
floor(die/2)+1` currently coincides exactly with the printed table for all six
classes (d12→7, d10→6, d8→5, d6→4), but the source now states it as a **fixed
table keyed by class**, so a future class could silently diverge. Values are
correct today — **do not change the formula.** (A06, B05)

**113.** **Confirmed match — leave untouched.** `INSIGHT_BY_LEVEL` in
`src/lib/insight.ts` (all 20 values byte-identical to [page 46]);
`proficiencyBonus()` (+2/+3/+4/+5/+6 bands); `maxHp()` level-1 and per-level
values; `maxSanity()` including the Deepcaller's 26 cap; `carryCondition()`'s
Strength ×2/×5/×10/×15 thresholds; `computeSlots()` and `BASE_SLOTS`;
`maxAddonPieces()`, `hasShieldArm()`, `addonAcBonus()`, `dedupeExtras()`;
`levelAdjustedPool()`'s clamp-on-decrease branch; `insightAwardPatch()` never
spending Insight; and `acCategory()`'s four bands with their Dex rules. All
independently verified by two or more findings. (A01, A05, A06, B01, B02, B05)

**114.** `src/lib/inventory.ts` — the `Encumbered` note is short one clause.
[page 40]: *"Your speed is reduced by 10 feet. **You have Disadvantage on
Dexterity (Acrobatics and Stealth) checks and Dexterity saving throws.**"*
One-string fix; all five thresholds and both speed deltas are already correct.
(B02, B05)

**115.** `src/features/hunter/lib/deriveSheetFromCard.ts` — the legacy fallback
recomputes a subset independently of `automationFor()` and **disagrees with it**:
passive perception ignores Expertise *and* `passivePerceptionModifier`; `hpMax`
omits Tough / Boon of Fortitude; `speed` omits `speedModifier`; `ac` omits
`acModifier`; `hdCur` is hard-set to `level` instead of reading `sheet.hdCur`;
`hdSpent` is never emitted; and `madness`, armor-category extras, `tools`,
`weight`/`weightCondition`, `wepSimple`/`wepMartial` and the whole equipment
table are absent. A legacy hunter's printed sheet therefore shows different
numbers from the same hunter's app sheet. **Fix:** replace the body with
`calculatedSheetFields(card)`, keeping only the genuinely legacy-specific puts
(class/subclass name resolution). If that is too large, the minimum is applying
the same Expertise multiplier and the four custom modifiers so the two
projections agree. (B02)

**116.** `AppEditStage.tsx:62-63` — a Constitution increase taken through a
**feat** (no level change) raises `hpMax` while leaving `currentHp` where it was,
because `levelAdjustedPool(...)` only tops up when `levelIncreased` is true.
[page 46]: *"When your Constitution modifier increases by 1, your Hit Point
maximum increases by 1 for each level you have attained."* Pass the refill
condition as `bounded > model.card.level || nextHpMax > currentHpMax`, and rename
`levelUpVitals.ts`'s `levelIncreased` parameter to `maximumShouldRefill`.
**Fix forward only** — no backfill is safe, since a low `currentHp` may be real
damage. (A06)

**117.** `AppEditStage.tsx:55-70` — add `madness += 2` on level-up when
`classId === "deepcaller"`. **Fracturing Mind** ([line ~3189]): *"Every time you
level up suffer 2 Madness."* Only the +1 Max Sanity half is applied today. It
surfaces automatically in the existing "Madness" review row (`:151`).
**Do NOT retroactively backfill Madness for existing Deepcallers** — that would
penalise past play. Forward only. (A03)

### 4.2 Advisory / reference-only warnings (existing components, one line each)

**118.** Heavy-armor Strength requirements ([page 40]): add a non-blocking
advisory line to the existing `CharacterSheetArmorRules.tsx` "Armor Class"
article **and** the `kind === "ac"` breakdown rows in
`CharacterSheetDerivedStat.tsx` when `armor.baseArmorAc >= 16 && str < 13` or
`>= 17 && str < 15`. The source states a requirement with **no penalty**, so do
**not** block equipping and do **not** change the AC formula. (A05, A06)

**119.** Heavy-weapon ability gate ([page 109]): same treatment — a warning line
on the weapon in the gear section when the wielder's STR (melee) or DEX (ranged)
is under 13. **Do not auto-apply Disadvantage** — the app does not roll attacks.
(A15)

**120.** `characterAutomation.ts:222` — extend the `tools` field's existing
`reasons` string with the [page 12] rule: *"A tool proficiency adds your
Proficiency Bonus to checks with that tool; when a skill also applies, add it
once and roll with Advantage."* Surfaces in the existing "why" affordance with no
new UI. (A01)

**121.** `characterAutomation.ts:266` — extend the `bloodTinge` `reason` string /
the checkbox `note` with the trigger from [page 44]: *"Gained once per round when
damage leaves you at 1–9 HP; lost on a Long Rest."* **Do not add a counter** —
the source caps it at one. (A04, A06, B05)

**122.** `AppWeaponReference.tsx` `bonusesFor()` — add two rows to the existing
"Potential damage bonuses" panel, same markup:
  - **Blood-Tensed** (unconditional for every hunter): `"×3 weapon dice"` —
    *"Main Action. Your next melee hit rolls normal weapon dice three times (four
    with chosen Disadvantage); modifiers added once."* ([page 16], [page 22])
  - **Off-hand Attack**, shown when the hunter's equipped weapons include two
    different **Light** melee weapons: [page 17] — *"Do not add a positive
    ability modifier to its damage."* The Light/Thrown properties needed already
    exist in `WEAPON_FACTS`.
  (A02)

**123.** `characterAutomation.ts` — emit two derived read-only values in the
existing weapons block and show them as two `character-sheet-resource` rows in
the existing "Character sheet values" group of `CharacterSheetResources.tsx`,
next to the Rite rows: `meleeAttack` = `formatModifier(abilityModifier(str) +
prof)` and `rangedAttack` = `formatModifier(abilityModifier(dex) + prof)`
([page 43]). Per-weapon derivation is out of scope (weapon properties override).
(A06)

### 4.3 Guided builder choice steps

**124.** `CharacterAutomationProvider.tsx:174-182` — replace the hard-coded
Stalker allowlist `finesseOrLightIds = {shortsword, scimitar, sickle, handaxe,
dagger, pistol}` with a **derived** filter: keep an item when
`WEAPON_FACTS[id].category === "Simple"`, or when it is Martial and
`properties` matches `/Finesse|Light/`. Depends on item 24. Two errors today: it
**omits every non-Finesse/Light Simple weapon** (Club, Greatclub, Javelin, Light
Hammer, Mace, Spear, Throwing Knife), which the Stalker **is** proficient with
([page 63]), and it **wrongly includes Pistol**, a Martial Ranged weapon with
neither property. (A09, A15, B01)

**125.** `CharacterAutomationProvider.tsx:161-178` — replace the hard-coded
9-id `meleeWeaponIds` with `WEAPON_FACTS[id].attack === "Melee"`. The Bloodbound
may master **any** Simple or Martial melee weapon (24 of 29 rows, [page 87]).
Depends on item 24. (B01)

**126.** `CharacterSheetWeaponMasteryChoices.tsx:295` — the retraining helper
says *"Your class lets you retrain mastery choices after a Long Rest."* The
Bloodbound's rule is *"change **one** of those weapon choices"* ([page 87]),
while the Brute/Scout/Stalker wording is *"change the kinds of weapons you
chose"*. One line keyed off `klass.id`, fitting the existing `ChoiceIntro` `help`
prop. **No layout change.** (B01)

**127.** `CharacterAutomationProvider.tsx:169` — remove `hunter-cleaver` from
`meleeWeaponIds` so it stops appearing as a mastery option (a weapon with
mastery `"—"` can never be mastered). **`[BLOCKED-2]`** for the catalog row
itself. (B01)

**128.** ⚠️ **A Deepcaller can never enter the Hunter Zealot Prestige Class
through the builder.** `classes.ts:290` sets `subclassOptional: true`, so
`characterAutomation.ts:153` never sets `pending.subclass`, so
`CharacterSheetUpgrade.tsx:86-87` generates **no subclass step at all**; the
level-3 row falls through to a read-only prose page because `RECORDED_CHOICE`
doesn't match it. `CharacterSheetHunter.tsx` shows "Choose during upgrade" for a
choice that never happens. The rules ([pages 70–71]) grant the opt-in at level 3.
**Fix:** keep `subclassOptional` (it correctly stops the flow from *forcing* the
choice) but make `choicePages.subclass` in `CharacterSheetUpgrade.tsx:87` also
true when `klass.subclassOptional && target >= 3 && !card.subclassId`. The
existing `kind === "subclass"` page already renders a `Choose...` empty option,
so leaving it unselected keeps the hunter a plain Deepcaller. **No new
component.** (B01)

**129.** Zealot Whisper preparation ([pages 76–77]) — three omissions, all
fitting the existing `ChoiceToggle` list with **no new page**:
  a. `whisperLimit` (`CharacterAutomationProvider.tsx:181-186`) and `allowed`
     (`characterAutomation.ts:256`) — add **+1** when
     `card.subclassId === "hunter-zealot" && card.level >= 3`.
  b. `CharacterSheetUpgradeChoices.tsx:222` — append
     `DEEPCALLER_RITES.filter(r => r.level === 1)` to the option list for a
     level-3+ Zealot, labelled "Zealot Whisper".
  c. Force-include **Eldritch Strike** and **Armor of The Drowned Star** as
     pre-checked, disabled rows that **do not count** against the limit.
  **Consumer widening required:** `AppDeepcallerReference.tsx`'s prepared lookup
  (`DEEPCALLER_WHISPERS.find`) must also search Rites, or those entries silently
  vanish. `preparedWhispers` is already a plain id list, so no schema change.
  (A10, A17, B01)

**130.** Copy-only corrections in the builder, each one string:
  a. `CharacterSheetUpgrade.tsx:64` — the HP change row reason *"Class hit die +
     Constitution + feats"* → **"Fixed class value + Constitution + feats"**.
     [page 46] uses a fixed table; the Hit Die is only the Short Rest spend die.
     (The computation is already correct.) (B01)
  b. `CharacterSheetUpgrade.tsx:157-159` `CreationEquipment` intro — add one
     sentence noting that an unarmored hunter still wears their **Background
     Garments** (layer 1 of the five-layer table at [page 33]). Layers 2–5 are
     already present and in the right order; the AC base of `10 + DEX` already
     equals the unarmored value, so **no calculation changes**. (A05, B01)
  c. `CharacterSheetProgress.tsx` pending-upgrade button `small` copy, and/or the
     "Automatic changes" step intro — note the Long Rest gate: [page 46] *"you
     reach the corresponding level **only after a Long Rest**."* **Do NOT gate
     the button or add a rest tracker** — the app has no Long Rest state and
     enforcing would strand players. (A06, B01, B05)
  d. `CharacterSheetArmorRules.tsx` — optionally add one `<article>` to the
     existing rule list summarising the five-layer order from [page 33].
     (A05)

**131.** `AppAbilitiesSection.tsx:54` — the alternative-buy button label.
**`[BLOCKED-4]`** — do not change until Simon answers. **Whatever he answers,
the stored `abilityMode` value stays `"maduhausu"`** and the `MADUHAUSU_*`
constant names stay; only the display string may change. (A05, B01, B07)

**132.** No prerequisite is enforced when choosing a feat at level-up
(`upgradeModel.ts:64-69` returns the entire `GENERAL_FEATS` array). [page 96]:
*"To take a feat, you must meet any prerequisite in its description."*
**Optional, design-preserving:** filter `featOptionsFor` on the parseable parts —
`Level N+` against `earnedLevel(card)`, `<Ability> 13+` and `<Ability> or
<Ability> 13+` against `card.abilities`, armor tiers against
`klass.armorTraining`, Shield Arm against `armorClassFor(card).shieldArm`. Keep
the single `<select>`; **no layout change**. **Do not retroactively strip feats
an existing hunter does not qualify for** — the DM's rulings stand. (A14)

**133.** Feats granting proficiency / Expertise / AC (Keen Mind, Observant, Skill
Expert, Martial Weapon Training, Medium Armor Master, Defense, Heavily/Moderately
Armored) still require a manual note; only Tough, Boon of Fortitude, Alert,
Skilled and Listener are mechanised. **Recommend a separate follow-up**, not this
pass — the feat text is displayed and the DM can set the existing `acModifier` /
`expertiseSkills` overrides. If pursued, gate each on `featNames` in
`automationFor` in the same one-line style, keeping the reason strings naming the
feat. (A14)

**134.** **Confirmed match — leave untouched.** The builder's step list
(`CharacterSheetUpgrade.tsx:95-110`); both point-buy tables; the background
+2/+1-or-+1/+1/+1 step with its cap guard; all six classes' step data; the
Expertise per-class asymmetry and its already-proficient-only restriction; the
six Whispers and their derived meta line; the Forbidden Revelation recorded-choice
page (and its single free-text fallback, which is honest and should stay); and
`levelAdjustedPool`. The builder presents **no step the beta dropped** — no
ancestry, alignment, deity or roll-for-stats page exists. (B01)

**135.** `characterAutomation.ts:34-40` `SOURCE` — replace the five strings that
disclaim *"outside the current four-document source set"*. They are **user-
visible** on five panels via `AutoReason`, and they are now factually wrong:
classes ([pages 47–100]), backgrounds ([page 93]), armor ([pages 34–41]) and
equipment/weight/slots ([pages 40–41]) are all **inside** the source. Replace
with plain citations ("C&S Core Rulebook, Armor Part 1–2", "C&S Core Rulebook,
Create Your Character"). Same call sites, same rendering. (B02)

**136.** `src/data/abilities.ts:71-72` — replace the stale comment *"The
replacement source set names Modifier fields but does not define a modifier
formula."* with a citation of core-rulebook.txt [page 8] / [page 32] "Ability
Scores and Modifiers". `floor((score − 10) / 2)` reproduces every printed row
exactly. **No logic change.** Same for `src/lib/character.ts:52`'s initiative
comment ("in the established Hunter model" → [page 15]) and `:118`. (A01, A05,
B07)

---

# BATCH 5 — Sheet surfaces, conditions & sanity, play/game, and user-visible copy

Areas: **character sheet panels · conditions / sanity / transformation ·
play & game surfaces · marketing and manifest copy**

### 5.1 Conditions, transformation and sanity

**137.** `src/data/transformations.ts` (new) — add the **Transformation Table**
from core-rulebook.txt [page 27] lines 1275–1338 as `TRANSFORMATION_TABLE:
string[][]` (20 d20 rows × 10 level columns), following the existing catalog
pattern of `src/data/conditions.ts`. Use the camelCase id convention already
established by `src/dev/preview.ts:284` (`"dreadbloodEars"`). Feed it into the
existing "Transformations" section of `CharacterSheetResources.tsx` so a rolled
result can be picked from the correct column rather than typed as a raw key.
(A04)

**138.** In the same file, add the **seven transformation effects** from
[page 28] as `{ id, name, madnessOnGain, text }`: Nothing Happens (0);
Dreadblood ears (2); Dreadblood eyes (2); Dreadblood speed (1); Blood fangs (3);
Mutated arm (4); Blood lust (not an active Transformation — a compulsion);
Dreadlord connection (6). Then in `CharacterSheetResources.tsx:35-41`, look the
id up for the display name and body instead of rendering the raw string as
`<b>{entry}</b>` (which today prints the literal `dreadbloodEars`), **falling
back to the raw string for unknown legacy values**. Existing layout unchanged.
🔒 **`LOST` must NOT be given effect text** in `src/data/**` — [page 28]: *"This
hidden effect can only be found in the Hidden Condition Sheet."* At most show the
name with "Ask your GM." (A04)

**139.** When `transformationLevel` is staged **upward**, show the new level's
table column inline in the existing Transformations section so the player can
record the rolled result — **one roll at the final level** if several levels are
gained at once ([page 26]). Depends on item 137. (A04)

**140.** `CharacterSheetResources.tsx:36` — optionally add the three named
reduction triggers as the control's `note`: *"Short Rest −1 (DC 13 CON (Grit) for
−1 more); Long Rest → 0; first Unconscious −2."* ([page 26]). The generic
"reducing clears actives" behaviour in `AppEditStage.tsx:86-87` is **already
correct — leave it**. The Unconscious once-per-rest lockout would need a flag if
automated; not worth adding while rests are manual. (A04)

**141.** ⚠️ **Current Sanity → Madness inversion. `[BLOCKED-1]` — implement
NOTHING here until Simon answers.** When unblocked, this is **one change
implemented once**, touching three surfaces:
  a. `CharacterSheetSanity.tsx` — drop the "Sanity" stepper and `stage.stageSanity`;
     the headline becomes `Madness {madness} / {sanityMax} Max Sanity`; the
     `insane` checkbox (`:19`) becomes a **read-only derived state row** in the
     identical `character-sheet-status-toggle` markup (`disabled`,
     `checked={madness >= sanityMax}`), note changed to *"Automatic when Madness
     reaches your Max Sanity."*
  b. `CharacterSheetHome.tsx:104` — fill the same bar with `madness / sanityMax`;
     the `<small> · Madness {n}</small>` becomes the primary `<em>`.
  c. `StatusPage.tsx` `VitalsCard` (lines 94–96, 120–122) — `value={card.madness
     ?? 0}`, `max={sanMax}`, `label="Madness"`, drop the `sub` prop. Optionally
     append `· Insane` to the status line when `madness >= sanMax`.
  Plus: stop writing `sanityCur` from `characterAutomation.ts:162` and
  `deriveSheetFromCard.ts:66`; remove the "Current sanity" review row and the
  `sanity` rescaling branch from `AppEditStage.tsx:60-68,124,149` (**Madness must
  NOT be refilled on level-up** — only the maximum moves); set `insane` from
  automation alongside `sanityMax` at `:161`. **Same layout, same icon, same
  route, same styling.** If Simon says the printed sheet must keep its CURRENT
  box, keep emitting `sanityCur` for the paper layout only and stop offering it
  as an editable value. `legacyMigration.ts:210` is also blocked on this.
  (A03, A06, B01, B02-1, B06-1)

**142.** `CharacterSheetSanity.tsx` — add one `<small>` note under the derived
Insane state for **Cracked Perception** ([page 23]): *"While Insane, you have
Advantage on Wisdom (Perception) checks and Intelligence (Eldritch Knowledge)
checks made to notice unnatural things, hidden entities, dream-architecture,
impossible movement, or occult distortions."* The panel already uses `<small>`
notes. `[BLOCKED-1]` for the derived-Insane dependency. (A03)

**143.** Add the **Insane Quirk table** ([page 24] lines 1114–1166, d100, 12
entries: 01–10 Bound Shadow · 11–18 Burden Hunger · 19–28 Compulsive Falsehood ·
29–36 Paranoid Contrarian · 37–48 Gallows Mirth · 49–54 Voiceless · 55–64
One-Word Mind · 65–69 Compulsive Obedience · 70–81 Predatory Urge · 82–91 Sir
Deadly Blade of the Night · 92–95 Ruined Presence · 96–100 Blood Revulsion) as a
data catalog in `src/data/`, surfaced in two places that already exist: a Codex
topic (item 5), and an optional note row on the existing Sanity panel when the
derived Insane state is on, driven by `insaneQuirkId` (item 21).
⚠️ **Do NOT auto-apply Ruined Presence's −5** — the source explicitly says it
*"does **not** change your Charisma modifier for class features, Rite statistics,
resource maximums, or other derived values."* Clear the quirk whenever Madness
drops below Max Sanity. `[BLOCKED-1]`. (A03)

**144.** `CharacterSheetResources.tsx` — add the new tracked resources from item
21 as `CharacterSheetResourceControl` entries in the **existing Recovery group**
and the **existing "Battle states" grid**, using the same component and the same
grid. No new panel:
  - **Sleepless Counters** (Recovery) — [page 21]: 1 per hour outside a rest;
    Short Rest −6; Long Rest → 0; at **24** you gain the Sleepless condition and
    suffer 1d4 Madness, again at 30/36/42 and every further multiple of 6; ends
    below 24.
  - **Exhaustion** (Recovery) — [page 21]: level increases by 1 each gain;
    subtract twice your level from every D20 Test; every Speed −5 ft per level;
    death at 6; Long Rest removes 1.
  - **Not Tonight! held** (Battle states, next to Blood Tinge) — written the same
    way Blood Tinge is (`model.setFields({ notTonight }, { notTonight })`).
  - **Favors** (`min={0} max={2}`) — [page 45]: *"Record your Favors on your
    Character Sheet."*
  (A03, A04, A06, B02)

**145.** `CharacterSheetResources.tsx` "Recovery" — add a **"Finish a Long Rest"**
action that stages the outcomes the sheet already models
(`transformationLevel: 0`, `activeTransformations: []`, `bloodTinge: false`,
`sleeplessCounter: 0`, `exhaustion − 1`) and prompts for the **Sanity Die roll +
WIS modifier** to subtract from `madness`, floored at 0 ([page 25], [page 42]
lines 1979–1984; `src/data/armor.ts:242`'s Robe *"+2 to your Sanity Die roll"*
depends on this existing). **No new screen** — an action on the existing Recovery
control. `[BLOCKED-1]` for the Madness half. (A03, A04)

**146.** In the existing death flow that sets `deathPending`, offer **"Expend a
Favor"** when `favors > 0` ([pages 44–45]). Expending it: decrement `favors`,
clear `dsS1–3`/`dsF1–3`, and set `insight` to `INSIGHT_BY_LEVEL[card.level]`
(`src/lib/insight.ts` already holds the exact table) while **leaving `level`
untouched** — *"You never lose a Level from expending a Favor."* (A06, B05)

**147.** `charactersStore.recoverCharacter()` is the app's de-facto Favor return
path and currently restores the card **verbatim**, keeping an `insight` total the
rules say must drop. Apply the same reduction: `insight = INSIGHT_BY_LEVEL[card.level]`.
Two-line change reusing `insight.ts`. Also: `killCharacter()` auto-loots the whole
inventory, which contradicts the Favor path (gear vanishes *with* the body and
returns *with* the Hunter) — a recovered hunter today comes back fully equipped
**while their gear also sits in the loot feed as a duplicate**. Minimal fix: keep
the drop as the default no-Favor death, but have `recover()` clear the
corresponding loot pile, or gate the drop behind a DM choice. **Forward only** —
already-recovered records are not marked and cannot be retro-fixed. (B05)

**148.** `CharacterSheetHealth.tsx:12-17` — extend the Temporary HP note. It says
only *"Temporary HP sits above your normal HP."*; [page 10] adds that temp HP is
**lost before HP, cannot be restored, does not stack**, and ends when depleted.
One string. (A01)

**149.** Exhaustion as a stacking level in the combat tracker: `Combatant`
models conditions as a boolean set (`conditions: string[]`), which cannot express
a level. Minimal fitting options: add an optional `conditionLevel?: Record<string,
number>` and let the existing condition chip in `BattleCombatantRow` step a level
for `exhaustion` only, **or** (smaller) expose six ids `exhaustion-1..6`. Either
way **no new panel or layout**. New field on combatant docs only; absent = level
1 when present. (A03)

**150.** Add "Concentrating" to the condition list so a DM can mark a Readied
Rite's concentration ([page 16]). Nothing further — a full Rite-resource engine is
out of scope. (A02)

**151.** Cover as chips: optionally add **"Half cover (+2)"**, **"Three-quarters
cover (+5)"** and **"Total cover"** ([page 19]) as three entries a DM can chip
onto a combatant, rather than nudging AC by hand via `changeArmorClass(delta)`.
**Keep them out of the generated condition list** (item 4) — add them as an
explicit small constant next to `CONDITIONS`. (A02)

### 5.2 Rest, location and play copy

**152.** `src/features/play/lib/phase.ts` — correct the location model's copy
(**keep all three ids and the existing control**; the Lodge is a legitimate named
Safe Zone, but it is **not a superior third tier**). [page 25]: *"A Safe Zone is
a protected location designated by the GM. **The Hunter's Lodge is always a Safe
Zone.**"*
  - `safe` → *"Safe Zone — spend Hit Point Dice on a Short Rest; a Long Rest
    restores all HP and all Hit Point Dice."*
  - `lodge` → *"Hunters Lodge — always a Safe Zone; same rest benefits."*
  - `wild` → *"Outside a Safe Zone — no Hit Point Dice, and a Long Rest restores
    only half your HP maximum."*
  Also correct the now-wrong `GameLocation` doc comment at `src/types.ts:200-202`.
  `StatusPage.tsx:50-51` reads the map and needs **no edit**. (A04, A06, B05,
  B06-3)

**153.** `phase.ts:6` `short_rest` hint — *"A breather: spend Hit Dice, regain
some uses."* states the **conditional** benefit and omits both unconditional
ones. [page 25]: 1 hour; **remove 1 Transformation Level**; **reduce Sleepless
Counters by 6**; *in a Safe Zone* spend up to your **Proficiency Bonus** in Hit
Point Dice (roll + CON, min 1). Rewrite accordingly. (A04, A06, B05)

**154.** `phase.ts:7` `long_rest` hint — *"Full rest: restore HP and reset
resources."* → [page 25]: *"8 hours. Transformation to 0, Sleepless to 0,
Exhaustion −1, reduce Madness by Sanity Die + WIS; unspent Blood Tinge is lost."*
(A04, B05)

**155.** `PHASES` and `LOCATIONS` are **exported but their `hint` strings render
nowhere** — only the derived `PHASE_LABEL` / `LOCATION_LABEL` maps are imported.
`knip` may flag them. Fix the hints as above, **and tell Simon** that the Play
phase picker they were written for is gone, rather than silently deleting the
text. (B05)

**156.** ⚠️ `BattleCombatantRow.tsx` `setDamage()` clamps damage with
`Math.min(vitals.maxHp, …)`, **destroying the number Instant Death depends on**:
a Hunter at 10 HP taking 55 damage records "10 damage" and 0 HP, so the DM cannot
see that the remaining 45 ≥ HP max ([page 21]: *"you die immediately if the
remaining damage equals or exceeds your Hit Point maximum"*). **Fix:** keep the
display clamp but stop clamping the stored value — allow `currentHp` to go
negative; `healthPercent` already clamps at 0% via its own `Math.max(0, …)`.
(B05)

**157.** `combatPresentation.ts` `combatVitals` — include the hunter's derived
`speed` in the combatant row's stat line so the DM can see it while adjudicating
movement ([page 18]). **Do not build a movement tracker** — there is no grid or
map surface to hang one on. Derive at read time; **do not denormalize onto
combatant docs**. (A02)

**158.** Action economy (Main / Bonus / Reaction) tracking — **two findings
disagree.** A02 proposes three booleans on `Combatant` rendered as pips in
`battle-card-body`; B05 says the omission is a deliberate table-tool scope
decision and CLAUDE.md forbids redesigning established screens because a topic
exists in the source. **B05 is the safer reading given the hard design
constraint. Recommend: no change; ask Simon if he wants it.** Recorded so it is
not mistaken for an oversight. (A02, B05)

**159.** Surprise → Initiative with Disadvantage ([page 15], [page 21], [page
26]) and **Delay** ([page 15]) are unimplemented. A01/A02 propose a `surprised`
checkbox in `StartBattleDialog` feeding `Math.min(rollD20(), rollD20()) + dexMod`,
and a "Delay" entry in the existing per-row `battle-more-menu`. B05 notes the DM
can already overwrite any rolled initiative and calls new UI out of the
design-preserving remit. **Recommend: no change; ask Simon.** If ever
implemented, reuse a single `rollD20({ advantage, disadvantage })` helper that
implements the [page 10] cancel rule — Advantage and Disadvantage do **not**
stack and cancel each other. (A01, A02, B05)

**160.** Initiative ties — [page 15]: *"If players tie, they decide their order.
The GM decides ties between monsters…"* The alphabetical fallback in
`initiativeOrder()` is a display-order convenience and the per-row
`changeInitiative(±1)` control already enacts a table decision. **All three
findings that raised it (A01, A02, B05) recommend NO change.** Optionally switch
the tiebreak to `a.createdAt - b.createdAt` so a stated order is not reshuffled
by name. (A01, A02, B05)

**161.** `HunterCard.deathPending` has **readers but no writer** — three paths set
it to `false`, `StatusPage.tsx:97` reads it, and **nothing anywhere sets it
`true`**. It is not a rule in the beta. **Fix:** keep `StatusPage`'s `hp <= 0`
fallback, delete the `card.deathPending ||` term and the field from `types.ts`,
and drop `charactersStore.revive()` (whose only job is clearing it).
`recoverCharacter()`'s `deathPending: false` becomes a no-op to delete with it.
Note this conflicts with item 146, which hooks the Favor prompt into "the existing
death flow that sets `deathPending`" — **resolve by hooking the Favor prompt to
the DM death confirmation instead.** (B05)

**162.** `src/api/players.ts` `awardInsight` doc comment — *"Atomically award
Insight and **immediately apply every earned level**"* is stale;
`insightAwardPatch` returns `{ insight }` only. Fix the comment. (B05)

**163.** **Deliberately NOT implemented — record, do not build:**
  - The **Insight catch-up bonus** ([page 46]: double Insight when more than half
    the Band is at a higher Level; +half rounded up when more than half have more
    total Insight, capped at the lowest total in that majority). It needs every
    Band member's level and Insight, which only the campaign/party layer has.
    `charactersStore.party` holds it, so the minimal future form is a pure helper
    `(party, targetId, delta) → multiplier` inside `awardInsight`. **Do not
    implement unasked.** (A06, B05)
  - **Creature Types** ([page 29]) — do not add a type field to `HunterCard`.
    Player Hunters are always Human by default. (A04)
  - **Creature size** ([page 18]) — only worth an optional `size` field on enemy
    templates if the bestiary states sizes; the bestiary is not among the beta
    sources. (A02)
  - **Enemy stat model** — `{ name, initiative, ac, maxHp, note, revealHp,
    revealStats }` is GM bookkeeping, not rules. The rulebook defers creature
    statistics to the Bestiary. **Keep; do not derive enemy stats from the
    sources.** (B05)
  - **Refuse the Bleeding / Action Surge / Hunter's Mark use trackers** — the
    numbers are already correct in the progression tables; only live tracking is
    absent, and it is a pre-existing gap the beta neither creates nor closes.
    If ever wanted, generalise the existing caster-only `strainMax`/`strainCur`
    block into `<col>Max`/`<col>Cur` for any countable `progressionColumns`
    resource, rendered in the existing "Character sheet values" group. (A07, A08)

### 5.3 Character sheet panels

**164.** `CharacterSheetArmorRules.tsx:17` — replace *"One studded Add-on grants
+1 AC; five grant +2 AC. Each upgraded piece adds 3 lb."* with **"Three studded
Add-ons grant +1 AC; five grant +2 AC. Each upgraded piece adds 5 lb and gives
Disadvantage on Dexterity (Stealth) checks to hide or move silently."**
`CharacterSheetAddonArmor.tsx:45` — `<small>+3 lb</small>` → **`+5 lb`**. Copy
only; the arithmetic is items 105–106. (A05, A06, B02-2)

**165.** `CharacterSheetArmorRules.tsx` — add **one** `<article>` to the existing
`character-sheet-armor-rule-list` titled "Weapon training", value
`klass?.weaponProficiencies`, using the same markup as the existing "Armor
training" article. `wepSimple`/`wepMartial` are computed at
`characterAutomation.ts:178-179` and **stored**, but rendered nowhere;
character-sheet.txt [page 3] prints `WEAPONS (2) [ ] SIMPLE [ ] MARTIAL`. **One
element, existing styling.** (B02-6)

**166.** `characterAutomation.ts` — add a `robe` put beside the existing
`headGear`/`scarf`/`gloves`/`boots` loop. `CharacterSheetArmorDoll.tsx:9` has a
fifth "Robe" socket but automation emits only four extras fields, so a worn Robe
is **invisible on any printed or derived sheet**. **Keep the socket** — removing
it would strand the Deepcaller's own starting item. (core-rulebook.txt [page 38]
defines four Extra subcategories; the Robe is a named Starting Equipment item,
not a subcategory.) (B02-3)

**167.** `AppGearSection.tsx:134-154` — the "Carried weapons" table shows
Weapon / Damage / Properties / Mastery, with **no attack bonus anywhere on the
sheet**, while character-sheet.txt [page 5] prints **NAME | ATTACK BONUS | DAMAGE
TYPE | NOTES**. Meanwhile `wd_{row}_0..3` is **written by
`CharacterAutomationProvider.tsx:533-545` for custom items only and read by
nothing**. Add one "Attack" column computed as `formatModifier(proficiencyBonus(
card.level) + abilityModifier(finesse||ranged ? dex : str))` from
`WEAPON_FACTS[item.id].properties`, and populate `wd_{row}_0..3` for **every**
carried weapon from that same table, with column 2 carrying the damage **type**.
**No new panel, no layout change.** Existing hand-written `wd_*` rows on migrated
cards should be added to `sheetAutomation.manualOverrides` so they are not
overwritten. (B02-5)

**168.** `AppDeepcallerReference.tsx:34-53` — relabel the summary's
`entry.school` as **"Type"** (its stored value, e.g. "Evocation Rite", *is* the
source's `Type` field). Keep Damage / Damage type as app-derived extras (they are
genuinely computed). Add a **`Special Requirements`** row for Eldritch Strike's
*"A weapon with which you have proficiency"*. **`ROUNDS` has no source definition
anywhere — do not add it.** Whispers must not print a LEVEL; only Rites have one.
(B02-7)

**169.** `AppGearSection.tsx:153` — trim the footnote *"…The Hunter Cleaver has
no recorded statistics and remains explicitly DM-set."* to *"Weapon damage,
properties, and mastery come from the C&S Core Rulebook weapons table."* The
Cleaver is not merely unstatted — it is absent from the beta entirely, so naming
it on the sheet is stale. **This copy edit is safe regardless of `[BLOCKED-2]`**,
which governs only the catalog row and stored inventory. (B02-10)

**170.** **Confirmed match — leave untouched.** Rite save DC `8 + prof + INT mod`
and Rite attack `prof + INT mod`; all **19** skills and their ability
assignments including `SHEET_SKILL_FIELD`; the four carry conditions and their
thresholds; the add-on limit and Balanced Fit sixth; Shield Arm; the
Transformation Level ceiling of 10; the five storage slot locations and the
default three plus hand XOR; the death-save checkboxes (`dsS1..3`/`dsF1..3`);
Hit Dice current/spent/max; `sanityDice`; `initiative`; the hard-coded
`Size: Medium` on the Hunter panel (character-sheet.txt [page 1] literally prints
`( SIZE : MEDIUM )`); and the "Actual player" field (the sheet's IDENTITY block
distinguishes *"Your ACTUAL name"* from *"YOUR NAME"*). The last two **look**
invented and are not — do not remove them. (A01, A06, B01, B02-12)

**171.** `IMPRESSIONS` — the printed sheet has the box (character-sheet.txt:157)
but the beta gives **no impression content**: [page 38] gives all four head-gear
pieces the single Special *"Is given by class."* **Keep the panel** (the sheet
requires the box) and keep its empty-state copy *"No visible armor impression."*
The four `impression` strings in `armor.ts` are declared app flavour — **ask
Simon whether to keep them**; they are the only removable content here. **Do not
invent impressions for the remaining pieces.** (A05, B02-4)

### 5.4 User-visible copy outside the sheet

**172.** `vite.config.ts:39-42` PWA manifest description — *"…sessions, hunter
cards and the player's handbook."* names two things the app no longer has
(`src/features/sessions/**` does not exist; `/handbook` is a legacy redirect) and
one document that is not a C&S source. → *"Companion app for our Catacombs &
Starspawns campaign — hunters, live play and the Codex."* (B06-12)

**173.** `MainMenu.tsx:34` Codex guide card — **sequence after item 5**, not
before: *"Search the Core Rulebook, the Book of the Deepcaller, the Whispers
Sheet and the printable character sheet — with the source shown for every
answer."* (B06-13)

**174.** `[BLOCKED-1]` — three "Sanity" → "Madness" copy edits, one word each,
**only once BLOCKED-1 is answered**: `MainMenu.tsx:24-26` *"cling to your
Sanity"* → *"hold back the Madness"*; `Landing.tsx:22` *"live HP & Sanity"* →
*"live HP & Madness"*; `Landing.tsx:44` *"live HP / Sanity / Blood Tinge"* →
*"live HP / Madness / Blood Tinge"*. **Keep "Blood Tinge" spelled exactly as-is**
— it matches the source. (B06-14)

**175.** `Landing.tsx:45` *"risk permadeath"* overstates the beta, which defines
**Favors** as a recoverable-death mechanic. **Keep the copy as-is for now** —
do not advertise an unimplemented mechanic. Change to *"…and spend Favors to come
back."* **only after item 146 lands.** (B06-15)

**176.** `CombatBoard.tsx:82-89` — **keep** the `CONDITION_NAME[id] ?? id`
fallback. It is correct defensive behaviour; the fix is upstream in item 4. Do
not "fix" the board separately. (B06-2)

**177.** **Confirmed clean — no edits.** `src/app/**`, `src/components/**`, and
the auth / campaign / profile stores name only app concepts. `App.tsx:48-49`'s
legacy `?tab=rites` → `group=Rites` mapping is still the correct Codex group.
`Splash`'s "Lighting the lantern…" is flavour, and the Lantern is real beta gear.
`src/config.ts` carries no rules vocabulary. `functions/**` contains no game-rules
logic beyond a level clamp of 20, which matches [page 46]. `firestore.rules`
constrains only `transformationLevel` / `activeTransformations`, which remain beta
rules — **no rules-file change is needed for any field rename or removal in this
plan**, but re-run `bun run smoke` after any edit to that file per CLAUDE.md.
(B05, B06, B07)

---

# BATCH 6 — Stored-data migration

Areas: **the migration script · dry-run report · safety contract**

Runs **last**, after every catalog and formula change above has landed, because
the dry run must be computed against the final code.

## 6.1 Safety contract — NON-NEGOTIABLE

- **Runtime:** Bun + `firebase-admin`. Lives in `scripts/`.
- **`--dry-run` is the DEFAULT.** A live write requires an explicit,
  non-defaulted flag.
- **Dry run must report, per character: the document `id`, the `ownerUid`, and
  the character `name`, then every field it would change as `before -> after`.**
  It must write **nothing**.
- **A live write requires (a) Simon's explicit approval of the reviewed dry-run
  output, and (b) a prior export/backup of the `characters` collection.**
- 🛑 **HARD STOP: no production writes.** Produce the script, run the dry run,
  report the results to Simon, and stop. He must review and explicitly approve
  before any write happens. This is irreversible user data.
- Sanity-check the dry run against the shape in `src/dev/preview.ts` (item 14).

## 6.2 Confirmed safe — NOTHING to remap

This is the single most important negative result. Verified independently by B01
and B03 across all five txts:

**All 6 `classId`s · all 11 `subclassId`s · all 14 `backgroundId`s · all 54 feat
names · all 19 skill names · all 22 armor ids · all 6 storage ids · all 21 rite
ids · all 6 whisper ids · all 8 mastery names · every `abilityMode` value.**

That is the large majority of a stored `HunterCard`. Every change below is a
value-level strip, remap, backfill or recompute — **no field becomes structurally
invalid under the beta.**

## 6.3 Fields to STRIP

| Field | Condition | Reason |
|---|---|---|
| `deathPending` | all cards | Not a beta rule; **nothing ever writes `true`**, so removal is lossless (item 161). |
| `sanity` | `[BLOCKED-1]` | [page 42] *"do not track Current Sanity"*. **Do not strip until Simon answers.** Strip only after `madness` is backfilled (§6.5). |
| `sheet.sanityCur` | `[BLOCKED-1]` | Same. If Simon keeps the printed CURRENT box, keep emitting it for the paper layout only. |
| `sheet.insane` | `[BLOCKED-1]` | Becomes derived (`madness >= sanityMax`). **Stale `true` on cards with `madness < maxSanity` must be cleared, not trusted.** |
| `sheetAutomation.legacyEquipment` rows for class head-gear | per class | Deleted once `extraArmorIds` is backfilled (§6.6); otherwise the hat exists twice. |
| `slotAssignments[<removed id>]` | any removed id | A dangling placement against an unresolvable item. **Prune for every id in §6.4.** |
| `/games/{id}.combat.designatedWardenId`, `/games/{id}/combatants/{id}.isWarden` | if item 97 is approved | Dead data. `normalizeEncounterState` already tolerates absence — safe to leave to rot or strip. **Not `/characters` scope.** |
| `/games/{id}.combat.{timerPhase,timerEndsAt,pausedRemainingMs}` | if item 97 is approved | Same. **Not `/characters` scope.** |

## 6.4 Values to REMAP

**Item ids** — apply to `inventory[].itemId`, `sheetAutomation.startingKitInventory[].itemId`,
and `slotAssignments` **keys**, always **all three together** (they must stay in
sync, or the builder's next class/background change will fail to remove the old
grant and will double up the item):

| Stored id | → | Rule |
|---|---|---|
| `lantern` | **`lantern-hooded`** | The beta has only Bullseye and Hooded; Hooded is the same 2 lb (item 43). |
| `book-of-eldritch-knowledge` | **`book-of-the-deepcaller`** on Deepcaller cards, else **`book`** | The beta separates the Unique Item from generic Book (item 44). |
| `hunter-cleaver` | **`[BLOCKED-2]`** | **No remap target** — the Shortsword is a different weapon, not a rename. Options for Simon: keep as-is; convert to a `customItems` entry (`source: "found"`, name "Hunter Cleaver", `catalogBaseId: "shortsword"`); or drop. **Do not silently delete.** |
| `bedroll` | **drop** | −7 lb (item 48). |
| `rations` | **drop** | −2 lb each (item 48). |
| `letter` | **drop** | 0 lb (item 48). |
| `brewers-supplies` | **drop** | −9 lb; also leaves Church Missionary's kit (items 48–49). |

**Tool-name strings inside `featSkills[]`** (tool picks live *only* here; skill
picks are mirrored into `skillProficiencies`). The union type is compile-time
only, so stale strings do not crash — they simply stop resolving in
`TOOL_DETAILS`:

| Stored string | → |
|---|---|
| `Mason's Tools` | **`Cultist's Tools`** where it came from the Cultist background; a **free Skilled pick → drop and re-prompt** |
| `Tinker's Tools` | **`Smith's Tools`** where it came from the Weaponsmith background; a free Skilled pick → drop and re-prompt |
| `Brewer's Supplies` | **drop** — no successor |

Dropping a `featSkills` entry re-opens the "Skilled feat" pending choice (3
required), which is the **correct** outcome — the player re-picks.

**`sheetAutomation.weaponMasteries`** (stores weapon **names** as free strings):

| Stored value | Action |
|---|---|
| `"Pistol"` on a **Stalker** | **Strip** — Pistol is Martial Ranged with neither Finesse nor Light, so a Stalker is not proficient (item 124). Re-open the mastery choice. |
| `"Hunter Cleaver"` | **Strip** — a weapon with mastery `"—"` can never be mastered (item 127). Re-open the choice. |
| anything failing the new derived proficiency test | **Strip** and re-open |

**`sheetAutomation.levelChoices`** — clear or remap any Forbidden Revelation pick
that no longer resolves. **A17 confirms none currently do**: all 21 rite names
are unchanged. Included as a defensive check only.

**Combatant condition slugs** (`/games/{id}/combatants/{id}.conditions[]` —
**outside the character-migration scope**): if any legacy doc holds `"charmed"`,
remap to `"mesmerized"`. Combatant docs are ephemeral per-game, so this is
**optional**.

## 6.5 Fields to BACKFILL

| Field | Default | Citation |
|---|---|---|
| `notTonight` | **`true`** | [page 44]: *"A newly created Hunter begins with Not Tonight!"* — every existing Hunter has either never used it or has since Long Rested. |
| `favors` | **`0`** | [page 45]: max 2. |
| `sleeplessCounter` | **`0`** | [page 21] / [page 25]. |
| `exhaustion` | **`0`** | [page 25]. |
| `insaneQuirkId` | **absent** (no backfill) | [page 24] — absent = no quirk rolled. |
| `madness` | `[BLOCKED-1]` → `max(0, sanityMax − sanity)` where `madness` is absent/0 and `sanity` is present and below the computed Max Sanity | This is exactly the lossless legacy conversion already implemented at `src/lib/character.ts:139-150`. **Backfill BEFORE stripping `sanity`.** |
| `extraArmorIds` | class head-gear id | Brute `wide-brim-hat`, Scout + Stalker `cavalier-hat`, Deepcaller + Bloodbound `cowl`, Warden `tricorn` — where absent. **AC does not change** (Extras are `acValue: 0`) but **weight does**, so recompute (§6.6). |
| `preparedWhispers` | add `eldritch-strike` + `armor-of-the-drowned-star` | For cards with `subclassId === "hunter-zealot" && level >= 3` ([pages 76–77]). Zealots are currently under-filled by 1–3 slots. |

**Do NOT backfill:**
- **Madness for existing Deepcallers** under Fracturing Mind (item 117) — it
  would penalise past play. Forward only.
- **`coins` for Noble-background cards** (+20 GP under item 99) — coins are a
  mutable, player-spent field, and a backfill would silently reverse spending.
  **New Noble hunters only.** If Simon wants it, restrict to cards where the
  inventory still exactly equals the stored starting kit.
- **`currentHp`** after the Con-feat fix (item 116) — a low value may be real
  damage.
- **Class starting-equipment `inventory`** wholesale. The kit-diff logic exists
  precisely so later purchases survive. Refresh only
  `sheetAutomation.startingKitInventory`, and only where `startingKitApplied` is
  true **and** the current inventory still exactly equals the stored kit.
- **`hunter-cleaver` inventory entries** — `[BLOCKED-2]`.

## 6.6 Derived values to RECOMPUTE

All are `sheet` snapshots regenerated by `calculatedSheetFields()`. **Skip any key
present in `sheetAutomation.manualOverrides`** — the player set it by hand.

| Value | New formula / cause | Citation |
|---|---|---|
| `sheet.ac` | `studBonus = studded >= 5 ? 2 : studded >= 3 ? 1 : 0` — **cards with 1–2 studded add-ons lose +1 AC**, and a lower base can flip the Dex category (13 → 12 = Medium → Light), so the change may exceed 1 | [page 35] |
| `sheet.armorCategory` | Follows the recomputed base armor AC | [page 40] |
| `sheet.weight`, `sheet.weightCondition` | Studded pieces **3 → 5 lb**; Robe **4 → 2 lb**; Bloodvial **0 → 0.5 lb** (most cards carry 1–4); backfilled head-gear adds 1 lb; removed items subtract (Bedroll −7, Rations −2 ea, Brewer's Supplies −9) | [pages 35, 122, 124] |
| **Slot occupancy / `slotAssignments`** | Thieves' / Navigator's / Blood-drainer's Tools become **Significant** — this **can invalidate an existing layout** for essentially every Stalker, Warden and Bloodbound. Recompute placements; a tool now needs a real Significant slot (typically Tool Belt / Backpack) or falls back to unassigned inventory | [page 114] |
| `sheet.passivePerception` | `10 + WIS mod + (expertise.has("Perception") ? prof*2 : prof) + modifier` — affects Scouts with Perception Expertise from level 2 | [page 43] |
| `sheet.speed` | `klass.speedFt + speedModifier + Roving(+10) + Speedy(+10) + BoonOfSpeed(+30) + carryConditionSpeedDelta` | [pages 40, 58, 103, 106] |
| `sheet.{wis,cha}Save`, `{wis,cha}SaveP` | Slippery Mind — level 15+ Stalkers are proficient in **four** saves | [page 65] |
| `sheet.features1` | Regenerated from `featureText()` — picks up every class-text fix in batch 3 automatically for **every** card | batch 3 |
| `sheet.insane` | `[BLOCKED-1]` — recompute from `madness` vs computed Max Sanity; **do not trust the stored checkbox** | [page 23] |
| `sheet.wd_*` | Newly generated for all carried weapons (item 167); pre-existing hand-written rows go into `manualOverrides` first | character-sheet.txt [page 5] |
| `sheet.impressions` | Recomputes to `""` if the four `impression` strings are removed (item 171) | — |

⚠️ **Double-count guard.** Item 108 adds Roving / Speedy / Boon of Speed /
carry-condition terms to `speed`, and item 107 adds the Expertise doubling to
`passivePerception`. Players who compensated by hand have non-zero
`speedModifier` / `passivePerceptionModifier`. **Only recompute cards whose
`sheetAutomation.manualOverrides` lacks the key AND whose corresponding manual
modifier is 0** — otherwise the correction is applied twice. Report the skipped
cards in the dry run so Simon can decide case by case.

## 6.7 Validation checks to include in the dry run

Report, do not fix:

1. Any card with `subclassId` set **below** its class's subclass level (e.g. a
   level-2 `hunter-zealot`).
2. Any `inventory[].itemId` or `sheet.eq_*` cell referencing `hunter-cleaver`
   (`[BLOCKED-2]` inventory for Simon's decision).
3. Any level-20 Bloodbound whose STR/CON may have been silently truncated to 20
   by the old `structuredCardFromSheet` clamp (item 83). **The pre-truncation
   value is unrecoverable — no backfill is possible.** Report for manual
   correction.
4. Any card with a non-zero `speedModifier` or `passivePerceptionModifier` (the
   double-count guard above).
5. Any `sheetAutomation.manualOverrides` key that would otherwise have been
   recomputed.

---

## Post-implementation verification

1. Re-run every gate **individually** and diff against the baseline table.
   **Any new `tsc` error, a 2nd eslint warning, or a 6th knip finding is ours.**
2. `bun run smoke` **only if `firestore.rules` was touched** (item 177 says it
   should not need to be).
3. `bun run scripts/shots.mjs` at **both** iPhone 15 and 1440×900 — **only after
   item 14 (preview fixture) has landed.** Read both images.
4. Confirm the GM-only boundary: `grep -ri "old one vessel\|second threshold\|
   hidden condition\|player alterations"` over `src/`, `public/`, `scripts/` and
   `src/data/codex.generated.json` returns only the negative test assertions.
5. Re-read this plan's HARD CONSTRAINT section and confirm **no restyle, no
   re-layout, no redesign, no new navigation** shipped.
