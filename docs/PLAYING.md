# Playing flow — Catacombs & Starspawns

This is the design spec for how the app is used **at the table**, written in plain
language (not just in code). It captures every decision and requirement we've
agreed. Treat it as the source of truth for the "Play" experience; update it when
the flow changes.

Status legend: ✅ shipped · 🟡 in progress · ⬜ planned.

---

## 0. App structure — accounts, campaigns & the main menu ⬜

The app is moving from a single private group to an **open, multi-campaign**
experience (tracked by the **Multiplayer epic** + sub-issues on GitHub). The shape:

**Open & deferred sign-in (important).** The app is **public** — anyone can sign
in with Google and use it (it's no longer limited to one allowlisted group). The
**main menu / landing is visible without logging in**, so a newcomer can see what
the app & game is. **Don't force login up front** (bad UX): only **prompt Google
sign-in when an action requires it** (create/join a campaign, create or save a
character, RSVP, etc.). The old global **allowlist gate goes away** — access
control becomes **per-campaign membership** (you're in a campaign because you
created it or joined via its invite code), not a single app-wide allowlist.

- **Main menu (account home)** — the top-level screen (public; richer once signed
  in), like a game's main menu. From here you:
  - manage your **characters** — you can have **several**; this is where
    **character creation** lives (moved out of the in-campaign views);
  - **create a campaign** (a "server"/party) and become its **DM**, or **join**
    one via an **invite code / link**;
  - when joining/entering a campaign, **pick which character** to play with;
  - read the **Handbook** and an **About** of what the app & game is (also shown
    here so a newcomer understands it).
- **Inside a campaign** — once you enter, you get the experience the rest of this
  doc describes (Sessions, Party, Play, Handbook) — **scoped to that campaign**,
  and **without** character creation (that's in the main menu). A campaign has
  one DM (its creator, or whoever set themselves as DM).
- **Handbook** is available **both** at the main menu and inside a campaign.

Data model shift: characters become a **collection** (not one-per-user);
`/campaigns/{id}` owns its sessions/party/games; membership carries the chosen
character + an invite code. The sections below describe life **inside** a
campaign.

> **Early stage — no backwards compatibility.** We can restructure freely (drop
> the allowlist, reshape `/players` → characters, scope data under campaigns) and
> wipe existing data; no migrations required.

---

## 1. Two modes (maybe three) — inside a campaign

The app has distinct **modes**:

- **Menu mode** ✅ — the "out of game" home: upcoming **Sessions** + countdown,
  the **Party**, the **Handbook**, and full **character management**. You can
  build a hunter, **level up**, and make manual tweaks/fixes here at any time —
  e.g. if you missed a session, deleted something by mistake, or hit an app bug.
- **Play mode** 🟡 — the live, "at the table" experience (see §3).
- **Rest / wrap-up** ⬜ — the end-of-session flow: rests restore the party, you
  get a recap, and you prep for next time (see §6).

Moving between modes is free. **Exiting Play to the Menu does _not_ remove you
from the game** — see §3.4.

---

## 2. The game model — hybrid ✅

A **game** is one live play instance with a lifecycle: `lobby → active → ended`.

- **Per scheduled session (default):** the DM starts the next dated **Session**;
  the people who RSVP'd "yes" are expected in the lobby; a recap is saved onto
  that date afterward.
- **Ad-hoc:** the DM can also start a one-off game with no date, for impromptu
  play.

Only the **DM** (or staff: admin/moderator) can start and control a game. There
is one current non-sandbox game at a time; sandbox/test games (see §8) are
separate and hidden from normal views.

---

## 3. Play mode 🟡

### 3.1 Entering
Tap **Play**. If a game is running you go straight into it; otherwise you see the
lobby (or, for the DM, the "start a game" panel).

### 3.2 Lobby / waiting room ✅
A waiting room until the DM begins. Shows everyone present with a live **presence
dot**. Players **join** (they need a hunter first — if not, they're pointed to
create one, and the game waits for them). The DM presses **Begin** to start play.

### 3.3 In-game ✅ (dashboard 🟡)
While active:
- **Phase** (DM-set): **Exploration · Combat · Short Rest · Long Rest**. The
  current phase is shown to everyone. The DM can change it anytime.
- **The DM can stop the game whenever.** Stopping shows/records the current phase
  (so you know whether you stopped mid-combat, mid-rest, etc. and where to pick
  up next time).
- **Player dashboard:** your live **HP**, **Sanity**, **Blood Tinge**, plus
  **level-up**, **inventory**, and **trading**.

### 3.4 Exit-to-menu ≠ leave-game ✅
- **Exit to menu** keeps you in the game (you stay a participant). A pulsing
  **"return to the live game"** banner appears across the menu so you can hop
  back. Use this to fix your character mid-session (re-create a deleted hunter,
  level up, re-add items you remember having after a bug) and then return.
- **Leave game** is a separate, explicit action that removes you from the game.

---

## 4. Inventory & trading

### 4.1 Inventory ✅ — catalog-based
Each hunter carries items chosen from a **catalog** (weapons, armor, ammo, tools,
gear, consumables), grouped by the handbook's **carry significance**
(Insignificant / Significant / Oversized), plus **coins (GP)**. Carried weight
maps to a carry condition (Featherweight → Over Capacity). Editable on your own
hunter in both Menu and Play; read-only when viewing others. After a while it
should be **easy to see exactly what gear a hunter has**. Items can also change
hands by **trading** (§4.2) or by **claiming a dead hunter's dropped loot** (§7.3).

### 4.2 Trading 🟡 — direct, DM-visible
Player ↔ player: **A offers** items + coins and **requests** items + coins from
**B**; **B accepts** (or declines). On acceptance a **Cloud Function** transfers
everything **atomically** (neither client can write the other's character —
secure). Both sides see clear **"waiting for the other player / settling…"**
states. The **DM always sees a live trade log**.

---

## 5. The DM ⬜ (board) / 🟡 (controls)

The DM has a **management board** with, at all times:
- **Items overview** — every player's inventory + a game-wide item ledger.
- **Party status** — everyone's HP / Sanity / level / phase.
- **Trade log** — all trades in the game.
- **Characters** — see §7.
- **Controls** — start, set phase, **rest**, and **stop** (anytime).

---

## 6. Rest & wrap-up ⬜

D&D uses **Short Rest** and **Long Rest**. In C&S these restore HP and reset
per-rest class resources (and are relevant to Sanity). Sessions usually end with
a rest: the DM moves the game to a rest phase / ends the session, the party is
restored, and you get a **recap / overview** and prep for the next session.

**On session end the archive is purged** — see §7.

---

## 7. Character death, recovery & the archive ⬜

### 7.1 Death = permadeath, two-party confirmed
- Players **apply their own damage** in the app (tap damage taken).
- When HP reaches **0**, the hunter is **dead**.
- **Security:** death requires **both** confirmations — the **player** confirms
  ("I'm dead") **and** the **DM** verifies/confirms — before it takes effect.
- **DM override:** if a player refuses to confirm, the **DM can force-mark** the
  character dead.

### 7.2 Recovery & "saved on the DM side"
- Characters are **never hard-deleted** mid-session. Death (and even a player's
  own "delete character") **archives** the hunter instead.
- The **DM can recover** any archived character (e.g. a mistaken death/delete).
- **All characters are saved on the DM side**: the DM sees every character
  (active + archived) and has **full control** over what to do with each.

### 7.3 Dropped items (loot)
When a hunter dies they **drop their items**. The dropped items become a pile of
**unclaimed** loot (tied to the game / the body). Other characters can **pick up
/ claim** items from it (the items move into their inventory). Anything left
**unclaimed** when the session ends is **removed** (see §7.4).

### 7.4 Cleanup at session end
The DM doesn't want dead/deleted characters — or orphaned loot — hanging around
forever. **When the session/game ends:** archived (dead + deleted) characters are
purged, and any **still-unclaimed dropped items are removed**. Everything here is
recoverable/claimable only **during** the session.

---

## 8. Test runs / simulation ⬜

So we can verify the whole multiplayer flow without a real table:
- **No-Google login:** `bun run token <player|player2|admin|dm>` mints a real
  session via a Doppler-stored service account; open `?testToken=<token>`
  (DEV-only, stripped from production).
- **Admin simulation (desktop):** a real **sandbox** game with real test users
  (DM + 2 players), tagged and hidden from normal views and **auto-cleaned**. The
  admin **switches "act as"** between DM / Player 1 / Player 2 to walk the entire
  flow; the real Cloud Function settles real sandbox trades.
- **Playwright** drives the same test-play (three identities in separate browser
  contexts).

---

## 9. Cross-cutting requirements

- **Feedback on everything:** every button/action shows it registered — spinners
  + disabled states while pending, optimistic updates where safe, and clear
  **waiting** states (e.g. "waiting for the DM / the other player") so nobody
  spams a button.
- **Robust:** proper error handling and recovery; the right database + flow for
  async waits (trades, confirmations).
- **Responsive:** first-class on both **mobile** and **desktop** (desktop is the
  power-user view). Verify both sizes for every change (`bun run scripts/shots.mjs`).

---

## 10. Decisions log

- Trades: **direct** (A offers → B accepts), settled by a Cloud Function, **DM
  sees a log**.
- Game model: **hybrid** (per-session default + ad-hoc).
- Test runs: **real sandbox accounts** (not local mock).
- Death: **permadeath**, two-party confirm + **DM override** + **DM recover**;
  **soft-delete/archive**, **purged on session end**.
- Exit-to-menu **keeps** you in the game; leaving is explicit.

---

## 11. Build order (PRs)

1. ✅ Play foundation — lobby, live game, phases, DM stop, exit≠leave, banner.
2. ✅ Inventory (catalog) + carry.
3. ✅ Trading (`/trades` + Cloud Function settle + waiting states + DM log).
4. ✅ Character death + DM character control board (two-party confirm, DM
   override/recover, soft-archive, purge-on-end). *(Dropped loot — §7.3 — still
   pending, next.)*
5. ✅ Dropped loot (claim a dead hunter's items; purged at session end).
6. ✅ Rest & recap (short/long rest restores HP; post-session wrap-up).
7. ⬜ Menu-mode management polish (level-up/tweaks).
8. ⬜ Admin test-run simulation + Playwright test plays.
9. ⬜ **Multiplayer** (§0): accounts, campaigns/servers, multiple characters,
   main menu, invite codes — the big restructure.

Remaining work is tracked as **GitHub issues** (labels `play-epic` and
`multiplayer`; the Multiplayer epic links its sub-issues).

---

## 12. Data model (engineering)

- `/players/{uid}` — the hunter card (source of truth: abilities, level, HP,
  sanity, blood tinge, **inventory**, coins, **status/archive** fields).
- `/games/{id}` (+ `/participants/{uid}`) — live game: status, phase, DM, session
  link, presence.
- `/trades/{id}` — a trade (from/to, offer/request, status); settled by the
  `settleTrade` Cloud Function.
- Sandbox docs carry `sandbox: true` and are hidden + auto-cleaned.
