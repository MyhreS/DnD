# ADR-001: One active game session per user

## Context

A user could previously own or join several lobby/live Game sessions at once.
Ending a session changed its status, but invitation and creation were direct
client writes and therefore could not reserve every participant atomically.

## Decision

Use `/activeGameSeats/{uid}` as a deterministic availability index. Standalone
session creation, roster changes, finishing, and discarding are callable Cloud
Functions backed by Firestore transactions. A function reserves the DM and all
players together or changes nothing. New client-created Game documents are
denied by Firestore rules.

An ended Game document and its combatants are retained as read-only history.
Finishing releases every seat; discarding is limited to an unstarted lobby and
removes it rather than creating history. The roster locks when play starts so
the saved participant list remains an accurate attendance record. Enemies can
be removed while preparing the lobby, but not after play starts; fought enemies
therefore remain in the saved encounter history.

## Consequences

- Concurrent invitations cannot place one user in two active sessions.
- The Game page can show player availability before an attempted invitation.
- Creation and roster changes require the callable Functions service to be up.
- Ended sessions use more Firestore storage because their roster and encounter
  documents are intentionally retained.

## Alternatives considered

- UI-only filtering was rejected because stale or modified clients could bypass
  it and concurrent DMs could still invite the same player.
- A field on `/users/{uid}` was rejected because DMs must reserve other users
  and normal users are only allowed to write their own profile.
- Firestore rules alone were rejected because rules cannot iterate an arbitrary
  participant list and verify a reservation document for every member.

## Rollout

The production audit on 2026-08-05 found no lobby or active Game documents, so
no conflicting sessions or seat backfill had to be resolved. Existing ended
sessions remain unchanged and continue to appear as history.

## Status

Accepted.
