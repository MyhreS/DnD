# C&S Beta Reconciliation — Adversarial Review & Visual Verification

Read-only adversarial review of branch `claude/cs-beta-release-integration-be1e76`
against `docs/rules/*.txt`. Reviewed at commit `3f408d6`; another agent was
committing concurrently, so two failures observed mid-review were re-checked and
confirmed resolved (noted under "In-flight, resolved").

Method: re-read `_reconciliation-plan.md` against `git diff ccca065~1...HEAD`;
spot-checked every changed catalog value against the source txts; grepped for
old/new values of everything that moved; ran the test gates; drove the app in
Playwright at iPhone 15 and 1440×900 and read the resulting images.

---

## CRITICAL

**None.** Specifically, the GM-only leak check is clean — see "GM-only
containment" under VERIFIED CORRECT for what was actually tested.

---

## HIGH

### H1 — The new ATTACK BONUS column adds the proficiency bonus to weapons the hunter is not proficient with

`src/lib/character.ts:387-394`

```ts
export function weaponAttackBonus(card, facts): number {
  const prof = proficiencyBonus(card.level || 1);
  ...
  if (!facts) return prof + str;
  if (/Finesse/i.test(facts.properties)) return prof + Math.max(str, dex);
  return prof + (facts.attack === "Ranged" ? dex : str);
}
```

The proficiency bonus is added unconditionally, on every path.

**What the source says** — `core-rulebook.txt` [page 12], "Equipment
Proficiencies": *"Weapons. Anyone can wield a weapon, but proficiency allows you
to add your Proficiency Bonus to attack rolls made with it."* Proficiency is the
gate on the bonus, not a formality.

**Why this matters now.** This function is the sole feed for the ATTACK column
that this project added to the weapon table (`AppGearSection.tsx:158`). Before
this project there was no displayed attack bonus, so the defect was invisible;
it is now the headline number of a new column. Concretely: a Deepcaller
(`classes.ts:283` — `weaponProficiencies: "Simple weapons"`) who picks up a
Greatsword is shown a bonus including `+prof` that the rules do not grant. The
Stalker (`classes.ts:195` — Simple, plus Martial only with Finesse or Light) is
wrong for every Heavy/Two-Handed martial weapon.

**The fix is cheap, because both inputs already exist.** The class's proficiency
is already computed into `wepSimple` / `wepMartial`
(`src/features/hunter/lib/characterAutomation.ts:211-212`), and this project made
`WeaponFacts.category` (`Simple` / `Martial` / `Unarmed`) a required field
precisely so weapon category is knowable. Thread the class (or a resolved
`proficient: boolean`) into `weaponAttackBonus` and add `prof` only when the
hunter is proficient — reusing the same Stalker rule already written at
`CharacterAutomationProvider.tsx:196-197`. Add a case to
`scripts/character-automation-test.ts` covering a Deepcaller with a Martial
weapon.

---

## MEDIUM

### M1 — The Codex page subtitle still omits the Core Rulebook

`src/features/codex/components/CodexPage.tsx:88`

```
Deepcaller Rites, Whispers, and the current printable character sheet—together,
with every player source kept visible.
```

Confirmed rendered in `screenshots/codex-desktop.png`. The pipeline now emits
**four** sources and the page's own "Source library" row correctly reads
`4 sources · 4 documents`, but the sentence directly above it names only three —
and the omitted one is the 126-page Core Rulebook, by far the largest and the
one that ruling #5 explicitly relied on ("The definitions are also reachable in
the Codex now that the Core Rulebook is a source"). This is a half-landed copy
change: the data moved, the sentence describing it did not.

**Fix:** lead with the Core Rulebook, e.g. *"The Core Rulebook, Deepcaller Rites,
Whispers, and the current printable character sheet — together, with every player
source kept visible."*

### M2 — Studs weight and studs AC disagree about which add-ons count

`src/lib/character.ts:269-271` (AC) vs `src/lib/character.ts:308-315` (weight)

