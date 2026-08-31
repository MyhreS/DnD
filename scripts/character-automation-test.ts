import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { emptySheetCard, normalizeCard } from "../src/lib/character";
import { CLASSES } from "../src/data/classes";
import { MADUHAUSU_BUDGET, POINT_BUY_BUDGET } from "../src/data/abilities";
import { BACKGROUNDS } from "../src/data/backgrounds";
import { EPIC_BOON_FEATS, FIGHTING_STYLE_FEATS, GENERAL_FEATS } from "../src/data/feats";
import { ITEMS } from "../src/data/items";
import { startingKit } from "../src/lib/startingEquipment";
import { availableSlotAssignmentOptions, computeSlots, slotAssignmentOptions } from "../src/lib/slots";
import { characterSheetUpdate } from "../src/features/hunter/lib/sheetPersistence";
import { DEEPCALLER_RITES, DEEPCALLER_WHISPERS, forbiddenRevelationLevel, forbiddenRevelationOptions, riteDamageAtStrain, TOOL_PROFICIENCIES, WHISPERS } from "../src/data/characterOptions";
import {
  automationFor,
  matchCatalogItem,
  structuredCardFromSheet,
} from "../src/features/hunter/lib/characterAutomation";
import { migrateLegacyCharacter } from "../src/features/hunter/lib/legacyMigration";
import { levelAdjustedPool } from "../src/features/hunter/lib/levelUpVitals";
import { levelForInsight } from "../src/lib/insight";
import { insightAwardPatch } from "../src/features/hunter/lib/insightAward";
import { earnedLevel, recordedOptionsFor, upgradeFeatureComplete, upgradeFeatures } from "../src/features/hunter/components/character-sheet/upgradeModel";
import { sessionsForCharacter } from "../src/features/hunter/lib/characterSessions";
import type { Game, HunterCard } from "../src/types";

assert.equal(levelForInsight(0), 1, "zero Insight is level one");
assert.equal(levelForInsight(6), 2, "an Insight threshold immediately earns its level");
assert.equal(levelForInsight(74), 5, "accumulated Insight retains all earlier levels");
assert.equal(levelForInsight(950), 20, "the final Insight threshold earns level twenty");
assert.equal(levelAdjustedPool(4, 10, 16, true), 16, "a pool is restored when a level-up increases its maximum");
assert.equal(levelAdjustedPool(4, 10, 10, true), 4, "a level-up does not restore a pool whose maximum did not increase");
assert.equal(levelAdjustedPool(18, 20, 12, false), 12, "a level reduction clamps a pool to its new maximum");

const base = emptySheetCard({ ownerUid: "test", email: "test@example.com", displayName: "Tester" });
assert.equal(base.sheetAutomation?.setupComplete, false, "fresh sheets start in guided setup even if the name is entered first");
assert.equal(base.sheetAutomation?.version, 3, "fresh sheets use point-buy automation state");
assert.equal(base.abilityMode, "pointbuy", "fresh sheets default to Standard point buy");
assert.deepEqual(base.sheetAutomation?.backgroundBonuses, {}, "fresh sheets start before background points are assigned");
assert.equal(base.madness, 0, "fresh sheets track Madness independently from Sanity");
const attendedSession: Game = {
  id: "attended", campaignId: "campaign-a", sessionId: null, title: "Attended", dmUid: "dm", dmName: "DM",
  participantUids: [base.ownerUid], participantRoster: [{ uid: base.ownerUid, characterId: base.id, name: base.name, classId: base.classId, level: base.level, role: "player", joinedAt: 1, lastSeen: 1 }],
  invitedUids: [], inviteRoster: [], status: "ended", phase: "exploration", clockRunning: false, clockStartedAt: null, clockElapsedMs: 0, createdAt: 1, endedAt: 2,
};
const unrelatedSession: Game = { ...attendedSession, id: "unrelated", campaignId: "campaign-b", participantRoster: [], createdAt: 3, endedAt: 4 };
assert.deepEqual(sessionsForCharacter([unrelatedSession, attendedSession], { ...base, campaignId: null }).map((game) => game.id), ["attended"], "standalone hunters only see sessions they attended");
assert.deepEqual(sessionsForCharacter([unrelatedSession, attendedSession], { ...base, campaignId: "campaign-a" }).map((game) => game.id), ["attended"], "campaign hunters see their campaign session journal");
assert.deepEqual(sessionsForCharacter([{ ...attendedSession, sandbox: true }], base), [], "test sessions never appear in character notes");
const warden = {
  ...base,
  classId: "warden",
  level: 1,
  abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 15, cha: 13 },
  skillProficiencies: [],
};

