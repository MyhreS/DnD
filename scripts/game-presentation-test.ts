import { strict as assert } from "node:assert";
import { emptyEncounter } from "../src/features/play/lib/turnTimer";
import { automationFor } from "../src/features/hunter/lib/characterAutomation";
import { emptySheetCard } from "../src/lib/character";
import { combatVitals, hasSavedBattle, participantInitiative } from "../src/features/game/lib/combatPresentation";
import type { Combatant, HunterCard } from "../src/types";

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

const structured: HunterCard = {
  ...emptySheetCard({ ownerUid: "current", email: "current@example.com", displayName: "Current" }),
  name: "Current Warden",
  classId: "warden",
  level: 5,
  lastSeenLevel: 5,
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 14, cha: 10 },
  baseAbilities: { str: 10, dex: 14, con: 12, int: 10, wis: 14, cha: 10 },
  currentHp: 17,
  sheet: { hpCur: "1", hpMax: "1", ac: "1", initiative: "-9" },
  sheetAutomation: { version: 3, classSkills: [], backgroundBonuses: {}, setupComplete: true },
};
const expected = automationFor(structured).fields;
const pc: Combatant = {
  id: "pc-current",
  kind: "pc",
  name: structured.name,
  characterId: structured.id,
  initiative: 12,
  ac: null,
  maxHp: null,
  currentHp: null,
  conditions: [],
  createdAt: 1,
};
const currentVitals = combatVitals(pc, [structured]);
assert.equal(currentVitals.currentHp, 17, "battle view uses the current structured HP instead of a stale sheet snapshot");
assert.equal(currentVitals.maxHp, Number.parseInt(String(expected.hpMax), 10), "battle view recalculates maximum HP after upgrades");
assert.equal(currentVitals.ac, Number.parseInt(String(expected.ac), 10), "battle view recalculates Armor Class after equipment or ability changes");
assert.equal(participantInitiative(structured), Number.parseInt(String(expected.initiative), 10), "new encounters use the current calculated initiative");
assert.equal(combatVitals({ ...pc, currentHp: 9, ac: 21 }, [structured]).currentHp, 9, "an encounter HP override remains authoritative during that battle");
assert.equal(combatVitals({ ...pc, currentHp: 9, ac: 21 }, [structured]).ac, 21, "an encounter AC override remains authoritative during that battle");

const overridden: HunterCard = {
  ...structured,
  sheet: { ...structured.sheet, ac: "19", initiative: "+7" },
  sheetAutomation: { ...structured.sheetAutomation!, manualOverrides: ["ac", "initiative"] },
};
assert.equal(combatVitals(pc, [overridden]).ac, 19, "explicit migrated AC overrides remain intact");
assert.equal(participantInitiative(overridden), 7, "explicit migrated initiative overrides remain intact");

const legacy: HunterCard = {
  ...structured,
  id: "legacy-sheet",
  classId: "",
  currentHp: undefined,
  sheetAutomation: undefined,
  sheet: { hpCur: "8", hpMax: "12", ac: "15", initiative: "+1" },
};
const legacyPc = { ...pc, id: "pc-legacy", characterId: legacy.id, name: "Legacy Hunter" };
assert.deepEqual(
  combatVitals(legacyPc, [legacy]),
  { currentHp: 8, maxHp: 12, damageTaken: 4, ac: 15, speed: null },
  "legacy sheet-only Hunters retain their written combat values",
);
assert.equal(
  combatVitals(pc, [structured]).speed,
  Number.parseInt(String(expected.speed), 10),
  "the battle row shows the Hunter's derived speed",
);
assert.equal(participantInitiative(legacy), 1, "legacy sheet-only initiative remains supported");

console.log("Game presentation edge tests passed.");
