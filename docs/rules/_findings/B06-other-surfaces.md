# B06 — Remaining user-facing surfaces (Direction B: code/UI → txt)

Scope as assigned: everything rule-bearing **outside** the Hunter builder, the
character sheet, `src/data`, the Codex, and Play/game.

Actual surface inventory (the brief's `src/features/party/**` and
`src/features/sessions/**` **no longer exist** — those features were removed
from the repo; nothing in `src/` references them):

- `src/app/App.tsx`, `src/app/{theme,pwaUpdates,pwaUpdatePolicy}.ts`
- `src/components/` — `Shell`, `MainLayout`, `Splash`, `UpdateBar`, `ThemeToggle`,
  `AsyncButton`, `ConfirmDialog`, `ErrorBoundary`, `Skeleton`, `icons`
- `src/features/auth/` — `Landing`, `Onboarding`, `PublicLayout`, `authStore`
- `src/features/campaigns/` — `MainMenu`, `campaignStore`, `useCampaignSync`
- `src/features/profile/` — `ProfilePage`, `ProfileNameForm`
- `src/features/status/` — `StatusPage`, `CombatBoard` (the big-screen table board;
  it is not under `play/`/`game/`, so it is covered here)
- `src/dev/preview.ts`, `src/dev/testLogin.ts`
- `src/config.ts`, `src/types.ts`
- `index.html`, `vite.config.ts` (PWA manifest copy — user-visible)

## GM-only boundary — CLEAN

`grep -rn -i "old one vessel|second threshold|hidden condition|Greater
Dreadblood|Player Alterations|Bestiary"` over `src/`, `public/` and `index.html`
returns **zero** matches. No Hidden Condition Sheet content reaches any surface
in this scope. **No leak.**

One forward-looking note, recorded but **not** actionable as public UI:
`hidden-condition-sheet.txt [page 1]` twice instructs the GM to use stat blocks
"listed in the Bestiary inside The C&S app under **Player Alterations**". The
source therefore assumes a Bestiary surface in this app that does not exist. If
it is ever built, Old One Vessel / Lost forms are GM-only and must sit behind the
DM gate, never in the Codex or any player view.

---

## 1. `src/features/status/**` — the big-screen board

