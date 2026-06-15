<div align="center">

# 🩸 Catacombs & Starspawns

**A private companion app for our tabletop campaign.**

*A Bloodborne-flavoured dark-fantasy homebrew where adventurers are **Hunters**.*

[Open the app →](https://dandd-ea955.web.app)

</div>

---

## What this is

A mobile-first web app (installable to your iPhone home screen) that makes our
**Catacombs & Starspawns** sessions easier to run and more fun to show up to.
It's just for our table — sign-in is required and access is invite-only.

It's deliberately small and sharp for the first run, built to grow.

## The goal

Lower the friction of playing together:

- Everyone knows **when** the next session is (and gets nudged to answer).
- Everyone **builds their hunter** without wrestling a PDF — the maths is done
  for you.
- Everyone can **read the rules** on their phone.
- The **Dungeon Master** can see who's ready and who needs a poke.

## What's in the first version

| Area | What it does |
| --- | --- |
| **Sessions** | The next session with a live countdown + upcoming dates. RSVP (in / maybe / can't). The DM can add & edit dates. |
| **Hunter** | Build & save your hunter card — class, point-buy abilities, skills, armor → auto-calculated AC, HP, speed, saves. |
| **Party** | See everyone's hunters. The DM gets a roster: who's made a character, who's RSVP'd, with one-tap email reminders. |
| **Handbook** | Browse the rules, all six classes, and the armory — plus the full PDF. |

All game content (classes, armory, rules) is **premade in code** and easy to
swap when the handbook is updated.

### The six hunter classes

Brute · Scout · Stalker · Deepcaller · Bloodbound · Warden

## Roles

- **Player** — builds a hunter, RSVPs, reads the handbook.
- **Dungeon Master** — runs the schedule, oversees the roster, sends reminders
  (doesn't need a character).
- **Admin** — everything, plus manages who has access.

The first session's DM is Christoffer; the campaign's admin is Simon.

## How to use it

1. Open **https://dandd-ea955.web.app** on your phone.
2. **Sign in with Google** using the email you were invited with.
3. On iPhone: tap **Share → Add to Home Screen** to install it as an app.
4. Players: go to **Hunter** and forge your character before session 1.
5. Everyone: **RSVP** to the next session on the Sessions screen.

> Not on the list? Ask Simon to add your Google email.

## Our focus

- **Mobile-first & app-like.** It should feel great on a phone, offline-tolerant,
  installable, with a proper icon and safe-area-aware layout.
- **Atmosphere.** Dark, gothic, blood-and-brass — it should feel like the world.
- **Low friction.** Sign in, see the date, build a hunter. No clutter.
- **Private & safe.** Google sign-in + an allowlist; data locked down by
  server-side rules.

## What might come later

Atmospheric music · automated email reminders (before sessions / for missing
characters) · a session log & recaps · a broader admin panel · AI narration and
voice. Possibly a native iOS shell using Apple's on-device Foundation Models.

## Tech

React 19 · TypeScript · Vite · Bun · Zustand · Firebase (Auth + Firestore +
Hosting) · vite-plugin-pwa. Config/secrets via Doppler. See
[`CLAUDE.md`](./CLAUDE.md) for developer setup, architecture and conventions.

---

<div align="center"><sub>Pray for blood. 🌙</sub></div>
