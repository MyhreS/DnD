import assert from "node:assert/strict";
import { combatantBaseStats, resetEnemyPatch, templateStats } from "../src/features/game/lib/enemies";
import type { Combatant, EnemyTemplate } from "../src/types";

const template: EnemyTemplate = {
  id: "beast",
  name: "Cleric Beast",
  initiative: 14,
  ac: 13,
  maxHp: 80,
  note: "Howl",
  revealHp: false,
  revealStats: false,
  archived: false,
  createdAt: 1,
  updatedAt: 1,
};

assert.deepEqual(templateStats(template), {
  name: "Cleric Beast",
  initiative: 14,
  ac: 13,
  maxHp: 80,
  note: "Howl",
  revealHp: false,
  revealStats: false,
});

const damaged: Combatant = {
  id: "spawn",
  kind: "monster",
  name: "Renamed in battle",
  initiative: 3,
  ac: 9,
  maxHp: 50,
  currentHp: 7,
  conditions: ["poisoned"],
  conditionSince: { poisoned: 2 },
  note: "Changed",
  revealHp: true,
  revealStats: true,
  enemyTemplateId: template.id,
  baseStats: templateStats(template),
  createdAt: 1,
};

assert.deepEqual(resetEnemyPatch(damaged), {
  ...templateStats(template),
  currentHp: 80,
  damageTaken: null,
  defeated: false,
  conditions: [],
  conditionSince: {},
});

const legacy = { ...damaged, baseStats: null, maxHp: 50 };
assert.equal(combatantBaseStats(legacy).maxHp, 50, "legacy enemies reset to their stored maximum");
assert.equal(resetEnemyPatch(legacy).currentHp, 50, "legacy damage resets without a template snapshot");

// Unknown max HP: the enemy keeps no maximum and resets to an empty damage tally.
const unknown = { ...damaged, maxHp: null, currentHp: null, damageTaken: 12, baseStats: { ...templateStats(template), maxHp: null } };
assert.equal(combatantBaseStats(unknown).maxHp, null, "an unknown maximum stays unknown");
assert.equal(resetEnemyPatch(unknown).currentHp, null, "unknown-HP enemies reset without inventing HP");
assert.equal(resetEnemyPatch(unknown).damageTaken, 0, "unknown-HP enemies reset their damage tally");
assert.equal(combatantBaseStats({ ...unknown, baseStats: null }).maxHp, null, "a legacy row without HP stays unknown");

console.log("enemy library: ok");