### B06-1 · The status board's Sanity bar tracks a value the beta says not to track
- **app_location**: `/src/features/status/components/StatusPage.tsx` → `VitalsCard`, lines 94–96 and 120–122 (`<Bar label="Sanity" value={san} max={sanMax} … sub={\`Madness ${card.madness ?? 0}\`} />`)
- **ui_or_logic_summary**: Every hunter's card on the TV board renders a purple bar of **Current Sanity / Max Sanity**, with current Madness demoted to a small subtitle. `san` comes from `characterVitals(card).sanityCur`.
- **found_in_txt**: **changed** — core-rulebook.txt [page 42] "Max Sanity and Madness": "Start with 0 Madness and **do not track Current Sanity**. Madness functions like damage against Max Sanity: when Madness equals or exceeds Max Sanity, you become Insane and gain the Insane Condition."
- **proposed_change**: **update** (minimal, no re-layout). Invert the bar: `value={card.madness ?? 0}`, `max={sanMax}`, `label="Madness"`, drop the `sub` prop. Bar fill then reads "how close to Insane", which is the direction the rule actually runs. Optionally append `· Insane` to the `dead`/status line when `madness >= sanMax`.
- **stored_data_impact**: `/characters/{id}.sanity` becomes read-only legacy. Migration: for records with `sanity` set and `madness` unset, backfill `madness = max(0, sanityMax - sanity)` (the app's own implied relationship), then strip `sanity`. Same remap as A03/B02 — do it once, not per surface.

### B06-2 · Unknown condition ids render as raw slugs on the shared screen
- **app_location**: `/src/features/status/components/CombatBoard.tsx` line 82–89 — `CONDITION_NAME[id] ?? id`
- **ui_or_logic_summary**: Condition chips fall back to the raw stored id when the id is not in `CONDITION_NAME`. `CONDITION_NAME` is built from `codex.generated.json.conditionsNamedByCurrentSources`, which is exactly **six** names: Blinded, Frightened, Incapacitated, Insane, Invisible, Restrained.
- **found_in_txt**: **changed** — the beta defines ~25 conditions (see A03); `poisoned` (core-rulebook.txt, 6 hits) and `prone` (29 hits) are both real conditions that this board would print as lowercase slugs today.
- **proposed_change**: **keep the fallback** (it is correct defensive behaviour) — the fix belongs in `src/data/conditions.ts` / the Codex generator (B03). No edit in `status/`. Record here only so the board is not "fixed" separately.
- **stored_data_impact**: none directly. Once the catalog is widened, stored `Combatant.conditions` ids (`/games/{id}` subcollection, not `/characters`) start resolving to proper names with no data change.

### B06-3 · The board's location chip renders the three-tier model the beta collapsed
- **app_location**: `/src/features/status/components/StatusPage.tsx` line 50–51 — `LOCATION_LABEL[liveGame.location ?? "wild"]`; source of truth `/src/features/play/lib/phase.ts` → `LOCATIONS`
- **ui_or_logic_summary**: Renders one of "The Wild" / "Safe Zone" / "Hunters Lodge" as a chip.
- **found_in_txt**: **changed** — core-rulebook.txt [page ~26] "Safe Zones": "A Safe Zone is a protected location designated by the GM. **The Hunter's Lodge is always a Safe Zone.**" The Lodge is an *instance* of Safe Zone, not a third tier.
- **proposed_change**: **none in this file** — A04 already owns the `LOCATIONS` model change. `StatusPage` reads the map and needs no edit once `phase.ts` is corrected.
- **stored_data_impact**: none for `/characters`. `/games/{id}.location === "lodge"` would remap to `"safe"` if the tier is collapsed.

---

## 2. `src/dev/preview.ts` — the seeded mock data (misleads QA today)

This file is DEV-only and never ships, but every screenshot run
(`bun run scripts/shots.mjs`, the simulator walkthrough) renders it, so stale
values here become stale expectations.

### B06-4 · The preview hunter's `classId` and displayed class name disagree
- **app_location**: `/src/dev/preview.ts` → `previewCard()` line 262 (`classId: "scout"`) vs line 311 (`sheet.class: "Stalker"`); same split in `previewParticipants()` line 156 (`classId: "scout", subclassId: "marksman", className: "Stalker"`).
- **ui_or_logic_summary**: Eileen is a Scout with the Scout subclass Marksman, but every sheet/lobby surface that prefers the saved `sheet`/`className` string labels her "Stalker".
- **found_in_txt**: both names are real and **distinct** classes — core-rulebook.txt "Hunter Scout" (`Speed 35ft`, Core Hunter Scout Traits) and "Hunter Stalker" (`8 + Con. modifier` HP row, [page 42]). Marksman is a **Scout** subclass (core-rulebook.txt, 3 hits).
- **proposed_change**: **update** — set `className: "Scout"` and `sheet.class: "Scout"`. One-word fix in two places.
- **stored_data_impact**: none (dev-only file).

### B06-5 · Preview sheet Speed is 30 ft; the beta gives the Scout 35 ft
- **app_location**: `/src/dev/preview.ts` → `previewCard().sheet.speed: "30 ft"` (line 346)
- **found_in_txt**: **changed** — core-rulebook.txt "Core Hunter Scout Traits": `Speed  35ft (7 sq)`. `src/data/classes.ts:106` already carries `speedFt: 35`, so the mock contradicts the app's own catalog too.
- **proposed_change**: **update** → `speed: "35 ft"`.
- **stored_data_impact**: none.

### B06-6 · Preview sheet `sanityMax` is 11; the beta formula gives 13
- **app_location**: `/src/dev/preview.ts` → `previewCard().sheet.sanityMax: "11"` (line 319), `sanityCur: "9"` (line 318)
- **ui_or_logic_summary**: Hand-written snapshot values that the paper sheet and the status board display verbatim for a sheet-carrying card.
- **found_in_txt**: **changed** — core-rulebook.txt [page 42]: "Your class entry gives your base Max Sanity; add your Wisdom modifier". Scout base Max Sanity is 12 (`src/data/classes.ts:104`); Eileen's WIS 12 ⇒ +1 ⇒ **13**. `sanityCur` should not exist at all (same page: "do not track Current Sanity").
- **proposed_change**: **update** → `sanityMax: "13"`; **remove** `sanityCur` once B06-1 / B02-1 land and add a `madness` value to `previewCard()` instead (e.g. `madness: 4`) so the Madness bar has something to render in screenshots.
- **stored_data_impact**: none (dev-only), but this mock is the shape the migration's dry run should be sanity-checked against.

### B06-7 · Preview inventory and equipment carry the Hunter Cleaver, which no longer exists
- **app_location**: `/src/dev/preview.ts` → `previewCard().inventory` line 295 (`{ itemId: "hunter-cleaver", qty: 1 }`), and `sheet.eq_1_0: "Hunter Cleaver"` (line 369)
- **found_in_txt**: **no** — "Hunter Cleaver" appears in **none** of the five txts. B03 already rules `hunter-cleaver` REMOVE from `weapons.ts`/`items.ts` (its `WEAPON_FACTS` row is a `damage: "—", "statistics set by the DM"` placeholder).
- **proposed_change**: **remove** both lines from the mock in the same change that removes the catalog entry; otherwise preview renders an unresolvable item id and the "legacy equipment" downgrade path (B01) fires on every screenshot. Replace with a real beta weapon the Scout starts with.
- **stored_data_impact**: none here — but the real records matter: any `/characters/{id}.inventory[].itemId === "hunter-cleaver"` and any `sheet.eq_*` cell reading "Hunter Cleaver" needs the same removal/remap decision in the migration script (B03 owns the catalog side).

### B06-8 · Preview backgrounds are three names that exist in neither the catalog nor the beta
- **app_location**: `/src/dev/preview.ts` — `previewCard().background: "Plague Doctor"` (line 263, mirrored at `sheet.background`), `previewPartyCards()` Gascoigne `sheet.background: "Cleric of the Old Ways"` (line 178), Henryk `background: "Old Hunter"` (line 201)
- **ui_or_logic_summary**: The builder and sheet resolve `background` against `src/data/backgrounds.ts` (14 ids: criminal, merchant, noble, drifter, church-missionary, cultist, street-warden, grave-tender, weaponsmith, archivist, beggar, oiler, graverobber, blood-collector). None of these three resolve, so the background's ability bonuses, feat, skills and tool silently contribute nothing in preview.
- **found_in_txt**: **no** — zero hits for "Plague Doctor", "Old Hunter" or "Cleric of the Old" across all five txts.
- **proposed_change**: **update** → use real catalog ids/names (e.g. Eileen → `"Grave Tender"`, Henryk → `"Drifter"`, Gascoigne → `"Church Missionary"`), so preview exercises the real background→feat→skill wiring instead of an inert string.
- **stored_data_impact**: none (dev-only). Real records already store valid ids.

### B06-9 · The archived preview hunter is a level-2 Hunter Zealot, which the beta forbids
- **app_location**: `/src/dev/preview.ts` → `previewArchive()` lines 244–249 — `classId: "deepcaller", subclassId: "hunter-zealot", level: 2, preparedWhispers: ["eldritch-blast", "mindcrack"]`
- **found_in_txt**: **changed** — core-rulebook.txt line 3125 places "Hunter Zealot Prestige Class (optional)" at **level 3** in the Deepcaller features table, and [the Zealot section] describes entry as an act taken "when you enter the Hunter Zealot Prestige Class". A level-2 Zealot is not reachable.
- **proposed_change**: **update** → bump Viktor to `level: 3` / `lastSeenLevel: 3` (cheapest), or drop `subclassId` to `null`. The two whisper ids (`eldritch-blast`, `mindcrack`) are both current — they exist in `codex.generated.json.whispers` and in whispers-sheet.txt — so leave them.
- **stored_data_impact**: none (dev-only). Worth a **validation rule in the migration script**, though: flag any stored `/characters/{id}` with `subclassId` set below the class's subclass level.

### B06-10 · Preview combatant conditions use ids the current catalog cannot name
- **app_location**: `/src/dev/preview.ts` → `previewCombatants()` lines 136–138 — `conditions: ["poisoned"]`, `["frightened"]`, `["prone"]`
- **ui_or_logic_summary**: Only `frightened` is in the six-name `CONDITION_NAME` map; the other two render as raw `poisoned` / `prone` chips in `CombatBoard` and in the play combat tracker.
- **found_in_txt**: **yes** — all three are real beta conditions; the app's *catalog* is the thing that is short (A03/B03).
- **proposed_change**: **keep** the mock as-is. It is currently the only thing in the repo demonstrating the raw-id fallback, and it becomes correct for free when the condition catalog is widened. No edit.
- **stored_data_impact**: none.

### B06-11 · Preview AC (14) matches the beta's Studs rule but not the code that computes it
- **app_location**: `/src/dev/preview.ts` → `studdedAddonIds: ["leather-pauldron-right"]` (line 278), `studdedAddons: 1` (line 279), `sheet.ac: "14"` (line 349), `sheet.studs1: true` (line 357)
- **ui_or_logic_summary**: Hunter Leather Coat (AC 12) + DEX +2 = 14. The saved snapshot says 14; the live calculator adds +1 for a single studded piece and says 15.
- **found_in_txt**: **changed** — A05/B02 establish that the Studs +1 requires **three** studded pieces, so 14 is the *post-fix* value and 15 is the current-code value. The mock is accidentally ahead of the code.
- **proposed_change**: **keep** `ac: "14"`; no edit needed once the Studs threshold is corrected. Do not "fix" this mock to 15.
- **stored_data_impact**: none here. Real cards: AC is derived, so it recomputes; only `sheet.ac` snapshots on legacy sheet-only records hold a stale printed number (B02-11 territory).

---

## 3. User-visible copy that names game concepts

### B06-12 · The PWA manifest advertises two features the app no longer has
- **app_location**: `/vite.config.ts` lines 39–42 — `manifest.description: "Companion app for our Catacombs & Starspawns campaign — sessions, hunter cards and the player's handbook."`
- **ui_or_logic_summary**: This string is the install prompt / home-screen app description — genuinely user-visible, and it is the *only* remaining reference to "sessions" and "the player's handbook" outside a legacy redirect. `src/features/sessions/**` does not exist; `/handbook` is a `LegacyCodexRedirect` (`src/app/App.tsx:68`).
- **found_in_txt**: **no** — "player's handbook" is not a C&S document name. The four current documents are the Book of the Deepcaller, Character Sheet, Hidden Condition Sheet and Whispers Sheet, plus the Core Rulebook.
- **proposed_change**: **update** → `"Companion app for our Catacombs & Starspawns campaign — hunters, live play and the Codex."`
- **stored_data_impact**: none.

### B06-13 · The Codex guide card omits the Core Rulebook, now the largest source
- **app_location**: `/src/features/campaigns/components/MainMenu.tsx` line 34 — `<GuideCard to="/codex" … body="Search the current Deepcaller book, Whispers, and printable character sheet—with the source shown for every answer." />`
- **ui_or_logic_summary**: Names the Codex's three player sources to the user.
- **found_in_txt**: **changed** — the beta adds `core-rulebook.txt` (126 pages), which B04 shows is entirely absent from `codex.generated.json` today. The copy is accurate about the *current broken state* and wrong about the intended one.
- **proposed_change**: **update**, sequenced with B04 step 2 (do not change the copy before the generator ingests the rulebook): `body="Search the Core Rulebook, the Book of the Deepcaller, the Whispers Sheet and the printable character sheet — with the source shown for every answer."`
- **stored_data_impact**: none.

### B06-14 · "cling to your Sanity" / "live HP & Sanity" — the beta tracks Madness, not Sanity
- **app_location**: `/src/features/campaigns/components/MainMenu.tsx` lines 24–26 ("cling to your Sanity"); `/src/features/auth/components/Landing.tsx` line 22 ("live HP & Sanity") and line 44 (`Feature body="A lobby, DM phases, and live HP / Sanity / Blood Tinge."`)
- **ui_or_logic_summary**: Marketing/flavour copy on the two entry screens, naming the resource the app claims to track live.
- **found_in_txt**: **changed** — core-rulebook.txt [page 42]: "Start with 0 Madness and do not track Current Sanity." Max Sanity remains a real, named value; *current* Sanity does not. Blood Tinge is fully current (core-rulebook.txt [page ~44]: "Once per round, when… you gain Blood Tinge. You can have only one Blood Tinge at a time.").
- **proposed_change**: **update**, one word each, no layout change: MainMenu → "hold back the Madness"; Landing line 22 → "live HP & Madness"; Landing line 44 → "live HP / Madness / Blood Tinge". Keep "Blood Tinge" exactly as spelled — it matches the source.
- **stored_data_impact**: none (copy only); the underlying field change is B06-1.

### B06-15 · "risk permadeath" overstates the beta's death rules
- **app_location**: `/src/features/auth/components/Landing.tsx` line 45 — `<Feature title="Trade & survive" body="Swap gear, claim loot from the fallen, risk permadeath." />`
- **found_in_txt**: **changed** — the beta defines **Favors** (core-rulebook.txt line ~2028: "The GM may award a Favor when a Hunter performs their duty…"), which A06 records as the resurrection mechanic with a 2-Favor cap and an Insight reset. Death is recoverable by an explicit rule; the app just doesn't model it yet.
- **proposed_change**: **update** → `"Swap gear, claim loot from the fallen, and spend Favors to come back."` — but only once Favors exist in the app (A06). Until then this is a **keep**: leave the copy alone rather than advertising an unimplemented mechanic. Flagged so it is not missed when A06 lands.
- **stored_data_impact**: none.

---

## 4. `src/types.ts` / `src/config.ts` vocabulary

### B06-16 · Three field doc-comments assert the beta doesn't define rules it now does
- **app_location**: `/src/types.ts` — `HunterCard.madness` (lines 538–540), `HunterCard.transformationLevel` (lines 541–544), `HunterCard.sanity` (lines 536–537)
- **ui_or_logic_summary**: Not user-visible, but these comments are the stated justification for the app's data model and will be read as authority by the next agent. All three are now false:
  - `madness`: *"tracked independently because the supplied hidden rules refer to it directly and do not define a Sanity-to-Madness formula"* — the **public** rulebook now defines it in full at [page 42], and the relationship is not "a formula" but a replacement: Madness is the only tracked pool.
  - `transformationLevel`: *"The supplied documents reference but do not include the Transformation Table"* — core-rulebook.txt line 1275 **is** the Transformation Table, and its results (e.g. `DREADBLOOD EARS`, line 1347) are printed. A04 flags the equivalent comment elsewhere; this one is in `types.ts` and must be fixed with it.
  - `sanity`: *"Current Sanity during play (defaults to max when unset)"* — contradicted verbatim by [page 42].
- **found_in_txt**: **changed** (all three).
- **proposed_change**: **update** the three comments; mark `sanity` `@deprecated` pointing at `madness`. No type change beyond deprecation.
- **stored_data_impact**: see B06-1 — `sanity` → `madness` remap on `/characters/{id}`.

### B06-17 · `HunterCard.bloodTinge` is described as "the C&S take on heroic inspiration"
- **app_location**: `/src/types.ts` line 550–551
- **found_in_txt**: **no** — "heroic inspiration" appears nowhere in the beta. Blood Tinge is defined on its own terms (once per round, one at a time, spend to reroll, lost on a Long Rest).
- **proposed_change**: **update** the comment to the source's own definition. The field, its name and its boolean shape are correct — **keep** those.
- **stored_data_impact**: none.

### B06-18 · `src/config.ts` carries no rules vocabulary — confirmed clean
- **app_location**: `/src/config.ts` → `Identity`, `Capabilities`, `capabilities()`, `isStaff()`, `fullName()`
- **ui_or_logic_summary**: Access-control model only (accessRole/playerType, `manageSessions`, `oversight`, `runGame`). The only game word is the `"Hunter"` display-name fallback, which is correct.
- **found_in_txt**: n/a — no game concept is named.
- **proposed_change**: **keep**. (Separately, and outside this reconciliation: `Capabilities.manageSessions` and `isStaff()` are vestiges of the deleted sessions feature and the retired global-staff model — a dead-code question for `knip`, not a rules question.)
- **stored_data_impact**: none.

### B06-19 · `src/app/**`, `src/components/**`, auth/campaign/profile stores — confirmed clean
- **app_location**: `/src/app/App.tsx`, `/src/components/*`, `/src/features/auth/store/authStore.ts`, `/src/features/campaigns/store/campaignStore.ts`, `/src/features/profile/components/*`
- **ui_or_logic_summary**: Every user-visible string in these files was read. They name only app concepts (Hunters, Games, Codex, Profile, campaign, invite, DM) and generic error text. `App.tsx:48–49` maps a legacy `?tab=rites` bookmark to `group=Rites`, which is still the correct Codex group name. `Splash`'s "Lighting the lantern…" is flavour, and the Lantern is real beta gear.
- **found_in_txt**: yes / n/a.
- **proposed_change**: **keep** — no edits.
- **stored_data_impact**: none.

---

## Summary of proposed edits in this scope

| # | File | Change |
|---|---|---|
| B06-1 | `status/StatusPage.tsx` | Sanity bar → Madness bar |
| B06-4 | `dev/preview.ts` | `className`/`sheet.class` "Stalker" → "Scout" |
| B06-5 | `dev/preview.ts` | `sheet.speed` 30 ft → 35 ft |
| B06-6 | `dev/preview.ts` | `sanityMax` 11 → 13; drop `sanityCur`, add `madness` |
| B06-7 | `dev/preview.ts` | remove `hunter-cleaver` from inventory + `eq_1_0` |
| B06-8 | `dev/preview.ts` | three invalid backgrounds → real catalog ids |
| B06-9 | `dev/preview.ts` | Zealot archive card level 2 → 3 |
| B06-12 | `vite.config.ts` | manifest description drops "sessions"/"player's handbook" |
| B06-13 | `campaigns/MainMenu.tsx` | Codex card names the Core Rulebook (after B04 step 2) |
| B06-14 | `MainMenu.tsx`, `Landing.tsx` | "Sanity" → "Madness" in three copy strings |
| B06-16/17 | `types.ts` | correct four stale field doc-comments; deprecate `sanity` |

No component is restyled, re-laid-out or re-navigated; every edit is a string,
a constant, or one prop swap inside an existing component.

**Stored-data impact, consolidated for the migration script:** the only
`/characters/{id}` change originating in this scope is the `sanity` → `madness`
remap (shared with A03/B02 — implement once). Everything else here is dev-only
mock data, copy, or comments. Two validation checks are worth adding to the dry
run because this scope surfaced them: (a) `subclassId` set below the class's
subclass level, and (b) `inventory[].itemId` / `sheet.eq_*` referencing
`hunter-cleaver`.
