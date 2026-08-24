# Using the Catacombs & Starspawns app

This document describes the current app flow. It is not a game-rules source.
The four PDFs under `resources/pdf/` and their exact structured transcription
in `resources/master.json` are the only current game sources.

## Reading the sources

The Codex is available without signing in. It searches the current Book of the
Deepcaller, Whispers, character sheet, and Hidden Condition handout. Open the
Source library to download any of the four PDFs. Each search result shows its
source and, where applicable, the relevant PDF page.

The supplied Book references three pieces of material that were not included:
the Lesser Starborn stat block, the Starborn Horror stat block, and the
Starborn Horror Behavior Table. The app identifies those gaps and does not
create substitutes.

## Keeping Hunters

Sign in with a verified Google account, open **Hunters**, and create or open a
Hunter. There is one responsive editor with the six sections on the supplied
sheet:

1. Identity & Abilities
2. Armor & Equipment
3. Equipment & Weapons
4. Class Features & Feats
5. Whispers & Rites
6. Notes

Fields save automatically. Class, background, subclass, equipment, weapon
values, features, feats, and progression are recorded as the table decides.
The app does not offer choices or calculate rules that are absent from the
current source set. Existing saved values remain readable and are copied into
the manual sheet when possible, but retired automation is never rerun.

## Running games

Any signed-in user can create a standalone game and becomes that game's DM.
The DM invites Hunters, starts the lobby, keeps shared notes, manages an enemy
library, starts battles, and ends or discards the session. A user can occupy
only one active game seat at a time; invitations and seat changes are handled
atomically by Cloud Functions.

During battle, the app uses only recorded sheet values for Hunter initiative,
HP, and Armor Class. New condition choices are limited to conditions explicitly
named by the current sources. Historical unknown condition labels can still be
displayed on old records without becoming new choices.

The DM may create an item found during an active session. When a player takes
it, its supplied fields are recorded in the first free Equipment row and, for a
weapon, the first free Weapons row. The app does not apply catalog rules or
derive armor, carrying, or attack values.

Ending a started game keeps read-only history and releases every reserved seat.
Discarding is for an unstarted lobby and does not create history.

## Table display

The **Status** route is a chrome-free large-screen view. It displays only values
already recorded on Hunters and the sanitized current battle state; blank
values remain blank.