const normalizedLegacy = normalizeCard({
  ...warden,
  level: 4,
  sanity: 10,
  madness: undefined,
  abilities: { ...warden.abilities, str: 14 },
  baseAbilities: { ...warden.abilities, str: 11 },
  abilityMode: "pointbuy",
  sheetAutomation: {
    version: 1,
    classSkills: [],
    backgroundBonuses: { str: 2 },
    levelAbilityBonuses: { "4:ability score improvement": { str: 1 } },
  },
} as unknown as HunterCard);
assert.equal(normalizedLegacy.abilities.str, 14, "legacy conversion never changes a final ability score");
assert.equal(normalizedLegacy.baseAbilities?.str, 11, "legacy bought scores remain separate from later adjustments");
assert.equal(normalizedLegacy.sheetAutomation?.version, 3, "legacy automation upgrades to the restored point-buy shape");
assert.equal(normalizedLegacy.sheetAutomation?.backgroundBonuses?.str, 2, "legacy background adjustments remain structured");
assert.equal(normalizedLegacy.abilityMode, "pointbuy", "legacy score-method metadata remains available");
assert.equal(normalizedLegacy.madness, 6, "the previously displayed Madness value survives the independent-field migration");
const normalizedLegacyDeepcaller = normalizeCard({
  ...warden,
  classId: "deepcaller",
  level: 20,
  sanity: 30,
  madness: undefined,
  abilityMode: "pointbuy",
  sheetAutomation: { version: 1, classSkills: [], backgroundBonuses: {} },
} as unknown as HunterCard);
assert.equal(normalizedLegacyDeepcaller.madness, 7, "legacy Deepcaller Madness is preserved from the former uncapped display during migration");

const automaticLevel = insightAwardPatch({ ...warden, insight: 5, currentHp: 4, sanity: 3 }, 1);
assert.equal(automaticLevel.insight, 6, "Insight awards are accumulated, not spent to level");
assert.deepEqual(automaticLevel, { insight: 6 }, "Insight unlocks an upgrade without changing the saved level or pools");
assert.deepEqual(insightAwardPatch({ ...warden, level: 2, lastSeenLevel: 2, insight: 6 }, 1), { insight: 7 }, "additional Insight keeps the earned level and total");
assert.equal(earnedLevel({ ...warden, insight: 6 }), 2, "the upgrade model exposes the level earned by Insight");
const wardenUpgrade = upgradeFeatures(CLASSES.find((entry) => entry.id === "warden"), null, 1, 3);
assert.ok(wardenUpgrade.some((feature) => feature.level === 2 && /Expertise/i.test(feature.name)), "the upgrade preview lists level two features");
assert.ok(wardenUpgrade.some((feature) => feature.level === 3 && /Subclass/i.test(feature.name)), "the upgrade preview lists the subclass unlock");
assert.equal(GENERAL_FEATS.length, 29, "the established app feat catalog remains complete");
assert.equal(FIGHTING_STYLE_FEATS.length, 9, "all fighting styles are available inside upgrades");
assert.equal(EPIC_BOON_FEATS.length, 9, "all epic boons are available inside upgrades");
assert.deepEqual(CLASSES.find((entry) => entry.id === "scout")?.progressionColumns, ["Hunter's Mark"], "Scout progression uses the feature's canonical name");
assert.match(CLASSES.find((entry) => entry.id === "stalker")?.progression.find((row) => row.level === 7)?.features ?? "", /Reliable Talent/, "Stalker level seven names Reliable Talent correctly");
assert.match(CLASSES.find((entry) => entry.id === "deepcaller")?.progression.find((row) => row.level === 2)?.features ?? "", /Veiled Truth/, "Deepcaller level two matches its feature name");
assert.match(CLASSES.find((entry) => entry.id === "deepcaller")?.progression.find((row) => row.level === 10)?.features ?? "", /Fragments of an Eldritch Mind/, "Deepcaller level ten matches its feature name");
const abilityImprovement = upgradeFeatures(CLASSES[0], null, 3, 4).find((feature) => feature.name === "Ability Score Improvement")!;
assert.equal(upgradeFeatureComplete(abilityImprovement, { version: 2, classSkills: [], levelFeats: { [abilityImprovement.key]: "Ability Score Improvement" }, levelAbilityBonuses: { [abilityImprovement.key]: { str: 2 } } }), true, "a fully assigned structured ASI completes its upgrade page");
assert.equal(upgradeFeatureComplete(abilityImprovement, { version: 2, classSkills: [], levelFeats: { [abilityImprovement.key]: "Ability Score Improvement" }, levelAbilityBonuses: { [abilityImprovement.key]: { str: 1 } } }), false, "an unassigned ASI point keeps the upgrade incomplete");
const forbiddenRevelation = upgradeFeatures(CLASSES.find((entry) => entry.id === "deepcaller"), null, 10, 11)
  .find((feature) => /Forbidden Revelation/i.test(feature.name))!;
