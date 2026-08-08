import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { emptySheetCard } from "../src/lib/character";
import { CLASSES } from "../src/data/classes";
import { BACKGROUNDS } from "../src/data/backgrounds";
import { ITEMS } from "../src/data/items";
import { startingKit } from "../src/lib/startingEquipment";
import { computeSlots, slotAssignmentOptions } from "../src/lib/slots";
import { characterSheetUpdate } from "../src/features/hunter/lib/sheetPersistence";
import { TOOL_PROFICIENCIES, WHISPERS } from "../src/data/characterOptions";
import {
  automationFor,
  matchCatalogItem,
  structuredCardFromSheet,
} from "../src/features/hunter/lib/characterAutomation";
import { migrateLegacyCharacter } from "../src/features/hunter/lib/legacyMigration";

const base = emptySheetCard({ ownerUid: "test", email: "test@example.com", displayName: "Tester" });
assert.equal(base.sheetAutomation?.setupComplete, false, "fresh sheets start in guided setup even if the name is entered first");
const warden = {
  ...base,
  classId: "warden",
  level: 1,
  abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 15, cha: 13 },
  skillProficiencies: [],
};

const levelOne = automationFor(warden);
assert.equal(levelOne.fields.class, "Warden");
assert.equal(levelOne.fields.level, "1");
assert.equal(levelOne.fields.profBonus, "+2");
assert.equal(levelOne.fields.hpMax, "12");
assert.equal(levelOne.fields.sanityMax, "16");
assert.equal(levelOne.fields.sanityDice, "4d4");
assert.equal(levelOne.fields.speed, "30 ft");
assert.equal(levelOne.fields.armorLight, true);
assert.equal(levelOne.fields.armorMedium, true);
assert.equal(levelOne.fields.armorHeavy, true);
assert.equal(levelOne.fields.wisSaveP, true);
assert.equal(levelOne.fields.chaSaveP, true);
assert.equal(levelOne.pending.classSkills?.remaining, 2);
assert.match(levelOne.reasons.hpMax, /Warden.*Hit Die.*Constitution/i);
assert.match(String(levelOne.fields.features1), /Bands Directive/i);
assert.match(String(levelOne.fields.features1), /Tactical Command/i);

const skilled = automationFor({
  ...warden,
  skillProficiencies: ["Perception", "Survival"],
  sheetAutomation: { version: 1, classSkills: ["Perception", "Survival"], backgroundBonuses: {} },
});
assert.equal(skilled.pending.classSkills, undefined);
assert.equal(skilled.fields.skPerceptionP, true);
assert.equal(skilled.fields.skSurvivalP, true);

const levelFive = automationFor({ ...warden, level: 5 });
assert.equal(levelFive.fields.profBonus, "+3");
assert.match(String(levelFive.fields.features1), /Level 5.*Effectiveness/i);
assert.match(String(levelFive.fields.features1), /Bands Directive Die: D8/i);

const levelThree = automationFor({ ...warden, level: 3 });
assert.equal(levelThree.pending.subclass?.remaining, 1);

const graveWarden = automationFor({ ...warden, level: 3, backgroundId: "grave-tender" });
assert.equal(graveWarden.fields.hpMax, "34", "Tough adds 2 HP per level");
const alertWarden = automationFor({ ...warden, backgroundId: "criminal" });
assert.equal(alertWarden.fields.initiative, "+3", "Alert adds proficiency to initiative");
const expertWarden = automationFor({
  ...warden,
  skillProficiencies: ["Perception", "Survival"],
  sheetAutomation: { version: 1, classSkills: ["Perception", "Survival"], expertiseSkills: ["Perception"], backgroundBonuses: {} },
});
assert.equal(expertWarden.fields.skPerception, "+6", "Expertise applies twice proficiency");
const listenerWarden = automationFor({ ...warden, backgroundId: "cultist" });
assert.equal(listenerWarden.pending.whispers?.remaining, 1, "Listener exposes its finite Whisper choice");

const bruteOne = automationFor({ ...warden, classId: "brute", lastSeenLevel: 0 });
assert.match(bruteOne.pending.levelChoices?.options?.join(" ") ?? "", /Fighting Style/i);

for (const klass of CLASSES) {
  for (let level = 1; level <= 20; level += 1) {
    const result = automationFor({ ...warden, classId: klass.id, level });
    assert.equal(result.fields.class, klass.name, `${klass.name} level ${level} class`);
    assert.notEqual(result.fields.hpMax, "", `${klass.name} level ${level} HP`);
    assert.notEqual(result.fields.sanityMax, "", `${klass.name} level ${level} Sanity`);
    assert.match(String(result.fields.features1), new RegExp(`Level ${level}`), `${klass.name} level ${level} features`);
  }
  assert.deepEqual(startingKit(klass, null).unmatched, [], `${klass.name} class kit maps to catalog`);
}
const deepcallerKit = startingKit(CLASSES.find((klass) => klass.id === "deepcaller"), null);
assert.ok(deepcallerKit.inventory.some((entry) => entry.itemId === "robe"), "Deepcaller class kit includes its robe");
assert.ok(deepcallerKit.inventory.some((entry) => entry.itemId === "book-of-eldritch-knowledge"), "Deepcaller class kit includes its book");
const equippedRobe = automationFor({
  ...warden,
  inventory: [{ itemId: "robe", qty: 1 }],
  extraArmorIds: ["robe"],
});
assert.equal(equippedRobe.fields.weight, "4 lb", "an equipped owned garment is not counted twice");
for (const background of BACKGROUNDS) {
  assert.deepEqual(startingKit(undefined, background).unmatched, [], `${background.name} background kit maps to catalog`);
}

