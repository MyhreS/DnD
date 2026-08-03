import assert from "node:assert/strict";
import type { Combatant } from "../src/types";
import {
  effectiveTimerPhase,
  emptyEncounter,
  formatTurnTime,
  normalizeEncounterState,
  pauseTurnTimer,
  remainingTurnMs,
  resumeTurnTimer,
  startTurnTimer,
  timerForCombatant,
} from "../src/features/play/lib/turnTimer";

const warden: Combatant = {
  id: "warden",
  kind: "pc",
  name: "Warden Vale",
  characterId: "warden-card",
  initiative: 18,
  conditions: [],
  isWarden: true,
  createdAt: 1,
};
const hunter: Combatant = {
  ...warden,
  id: "hunter",
  name: "Scout Eileen",
  isWarden: false,
};
const beast: Combatant = {
  ...warden,
  id: "beast",
  kind: "monster",
  name: "Moon Beast",
  characterId: null,
  isWarden: false,
};

assert.equal(timerForCombatant(warden, warden.id, 1_000).timerPhase, "briefing");
assert.equal(timerForCombatant(beast, warden.id, 1_000).timerPhase, "untimed");
assert.deepEqual(timerForCombatant(hunter, warden.id, 1_000), {
  timerPhase: "running",
  timerEndsAt: 91_000,
  pausedRemainingMs: null,
});

const briefing = {
  ...emptyEncounter(),
  active: true,
  round: 1,
  turnId: warden.id,
  designatedWardenId: warden.id,
  ...timerForCombatant(warden, warden.id, 1_000),
};
const running = startTurnTimer(briefing, 2_000);
assert.equal(running.timerEndsAt, 92_000);
assert.equal(remainingTurnMs(running, 2_001), 89_999);
assert.equal(formatTurnTime(remainingTurnMs(running, 2_001)), "1:30");

const paused = pauseTurnTimer(running, 32_000);
assert.equal(paused.timerPhase, "paused");
assert.equal(remainingTurnMs(paused, 80_000), 60_000, "paused time must not drain");
const resumed = resumeTurnTimer(paused, 100_000);
assert.equal(resumed.timerEndsAt, 160_000);
assert.equal(effectiveTimerPhase(resumed, 159_999), "running");
assert.equal(effectiveTimerPhase(resumed, 160_000), "expired");

const legacy = normalizeEncounterState({ active: true, round: 3, turnId: "legacy" });
assert.equal(legacy.timerPhase, "idle");
assert.equal(legacy.designatedWardenId, null);
assert.equal(normalizeEncounterState({ active: true, round: -3 }).round, 0);
assert.equal(normalizeEncounterState({ timerPhase: "invalid", timerEndsAt: Number.NaN }).timerPhase, "idle");

console.log("Combat turn timer rule tests passed");