AC clamps to the legal allowance, deliberately and with a comment:

```ts
const worn = addonArmorIds.slice(0, maxAddonPieces(mainArmorId, customItems));
// Over-max stacks ... never contribute beyond the legal allowance.
const studded = studdedAddonIds.filter((id) => worn.includes(id)).length;
```

Weight does not clamp at all — neither the pieces nor the studs:

```ts
const ids = [ ...(card.addonArmorIds ?? []), ... ];   // not sliced to `worn`
const studs = studdedAddonIdsOf(card).length * 5;      // not filtered to `worn`
```

So for an over-max stored set — exactly the case the AC comment was written for,
e.g. a six-piece set whose Balanced Fit main armor was later swapped away — the
hunter is charged 5 lb per studded piece that contributes no AC, and carried
weight can tip the Encumbered threshold off a piece the AC math has disowned.
This is the same *class* of AC/weight divergence that was caught mid-project;
the plan items themselves (31, 34, 105, 106, 164) all landed correctly, so this
is a surviving edge case rather than a missed item.

**Fix:** compute `worn` once and use it for both, or state in a comment that
over-max pieces are deliberately still carried (and then make the AC comment say
so too). Either way the two functions should stop disagreeing silently.

### M3 — Weapon-mastery eligibility hardcodes the Stalker and lets every other class through

`src/features/hunter/components/papersheet/CharacterAutomationProvider.tsx:191-201`

```ts
if (klass?.id === "stalker") { ... }
if (/Melee weapons/i.test(masteryFeature?.text ?? "")) return facts.attack === "Melee";
return true;   // ← every other class may master every weapon
```

The Stalker's restriction is transcribed correctly, but it is keyed to a class
id rather than derived from `klass.weaponProficiencies`, which the app already
parses for exactly this purpose (`characterAutomation.ts:211-212`). Any class
without full Martial proficiency falls through to `return true`. The Deepcaller
(`Simple weapons`) is the live example. Reachability is currently low —
`masteryCount` resolves to 0 for classes with no "Weapon Mastery" progression
column — so the wrong options are not offered today, but the filter is incorrect
in principle and will mis-fire the moment a mastery source is granted by feat,
subclass or a future progression row.

**Fix:** derive the predicate from `klass.weaponProficiencies` + `facts.category`
instead of `klass.id === "stalker"`. This is the same predicate H1 needs, so both
findings should be fixed with one shared helper.

### M4 — The weapon table's provenance line does not cover the column that was added to it

`src/features/hunter/components/appsheet/AppGearSection.tsx:167`

```
Weapon damage, properties, and mastery come from the C&S Core Rulebook weapons table.
```

The table now has five columns, and the new one — Attack — is the only one *not*
from the weapons table; it is derived from the hunter's level, abilities and
(per H1, should be) proficiency. The `AutoReason` is the app's contract for
"where did this number come from", so leaving Attack out of it is a small but
real gap in a surface whose whole job is explaining derived values.

**Fix:** *"Damage, properties and mastery come from the C&S Core Rulebook weapons
table; the attack bonus is your proficiency bonus plus the ability modifier this
weapon uses."*

---

## LOW

### L1 — The knip gate cannot be verified in this worktree

`bun run deadcode` fails:

```
Unused devDependencies (1)   eslint  package.json:76:6
Unlisted binaries (4)        tsc  vite  eslint  knip
```

This is an **environment artifact, not a code defect**: `node_modules/` in this
worktree is empty (`ls node_modules | wc -l` → 0; `node_modules/eslint` does not
exist), so knip cannot resolve the binaries it is complaining about — which is
also why it reports `eslint` as both an unused dependency and an unlisted binary,
a self-contradiction that only happens when resolution fails. `knip.json` is
unchanged on this branch (`git diff ccca065~1...HEAD -- knip.json` is empty).
Everything else runs because Bun resolves from its global cache.

