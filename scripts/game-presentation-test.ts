import { strict as assert } from "node:assert";
import { emptyEncounter } from "../src/features/play/lib/turnTimer";
import { hasSavedBattle } from "../src/features/game/lib/combatPresentation";

assert.equal(hasSavedBattle(emptyEncounter()), false, "a new session has no saved battle");
assert.equal(hasSavedBattle({
  ...emptyEncounter(),
  round: 1,
  timerPhase: "untimed",
}), false, "removed legacy timer state does not create a phantom battle");
assert.equal(hasSavedBattle({
  ...emptyEncounter(),
  round: 1,
  turnId: "combatant-1",
}), true, "an assigned turn proves battle started");
assert.equal(hasSavedBattle({
  ...emptyEncounter(),
  round: 2,
}), true, "an advanced round proves battle started even if its combatant was removed");

console.log("Game presentation edge tests passed.");