const revelationOptions = recordedOptionsFor(forbiddenRevelation);
assert.equal(forbiddenRevelationLevel(forbiddenRevelation.key), 6, "the level-six Revelation is read from its upgrade key");
assert.ok(revelationOptions.some((option) => option.value === "True Seeing"), "a Revelation offers current Rites of its own level");
assert.ok(revelationOptions.some((option) => option.value === "Eldritch Rebuke"), "a Revelation offers lower Rites with printed Higher-Level Strain rules");
assert.ok(!revelationOptions.some((option) => option.value === "Darkness"), "a Revelation does not invent higher-level behavior for a Rite without that option");
assert.equal(upgradeFeatureComplete(forbiddenRevelation, { version: 2, classSkills: [], levelChoices: { [forbiddenRevelation.key]: "True Seeing" } }), true, "a valid current-source Revelation completes the upgrade");
assert.equal(upgradeFeatureComplete(forbiddenRevelation, { version: 2, classSkills: [], levelChoices: { [forbiddenRevelation.key]: "Old removed Rite" } }), false, "an unavailable Rite cannot complete a Revelation choice");

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
assert.equal(automationFor({ ...warden, sheet: { hdCur: "0" } }).fields.hdCur, "0", "current Hit Dice survive recalculation");

const modifiedReadouts = automationFor({
  ...warden,
  sheet: {
    acModifier: "2",
    speedModifier: "5",
    passivePerceptionModifier: "-1",
    initiativeModifier: "3",
  },
});
assert.equal(modifiedReadouts.fields.ac, "13", "the AC modifier augments the armor calculation");
assert.equal(modifiedReadouts.fields.speed, "35 ft", "the speed modifier augments class speed");
assert.equal(modifiedReadouts.fields.passivePerception, "11", "the passive modifier augments passive Perception");
assert.equal(modifiedReadouts.fields.initiative, "+4", "the initiative modifier augments Dexterity");
assert.match(modifiedReadouts.reasons.ac, /custom modifier \+2/i, "the AC explanation names the custom modifier");

const skilled = automationFor({
  ...warden,
  skillProficiencies: ["Perception", "Survival"],
  sheetAutomation: { version: 2, classSkills: ["Perception", "Survival"] },
});
assert.equal(skilled.pending.classSkills, undefined);
assert.equal(skilled.fields.skPerceptionP, true);
assert.equal(skilled.fields.skSurvivalP, true);

const levelFive = automationFor({ ...warden, level: 5 });
assert.equal(levelFive.fields.profBonus, "+3");
assert.match(String(levelFive.fields.features1), /Level 5.*Effectiveness/i);
assert.match(String(levelFive.fields.features1), /Bands Directive Die: D8/i);
const boonHealth = automationFor({ ...warden, level: 19, feats: ["Boon of Fortitude"] });
assert.equal(Number(boonHealth.fields.hpMax) - Number(automationFor({ ...warden, level: 19 }).fields.hpMax), 40, "Boon of Fortitude previews its 40 maximum HP increase");

const levelThree = automationFor({ ...warden, level: 3 });
assert.equal(levelThree.pending.subclass?.remaining, 1);

