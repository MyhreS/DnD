import assert from "node:assert/strict";
import {
  beginCombat,
  expireTurnTimer,
  freshCombatSession,
  moveTurn,
  pauseTurnTimer,
  remainingSeconds,
  resumeTurnTimer,
  startTurnTimer,
} from "../src/features/combat/lib/combatRules";
import type { Combatant } from "../src/features/combat/types";
import { decodeCombatSession } from "../src/features/combat/lib/combatSessionCodec";

const warden: Combatant = {
  id: "warden",
  name: "Warden Vale",
  kind: "hunter",
  initiative: 18,
  armorClass: 16,
  maxHp: 24,
  currentHp: 24,
  conditions: [],
  classId: "warden",
  isWarden: true,
};
const beast: Combatant = {
  id: "beast",
  name: "Moon Beast",
  kind: "creature",
  initiative: 12,
  armorClass: 14,
  maxHp: 30,
  currentHp: 30,
  conditions: [],
  isWarden: false,
};

const base = {
  ...freshCombatSession(0),
  combatants: [beast, warden],
  designatedWardenId: warden.id,
};

const begun = beginCombat(base, 1_000);
assert.equal(begun.activeCombatantId, warden.id, "initiative should be sorted descending");
assert.equal(begun.timerPhase, "briefing", "designated Warden starts with unlimited briefing");
assert.equal(begun.timerEndsAt, null);

const timed = startTurnTimer(begun, 2_000);
assert.equal(timed.timerPhase, "running");
assert.equal(timed.timerEndsAt, 92_000);
assert.equal(remainingSeconds(timed, 2_001), 90);

const paused = pauseTurnTimer(timed, 32_000);
assert.equal(paused.timerPhase, "paused");
assert.equal(remainingSeconds(paused, 60_000), 60, "paused time must not drain");

const resumed = resumeTurnTimer(paused, 100_000);
assert.equal(resumed.timerEndsAt, 160_000);
assert.equal(expireTurnTimer(resumed, 159_999).timerPhase, "running");
assert.equal(expireTurnTimer(resumed, 160_000).timerPhase, "expired");

const beastTurn = moveTurn(resumed, 1, 200_000);
assert.equal(beastTurn.activeCombatantId, beast.id);
assert.equal(beastTurn.timerPhase, "untimed", "DM-controlled creatures are not timed");
assert.equal(beastTurn.timerEndsAt, null);

const nextRound = moveTurn(beastTurn, 1, 300_000);
assert.equal(nextRound.round, 2);
assert.equal(nextRound.activeCombatantId, warden.id);
assert.equal(nextRound.timerPhase, "briefing");

console.log("Combat rule tests passed");

assert.deepEqual(decodeCombatSession(base), base, "valid cached/remote sessions should decode");
assert.equal(decodeCombatSession({ ...base, turnDurationSeconds: 60 }), null);
assert.equal(decodeCombatSession({ ...base, combatants: [{ ...warden, name: "" }] }), null);
assert.equal(decodeCombatSession({ ...base, timerEndsAt: Number.NaN }), null);
console.log("Combat Firestore payload validation tests passed");