**I could not verify the knip gate.** Run `bun install` in the worktree (or run
`bun run deadcode` in the main checkout) before trusting `bun run check`.

### L2 — "Blood vial" vs the source's "Bloodvial"

`src/data/items.ts` (`blood-vial`, displayed "Blood vial") and the class kits
("1 Blood vial", "4 Blood vials"). The beta consistently writes **Bloodvial** as
one word (`core-rulebook.txt` [pages 122-123], and the class tables at lines
2206/2488/3082 read "Bloodvial (1)"). `src/data/bloodvial.ts` uses the correct
one-word form throughout in its own copy, so the app is now internally
inconsistent about the item's name. Cosmetic; the catalog id must not change
(stored inventories key on `blood-vial`), only the display name.

---

## In-flight, resolved (not findings)

Two failures observed partway through the review were re-checked afterwards and
were the other agent's uncommitted work-in-progress, now landed:

- `scripts/migrate-stored-characters-test.ts:275-276` briefly held two
  contradictory assertions about `deathPending` (one asserting it is stripped,
  the stale one asserting it is not). `bun run test:stored-character-migration`
  now passes.
- The Insane Quirk picker and the class head-gear migration were mid-edit; both
  are present and correct as reviewed below.

---

## VERIFIED CORRECT

Things I actively tried to break and could not. Listed so the coverage is legible.

**GM-only containment (the CRITICAL check).**
- The generator never opens the hidden sheet: `generate-codex-data.mjs:57-60`
  keeps a `HIDDEN_SOURCE_NAMES` denylist and *throws* if a hidden file reaches
  the allowlist; the four player sources are a hard-coded filename list, never a
  glob.
- The `test:codex` assertion is real, not decorative: `codex-data-test.ts:149-158`
  reads `hidden-condition-sheet.txt`, slices it into **every 6-word phrase**, and
  asserts none appears in the generated output — plus per-line checks and
  `:145-147` asserting the source id and its entries are absent. It passes.
- Independent greps: no `Old One Vessel`, `Dreadblood`-as-Lost, `Second
  Threshold`, or `twice their Max Sanity` content in `src/`, `public/`, or
  `src/data/codex.generated.json`. The only `src/` hits for "Hidden Condition"
  are the *guard comments* in `data/transformations.ts:5-6`; the only
  `public/` hits are inside the Core Rulebook's own text, which is a **player**
  document that merely names the sheet without reproducing it — correct.
- `transformations.ts:103-107` renders the `Lost` table result with the text
  **"Ask your GM."** and nothing more. This is the single most likely leak point
  in the whole change set and it is handled right.

**Weapons — the full 30-row table, checked row by row against
`core-rulebook.txt` [page 111].** All 30 names, damage dice, damage types,
properties (including range tuples `20/60`, `30/120`, `100/400`, `30/90`),
mastery and Simple/Martial category in `src/data/weapons.ts` match exactly.
Weights and carrying categories in `src/data/items.ts` also match exactly,
including the non-obvious ones I expected to be wrong: Spear 3 lb but
**Oversized**, Throwing Knife **1/4 lb Insignificant**, Javelin and Hunter Rifle
both **Significant (back)** with `slotLocation: "back"`, Trident 12 lb Oversized.

**Hunter Cleaver purge.** Zero occurrences in `src/`, `public/` or the generated
Codex data. The only survivors are in `scripts/migrate-stored-characters.ts`,
where they are *supposed* to be — the strip list, the `strip:hunter-cleaver`
report group, and the mastery-name clearing.

**Class starting equipment — all six, against the source blocks at lines 2206,
2488, 2826, 3082, 3587, 3891.** Every list matches item-for-item, including the
head gear (Wide Brim Hat / Cavalier Hat / Cavalier Hat / Cowl / Cowl / Tricorn)
and the ruling-driven change: the Scout starts with a **Shortsword**, not a
Cleaver.