const graveWarden = automationFor({ ...warden, level: 3, backgroundId: "grave-tender" });
assert.equal(graveWarden.fields.hpMax, "34", "Tough adds 2 HP per level");
const alertWarden = automationFor({ ...warden, backgroundId: "criminal" });
assert.equal(alertWarden.fields.initiative, "+3", "Alert adds proficiency to initiative");
const expertWarden = automationFor({
  ...warden,
  skillProficiencies: ["Perception", "Survival"],
  sheetAutomation: { version: 2, classSkills: ["Perception", "Survival"], expertiseSkills: ["Perception"] },
});
assert.equal(expertWarden.fields.skPerception, "+6", "Expertise applies its bonus twice");
assert.equal(expertWarden.reasons.skPerception, "WIS modifier + Expertise", "Expertise uses its named rule in the character sheet explanation");
const completedWardenLevelTwo = automationFor({
  ...warden,
  level: 2,
  lastSeenLevel: 2,
  skillProficiencies: ["Perception", "Survival"],
  sheetAutomation: { version: 2, classSkills: ["Perception", "Survival"], expertiseSkills: ["Perception", "Survival"] },
});
assert.equal(completedWardenLevelTwo.pending.levelChoices, undefined, "reviewed level-two expertise no longer appears as a pending level-up choice");
const listenerWarden = automationFor({ ...warden, backgroundId: "cultist" });
assert.equal(listenerWarden.pending.whispers?.remaining, 1, "Listener exposes its finite Whisper choice");

const deepcaller = automationFor({ ...warden, classId: "deepcaller", level: 5, sheet: { strainCur: "1" } });
assert.equal(deepcaller.fields.strainMax, "3", "Deepcaller strain allowance follows its level progression");
assert.equal(deepcaller.fields.strainCur, "1", "Deepcaller records remaining Strains separately from the allowance");
assert.equal(deepcaller.fields.strainLevel, "3", "Deepcaller strain level follows its level progression");
const cappedDeepcaller = automationFor({ ...warden, classId: "deepcaller", level: 1, sheet: { strainCur: "9" } });
assert.equal(cappedDeepcaller.fields.strainCur, "2", "remaining Strains cannot exceed the current allowance");
const levelThreeDeepcaller = automationFor({ ...warden, classId: "deepcaller", level: 3 });
assert.equal(levelThreeDeepcaller.pending.subclass, undefined, "Deepcallers may continue their core path instead of becoming Zealots at level three");
assert.match(String(levelThreeDeepcaller.fields.features1), /Opened Mind/, "a continuing Deepcaller receives their level-three core feature");
assert.equal(automationFor({ ...warden, classId: "deepcaller", level: 20 }).fields.sanityMax, "26", "Fracturing Mind caps the resulting Max Sanity at 26");
const zealot = automationFor({ ...warden, classId: "deepcaller", subclassId: "hunter-zealot", level: 3 });
assert.match(String(zealot.fields.features1), /Burn the Book/, "a Deepcaller can still choose the Zealot path at level three");

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

assert.equal(POINT_BUY_BUDGET, 27, "the Standard point buy stays at 27 points [core-rulebook page 32]");
assert.equal(MADUHAUSU_BUDGET, 57, "the alternative point buy stays at 57 points [core-rulebook page 32]");

/** Guard that the Rite/Whisper catalog matches the current sources and holds no
 * duplicates. The names come straight from the transcribed source documents. */
const sourceNames = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
  .replaceAll("\r\n", "\n")
  .split("\n")
  .filter((line) => line.startsWith("## "))
  .map((line) => line.slice(3).trim().toLowerCase());