const master = JSON.parse(readFileSync(new URL("../resources/master.json", import.meta.url), "utf8"));
const backgroundTables = master.handbook.chapters.find((chapter) => chapter.number === 3).sections[0].tables;
const loreRows = new Map(backgroundTables[0].rows.map((row) => [row[0], row]));
const ruleRows = new Map(backgroundTables[1].rows.map((row) => [row[0], row]));
const abilityKey = { Strength: "str", Dexterity: "dex", Constitution: "con", Intelligence: "int", Wisdom: "wis", Charisma: "cha" };
for (const background of BACKGROUNDS) {
  const lore = loreRows.get(background.name);
  const rules = ruleRows.get(background.name);
  assert.ok(lore && rules, `${background.name} exists in master.json`);
  assert.equal(background.text, lore[1], `${background.name} lore is verbatim`);
  assert.deepEqual(background.abilityScores, lore[2].split(", ").map((name) => abilityKey[name]), `${background.name} abilities`);
  assert.equal(background.feat, rules[1] === "(not legible in source)" ? null : rules[1], `${background.name} feat`);
  assert.deepEqual(background.skills, rules[2].split(" and "), `${background.name} skills`);
  assert.equal(background.tool, rules[3] === "—" ? null : rules[3], `${background.name} tool`);
  assert.deepEqual(background.equipment, rules[4] === "—" ? [] : rules[4].split(", "), `${background.name} equipment`);
}
assert.deepEqual(WHISPERS.map((whisper) => whisper.name), master.rites.whispers.whispers.map((whisper) => whisper.name), "Whisper dropdown matches master.json");
assert.ok(TOOL_PROFICIENCIES.includes("Poisoner's Kit") && TOOL_PROFICIENCIES.includes("Blood-drainer's Tools"));
for (const conflict of master.sourceConflicts.find((entry) => entry.topic.startsWith("Sanity")).perClass) {
  const klass = CLASSES.find((entry) => entry.id === conflict.class);
  assert.equal(`${klass.maxSanity} / ${klass.sanityDie}`, conflict.handbook, `${conflict.class} follows the master source resolution`);
}

const equipped = automationFor({
  ...warden,
  mainArmorId: "hunter-leather-vest",
  inventory: [{ itemId: "longsword", qty: 1 }],
});
assert.equal(equipped.fields.mainArmor, "Hunter Leather Vest");
assert.equal(equipped.fields.ac, "12");
assert.match(String(equipped.fields.eq_0_0), /Longsword/);
assert.equal(equipped.fields.weight, "9 lb");

const unassignedSlots = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }, { itemId: "dagger", qty: 2 }],
  equippedStorageIds: [],
  customItems: [],
});
assert.equal(unassignedSlots.byItem.longsword, "Unassigned", "equipment is not silently placed");
assert.equal(unassignedSlots.byItem.dagger, "Unassigned ×2", "each unchosen item is visibly unassigned");
const chosenSlots = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }, { itemId: "dagger", qty: 2 }],
  equippedStorageIds: [],
  customItems: [],
  slotAssignments: { longsword: ["back"], dagger: ["hip", "chest"] },
});
assert.equal(chosenSlots.byItem.longsword, "Back", "a selected slot is used");
assert.equal(chosenSlots.byItem.dagger, "Hip · Chest", "multiple units can use separate chosen slots");
const beltOptions = slotAssignmentOptions("Significant", ["tool-belt"], "longsword");
assert.deepEqual(
  beltOptions.filter((option) => option.value.startsWith("storage:" )).map((option) => option.label),
  ["Tool Belt slot 1", "Tool Belt slot 2", "Tool Belt slot 3", "Tool Belt slot 4"],
  "worn storage exposes individual numbered compartments",
);
for (const weapon of ITEMS.filter((item) => item.category === "Weapon")) {
  const locations = slotAssignmentOptions(weapon.carry, [], weapon.id, weapon.slotLocation);
  assert.ok(locations.some((location) => location.value === "hand"), `${weapon.name} can be carried in Hand`);
}
const beltSlots = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }, { itemId: "dagger", qty: 2 }],
  equippedStorageIds: ["tool-belt"],
  customItems: [],
  slotAssignments: {
    longsword: ["storage:tool-belt:3"],
    dagger: ["storage:tool-belt:1", "storage:tool-belt:2"],
  },
});
assert.equal(beltSlots.byItem.longsword, "Tool Belt slot 3", "a selected tool belt compartment is shown by name");
assert.equal(beltSlots.byItem.dagger, "Tool Belt slot 1 · Tool Belt slot 2", "separate items can use separate tool belt compartments");
assert.equal(beltSlots.unstowed.length, 0, "numbered storage compartments hold the selected items");
const invalidBeltSlot = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }], equippedStorageIds: ["tool-belt"], customItems: [],
  slotAssignments: { longsword: ["storage:tool-belt:5"] },
});
assert.equal(invalidBeltSlot.byItem.longsword, "Unassigned", "a storage assignment cannot exceed its numbered capacity");