**Per-class vitals.** Max Sanity 12/12/12/16/20/14 and Sanity Die
2d6/2d6/1d12/1d20/1d20/**4d4** all match the source class tables. The Sanity Die
copy on the Recovery panel is class-derived (`result.fields.sanityDice`,
`CharacterSheetRecovery.tsx:48`), **not** hardcoded 2d6 — I checked specifically
because the Scout fixture would have hidden a hardcode.

**Sanity inversion (ruling #1).** `CharacterSheetSanity.tsx` leads with Madness,
and `Insane` is a `disabled readOnly` checkbox derived from
`madness >= sanityMax` — genuinely non-interactive, as required. Confirmed
visually: the sheet tile reads `MADNESS 4 / 13 · MAX SANITY`. Legacy cards are
converted at read time in `character.ts:157-169` (`madness = previousMaxSanity −
previousSanity`), which is idempotent and non-destructive, and
`characterAutomation.ts:181` no longer emits `sanityCur`.

**Insane Quirk table** — all 12 entries against [page 24]: names and d100 ranges
(1-10, 11-18, 19-28, 29-36, 37-48, 49-54, 55-64, 65-69, 70-81, 82-91, 92-95,
96-100) match exactly, contiguous with no gap or overlap, summing to 1-100.
Ruined Presence's −5 is correctly flagged as never auto-applied.

**Bloodvial purity (ruling #6)** — all four tiers against [page 123], a
two-column interleaved page that would be easy to mis-transcribe: Tainted
2d4+2 / 2 Madness / DC 10 / +1 TL / +3; Stirred 4d4+4 / 4 / DC 15 / +1 / +6;
Concentrated 8d4+8 / 8 / DC 20 / +2 / +10; Pure DC 25 / +6 / +15 with both
choice effects including the "no longer than 1 round" limit. Modelled as a
*field* on the existing `blood-vial` id, so stored lines keep resolving and a
missing purity defaults to Tainted. Not dead code — rendered by
`AppBloodvialPurity.tsx` and covered by `character-automation-test.ts:632-647`.

**Transformation table** — the 20×10 grid in `transformations.ts:28-49` matches
[page 27] across every row I could read in the source's column layout.

**Point buy (ruling #4).** Standard: budget 27, costs 8:0…15:9, max 15 — exact.
Maduhausu: budget 57 and the full three-column V2 table including the escalating
14:[12,14,17], 15:[14,18,23] and 16:[20,26,**null**] where the source prints
"Too expensive". The "Maduhausu" name is preserved per the ruling.

**Armor.** `acCategory` matches the [page 40] table exactly (11-12 Light full
Dex; 13-14 Medium max +2; 15+ Heavy none). The 16 AC / 13 STR and 17+ AC / 15
STR requirements are implemented as **non-blocking advisories**
(`CharacterSheetArmorRules.tsx:14-19`), correctly, since the source states a
requirement with no penalty.

**Studs — displayed copy now agrees with computed logic** (this was the
mid-project bug class, so I checked both sides): `armorClass` uses
`studded >= 5 ? 2 : studded >= 3 ? 1 : 0`, `armor.ts` carries `weightLb: 5` and
the Stealth-disadvantage text, `wornArmorWeight` multiplies by 5, and
`CharacterSheetArmorRules.tsx` renders *"Three studded Add-ons grant +1 AC; five
grant +2 AC. Each upgraded piece adds 5 lb and gives Disadvantage on Dexterity
(Stealth)…"*, with `CharacterSheetAddonArmor.tsx:45` showing "+5 lb". All four
surfaces agree. (M2 is a separate, narrower over-max edge case.)

**Conditions.** Not hand-authored — generated from the sources
(`conditions.ts:1,32`) and asserted against an explicit `BETA_CONDITIONS` list in
`codex-data-test.ts:78-94`. Exhaustion is correctly expanded into six levels
rather than a boolean, and `Lost` / `Second Threshold` are explicitly asserted
**absent** from the offered list (`:101-102`).

**Codex pipeline.** Four sources, correct page counts (Core Rulebook 126,
Deepcaller 13, Character Sheet 11, Whispers 2), and every download
`publicPath` points at a **`.txt`** under `/source-library/`. No
`resources/master.json` or `resources/pdf/` survives.

**Gates.** `test:codex`, `test:character-automation`, `test:ability-buy`,
`test:stored-character-migration` and `tsc -b` all pass. `eslint .` reports
**0 errors, 1 warning** (`GamePage.tsx:210`, a pre-existing
`set-state-in-effect` bailout that CLAUDE.md documents as warn-level). knip: see
L1.

**Migration safety.** `migrate-stored-characters.ts` is dry-run by default
(`--apply` required), builds an explicit change list per field with
before/after, groups strips by reason, and reports rather than silently deletes.
I did **not** run it, with or without `--apply`. The transforms I read match the
rulings: `hunter-cleaver` stripped from `inventory`,
`sheetAutomation.startingKitInventory`, `slotAssignments`, legacy `sheet.eq_*`
rows and stored weapon masteries; `sheet.insane` deleted as now-derived;
`deathPending` deleted as reader-less; Bloodvial lines backfilled with the
Tainted default.

---

## Visual verification

Dev server at `localhost:5173` in preview mode; Playwright at **iPhone 15** and
**1440×900**, images written to `screenshots/` and `screenshots/rev/` and read,
not merely generated.

**Console errors: 0** across every route and flow captured below — including
`/sessions` and `/party`, which did not even produce the expected
"insufficient permissions" lines on these runs.

Checked and found clean:

- **Weapon table, the main risk (4 → 5 columns).** Desktop: a proper five-column
  grid (`1.1fr .5fr .8fr 2fr .6fr`) with `Weapon | Attack | Damage | Properties |
  Mastery` headings, no overflow and no truncation — the widest cell,
  `Ammunition (100/400; Bullet), Two-Handed`, sits comfortably. Mobile: reflows
  to the 2-column card as intended, and the fifth column *was* accounted for —
  `appsheet-details.css:678-699` places children 1-5 explicitly (name full-width,
  Attack and Damage side by side, Properties and Mastery full-width rows). No
  overlap, no clipped text, no horizontal scroll.
- **Bloodvial purity row.** Renders inside the existing inventory row on both
  sizes with the select, the effect line and the failure line, showing the
  fixture's Stirred Blood with correct numbers (`Heals 4d4 + 4 HP · removes 4
  Madness`, `Grit DC 15 — on a failure: +1 Transformation Level and +6 Madness`).
  No layout disruption to neighbouring rows.
- **Sanity/Madness.** Madness leads on the sheet tile and in the panel; Insane is
  visibly a disabled checkbox.
- **Recovery / Resources panel.** Two-column grid intact; Hit Dice, Sleepless
  Counters, Exhaustion, Favors and the class-derived Sanity Die control all
  render with full explanatory copy, no truncation.
- **Hunter builder.** Step order confirmed by walking it: Name → **Choose class →
  Choose background → Set ability scores** → … — matching [page 30] and the plan's
  do-not-reorder constraint. Progress bar, sticky footer (`Previous` / hint /
  `Next`) and the disabled-Next gating all behave at both sizes. The ability-score
  step shows the Standard (27) / Maduhausu (57) toggle with correct live math
  (six scores at 10 = 12 spent, 15 left — the beta charges 2 for a 10).
- **Codex.** Browse list, 4-source library row, category counts; no overflow.
- **Main menu, hunter list, profile.** Unchanged and intact at both sizes.

Not visually verified: the in-campaign Play/game surfaces and the iOS simulator
(safe-area/standalone) pass, neither of which this change set touches
substantively; and the equipment/loadout page, which I could not reach in preview
(its control is not a `button` role) — its weapon rendering is the same
`AppGearSection` component verified above.