const whisperSourceNames = sourceNames("../docs/rules/whispers-sheet.txt");
const riteSourceNames = sourceNames("../docs/rules/book-of-the-deepcaller.txt");
assert.equal(whisperSourceNames.length, 6, "the Whispers Sheet lists six Whispers");
assert.equal(riteSourceNames.length, 21, "the Book of the Deepcaller lists twenty-one Rites");
assert.deepEqual(WHISPERS.map((whisper) => whisper.name.toLowerCase()), whisperSourceNames, "Whisper dropdown matches the Whispers Sheet");
assert.deepEqual(DEEPCALLER_WHISPERS.map((whisper) => whisper.name.toLowerCase()), whisperSourceNames, "Whisper reference matches the Whispers Sheet");
assert.deepEqual(DEEPCALLER_RITES.map((rite) => rite.name.toLowerCase()), riteSourceNames, "Rite reference matches the Book of the Deepcaller");
assert.equal(new Set(DEEPCALLER_RITES.map((rite) => rite.id)).size, DEEPCALLER_RITES.length, "the Rite catalog has no duplicate ids");
assert.equal(new Set(DEEPCALLER_WHISPERS.map((whisper) => whisper.id)).size, DEEPCALLER_WHISPERS.length, "the Whisper catalog has no duplicate ids");
assert.ok(DEEPCALLER_RITES.some((rite) => rite.name === "Armor of the Drowned Star"), "Deepcaller reference uses Armor of the Drowned Star");
assert.ok(DEEPCALLER_RITES.some((rite) => rite.name === "Arms of Hastur"), "Deepcaller reference uses Arms of Hastur");
assert.ok(DEEPCALLER_RITES.some((rite) => rite.name === "Grasp of Yog-Sothoth"), "Deepcaller reference uses the current Grasp name");
assert.ok(DEEPCALLER_WHISPERS.every((whisper) => whisper.level === null), "Whispers are not assigned an invented level");
assert.equal(riteDamageAtStrain(DEEPCALLER_RITES.find((rite) => rite.id === "eldritch-rebuke")!, 4), "5d10", "Rite damage follows the printed higher-Strain rule");
assert.equal(riteDamageAtStrain(DEEPCALLER_RITES.find((rite) => rite.id === "eldritch-cacophony")!, 7), "12d6", "Rite damage scaling uses current Strain level");
assert.ok(forbiddenRevelationOptions(9).some((rite) => rite.id === "call-starborn-horror"), "level-nine Revelations include current level-nine Rites");
assert.ok(TOOL_PROFICIENCIES.includes("Poisoner's Kit") && TOOL_PROFICIENCIES.includes("Blood-drainer's Tools"));

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
const remainingBeltOptions = availableSlotAssignmentOptions({
  inventory: [{ itemId: "longsword", qty: 1 }, { itemId: "dagger", qty: 2 }],
  equippedStorageIds: ["tool-belt"],
  customItems: [],
  slotAssignments: {
    longsword: ["storage:tool-belt:3"],
    dagger: ["storage:tool-belt:1", "storage:tool-belt:2"],
  },
}, "dagger", 1, "Significant");
assert.ok(!remainingBeltOptions.some((option) => option.value === "storage:tool-belt:1"), "used storage compartments disappear from other item pickers");
assert.ok(!remainingBeltOptions.some((option) => option.value === "storage:tool-belt:3"), "a different equipped item's compartment is unavailable");
assert.ok(remainingBeltOptions.some((option) => option.value === "storage:tool-belt:2"), "the item's own selected compartment remains available so it can be changed");
assert.ok(remainingBeltOptions.some((option) => option.value === "storage:tool-belt:4"), "unused storage compartments remain selectable");
const invalidBeltSlot = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }], equippedStorageIds: ["tool-belt"], customItems: [],
  slotAssignments: { longsword: ["storage:tool-belt:5"] },
});
assert.equal(invalidBeltSlot.byItem.longsword, "Unassigned", "a storage assignment cannot exceed its numbered capacity");
const bandolierConsumesFront = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }], equippedStorageIds: ["bandolier"], customItems: [],
  slotAssignments: { longsword: ["chest"] },
});
assert.equal(
  bandolierConsumesFront.byItem.longsword,
  "Unassigned",
  "a normal Front assignment cannot silently spill into Bandolier slots",
);
const bandolierSlot = computeSlots({
  inventory: [{ itemId: "longsword", qty: 1 }], equippedStorageIds: ["bandolier"], customItems: [],
  slotAssignments: { longsword: ["storage:bandolier:1"] },
});
assert.equal(bandolierSlot.byItem.longsword, "Bandolier slot 1", "Bandolier slots require an explicit selection");

const uniqueHolsterWeapon = computeSlots({
  inventory: [{ itemId: "found-silver-pistol", qty: 1 }],
  equippedStorageIds: ["ankle-holster"],
  customItems: [{
    id: "found-silver-pistol", name: "Silver Pistol", category: "Weapon", carry: "Significant",
    weightLb: 2, unique: true, source: "found", catalogBaseId: "pistol",
  }],
  slotAssignments: { "found-silver-pistol": ["storage:ankle-holster:1"] },
});
assert.equal(uniqueHolsterWeapon.byItem["found-silver-pistol"], "Ankle Holster slot 1", "unique variants inherit catalog slot restrictions");

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
  { classId: "warden", sheetAutomation: { version: 2, classSkills: [] } },
  "DELETE",
  123,
);
assert.deepEqual(atomicUpdate, {
  updatedAt: 123,
  classId: "warden",
  sheetAutomation: { version: 2, classSkills: [] },
  level: 1,
  "sheet.class": "Warden",
  "sheet.hpMax": "12",
});

console.log("Character automation tests passed.");