const foundGear = automationFor({
  ...warden,
  mainArmorId: "found-moon-plate",
  customItems: [
    {
      id: "found-moon-plate",
      name: "Moon Plate",
      category: "Armor",
      carry: "Significant",
      weightLb: 8,
      note: "Glows near Dreadbloods.",
      unique: true,
      source: "found",
      armorCategory: "Main Armor",
      acValue: 14,
    },
    {
      id: "found-bone-saw",
      name: "Bone Saw",
      category: "Weapon",
      carry: "Significant",
      weightLb: 4,
      unique: true,
      source: "found",
      damage: "1d8 slashing",
    },
  ],
  inventory: [{ itemId: "found-bone-saw", qty: 1 }],
});
assert.equal(foundGear.fields.mainArmor, "Moon Plate");
assert.equal(foundGear.fields.ac, "15", "found armor participates in normal Dexterity AC math");
assert.match(String(foundGear.fields.eq_0_0), /Bone Saw/);
assert.equal(foundGear.fields.weight, "12 lb", "found armor and weapons both count toward weight");
assert.match(String(foundGear.fields.special), /Glows near Dreadbloods/);

assert.equal(matchCatalogItem("Hunter Rifle"), "hunter-rifle");
assert.equal(matchCatalogItem("2 Hunting Traps"), "hunting-trap");
assert.equal(matchCatalogItem("something handwritten"), null);

const migrated = structuredCardFromSheet({
  ...base,
  sheet: {
    name: "Old Warden",
    class: "Hunter Warden",
    level: "3",
    strScore: "12",
    dexScore: "10",
    conScore: "14",
    intScore: "9",
    wisScore: "15",
    chaScore: "13",
    eq_0_0: "Hunter Rifle",
    eq_0_1: "Significant",
    eq_0_3: "10 lb",
    eq_1_0: "Grandfather's charm",
  },
});
assert.equal(migrated.card.classId, "warden");
assert.equal(migrated.card.level, 3);
assert.equal(migrated.card.abilities.wis, 15);
assert.deepEqual(migrated.card.inventory, [{ itemId: "hunter-rifle", qty: 1 }]);
assert.deepEqual(migrated.legacyEquipment.map((item) => item.name), ["Grandfather's charm"]);

const centralMigration = migrateLegacyCharacter({
  ...base,
  sheet: {
    name: "Old Bloodbound",
    class: "Bloodbound",
    level: "3",
    mainArmor: "Robe of the deepcaller",
    headGear: "No",
    eq_0_0: "Vile",
    eq_1_0: "Bullets (14-1)",
    eq_2_0: "Reinforced Hunter Leather Coat",
  },
}, 1234);
assert.equal(centralMigration.patch.classId, "bloodbound");
assert.equal(centralMigration.patch.backgroundId, "blood-collector", "blank background uses the closest thematic rules entry");
assert.equal(centralMigration.patch.subclassId, CLASSES.find((entry) => entry.id === "bloodbound")?.subclasses[0].id);
assert.equal(centralMigration.patch.mainArmorId, null, "a robe is not guessed to be main armor");
assert.deepEqual(centralMigration.patch.extraArmorIds, [], '"No" is not guessed to be worn equipment');
assert.deepEqual(centralMigration.patch.inventory, [
  { itemId: "blood-vial", qty: 1 },
  { itemId: "bullets", qty: 13 },
  { itemId: "reinforced-hunter-leather-coat", qty: 1 },
]);
assert.equal(centralMigration.patch.sheetAutomation?.setupComplete, true);
assert.equal(centralMigration.patch.sheetAutomation?.migratedAt, 1234);
assert.equal(centralMigration.patch.sheetAutomation?.migrationOriginalEquipment?.length, 3);

const atomicUpdate = characterSheetUpdate(
  { class: "Warden", hpMax: "12", untouched: "old" },
  ["class", "hpMax"],
  { level: 1 },
  { classId: "warden", sheetAutomation: { version: 1, classSkills: [], backgroundBonuses: {} } },
  "DELETE",
  123,
);
assert.deepEqual(atomicUpdate, {
  updatedAt: 123,
  classId: "warden",
  sheetAutomation: { version: 1, classSkills: [], backgroundBonuses: {} },
  level: 1,
  "sheet.class": "Warden",
  "sheet.hpMax": "12",
});

console.log("Character automation tests passed.");
