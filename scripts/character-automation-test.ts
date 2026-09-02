import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { armorClass, emptySheetCard, isBloodied, isWeaponProficient, normalizeCard, weaponAttackBonus, wornArmorWeight } from "../src/lib/character";
import { carryCondition } from "../src/lib/inventory";
import { deriveSheetFromCard } from "../src/features/hunter/lib/deriveSheetFromCard";
import { CLASSES, getClass } from "../src/data/classes";
import { MADUHAUSU_BUDGET, POINT_BUY_BUDGET } from "../src/data/abilities";
import { BACKGROUNDS } from "../src/data/backgrounds";
import { EPIC_BOON_FEATS, FIGHTING_STYLE_FEATS, GENERAL_FEATS } from "../src/data/feats";
import { ITEMS } from "../src/data/items";
import { BLOODVIAL_ITEM_ID, BLOODVIAL_PURITIES, BLOODVIAL_PURITY_BY_ID, bloodvialEffectLabel, bloodvialFailureLabel, cardBloodvialPurity } from "../src/data/bloodvial";
import { startingKit } from "../src/lib/startingEquipment";
import { availableSlotAssignmentOptions, computeSlots, slotAssignmentOptions } from "../src/lib/slots";
import { characterSheetUpdate } from "../src/features/hunter/lib/sheetPersistence";
import { WEAPON_FACTS } from "../src/data/weapons";
import { ALWAYS_PREPARED_ZEALOT_IDS, DEEPCALLER_RITES, DEEPCALLER_WHISPERS, forbiddenRevelationLevel, forbiddenRevelationOptions, riteDamageAtStrain, TOOL_PROFICIENCIES, WHISPERS } from "../src/data/characterOptions";
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
// --- core-rulebook.txt [page 35] "Studs" ---------------------------------
// "If at least three Add-on Armor pieces are studded, you gain +1 AC. If five
// are studded, this bonus increases to +2 AC." "Each studded piece adds 5 lb."
const studAddons = [
  "leather-pauldron-right",
  "leather-pauldron-left",
  "leather-vambrace-right",
  "leather-vambrace-left",
  "under-layer-leather-jerkin",
];
const studAbilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
const studBonusFor = (count: number) =>
  armorClass(studAbilities, "hunter-leather-vest", studAddons, studAddons.slice(0, count)).studBonus;
assert.equal(studBonusFor(0), 0, "no studded add-on grants no AC");
assert.equal(studBonusFor(1), 0, "one studded add-on is below the beta's three-piece threshold");
assert.equal(studBonusFor(2), 0, "two studded add-ons are below the beta's three-piece threshold");
assert.equal(studBonusFor(3), 1, "three studded add-ons grant +1 AC");
assert.equal(studBonusFor(4), 1, "four studded add-ons still grant +1 AC");
assert.equal(studBonusFor(5), 2, "five studded add-ons grant +2 AC");
const studWeightCard = { ...base, mainArmorId: null, addonArmorIds: studAddons, extraArmorIds: [], customItems: [] };
const bareAddonWeight = wornArmorWeight({ ...studWeightCard, studdedAddonIds: [] });
assert.equal(
  wornArmorWeight({ ...studWeightCard, studdedAddonIds: studAddons.slice(0, 3) }),
  bareAddonWeight + 15,
  "each studded add-on adds 5 lb of carried weight",
);

// --- core-rulebook.txt [page 29] "Bloodied" -------------------------------
assert.equal(isBloodied(5, 10), true, "exactly half the Hit Point maximum is Bloodied");
assert.equal(isBloodied(6, 10), false, "above half the Hit Point maximum is not Bloodied");
assert.equal(isBloodied(5, 11), true, "half the maximum rounds down");
assert.equal(isBloodied(6, 11), false, "one above the rounded-down half is not Bloodied");
assert.equal(isBloodied(undefined, 10), false, "an unknown current HP is never Bloodied");

// --- core-rulebook.txt [page 40] carried-weight table ----------------------
assert.match(
  carryCondition(10, 60).note,
  /Dexterity \(Acrobatics and Stealth\) checks and Dexterity saving throws/,
  "Encumbered carries the full source effect, not only the speed reduction",
);
assert.equal(carryCondition(10, 60).speedDelta, -10, "Encumbered still reduces speed by 10 ft");
assert.equal(carryCondition(10, 20).speedDelta, 5, "Featherweight still increases speed by 5 ft");
assert.equal(carryCondition(10, 120).speedDelta, -20, "Heavily Encumbered still reduces speed by 20 ft");

// --- core-rulebook.txt [page 26] "Getting same Transformations" ------------
assert.deepEqual(
  normalizeCard({ ...base, activeTransformations: ["claws", "claws", "eyes"] }).activeTransformations,
  ["claws", "eyes"],
  "Active Transformations do not stack with themselves",
);
const withoutTransformations = { ...base };
delete withoutTransformations.activeTransformations;
assert.equal(
  "activeTransformations" in normalizeCard(withoutTransformations),
  false,
  "normalization never invents an Active Transformations list",
);


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
assert.match(CLASSES.find((entry) => entry.id === "deepcaller")?.progression.find((row) => row.level === 2)?.features ?? "", /Vailed Truth/, "Deepcaller level two matches its feature name");
assert.match(CLASSES.find((entry) => entry.id === "deepcaller")?.progression.find((row) => row.level === 10)?.features ?? "", /Fragments of a Eldritch Mind/, "Deepcaller level ten matches its feature name");
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

// --- Battle Master maneuvers (core-rulebook.txt [page 52]) -------------------
const brute = CLASSES.find((entry) => entry.id === "brute");
const maneuverSlots = upgradeFeatures(brute, "battle-master", 0, 15).filter((feature) => /^Maneuver \d+$/.test(feature.name));
assert.equal(maneuverSlots.length, 9, "three maneuvers at level 3 plus two each at 7, 10 and 15");
assert.deepEqual(maneuverSlots.map((feature) => feature.level), [3, 3, 3, 7, 7, 10, 10, 15, 15]);
assert.ok(maneuverSlots.every((feature) => feature.choice), "every maneuver slot asks for a decision");
assert.equal(
  upgradeFeatures(brute, "champion", 0, 15).some((feature) => /^Maneuver \d+$/.test(feature.name)),
  false,
  "only the Battle Master learns maneuvers",
);
const firstSlot = maneuverSlots[0];
const secondSlot = maneuverSlots[1];
assert.equal(recordedOptionsFor(firstSlot).length, 14, "all fourteen maneuvers are offered to an empty slot");
const withRiposte = { version: 2 as const, classSkills: [], levelChoices: { [secondSlot.key]: "Riposte" } };
assert.equal(
  recordedOptionsFor(firstSlot, withRiposte).some((option) => option.value === "Riposte"),
  false,
  "a maneuver taken in another slot is not offered again",
);
assert.ok(
  recordedOptionsFor(secondSlot, withRiposte).some((option) => option.value === "Riposte"),
  "the slot's own recorded maneuver stays selectable",
);
assert.equal(upgradeFeatureComplete(firstSlot, withRiposte), false, "an unfilled maneuver slot blocks the upgrade");
assert.equal(upgradeFeatureComplete(secondSlot, withRiposte), true, "a recorded maneuver completes its slot");
assert.equal(
  upgradeFeatureComplete(firstSlot, { version: 2, classSkills: [], levelChoices: { [firstSlot.key]: "Not a maneuver" } }),
  false,
  "a value outside the catalog never completes a maneuver slot",
);

const levelOne = automationFor(warden);
assert.equal(levelOne.fields.class, "Warden");
assert.equal(levelOne.fields.level, "1");
assert.equal(levelOne.fields.profBonus, "+2");
assert.equal(levelOne.fields.hpMax, "12");
assert.equal(levelOne.fields.sanityMax, "16");
assert.equal(levelOne.fields.sanityDice, "4d4");
// 30 ft base + 5 ft Featherweight: this fixture carries nothing, and
// core-rulebook.txt [page 40] grants +5 ft at or below Strength × 2.
assert.equal(levelOne.fields.speed, "35 ft");
assert.match(levelOne.reasons.speed, /Featherweight/, "the speed explanation names the carrying condition");
assert.equal(levelOne.fields.armorLight, true);
assert.equal(levelOne.fields.armorMedium, true);
assert.equal(levelOne.fields.armorHeavy, true);
assert.equal(levelOne.fields.wisSaveP, true);
assert.equal(levelOne.fields.chaSaveP, true);
assert.equal(levelOne.pending.classSkills?.remaining, 2);
assert.match(levelOne.reasons.hpMax, /Warden.*Hit Die.*Constitution/i);
assert.match(String(levelOne.fields.features1), /Bands Directive/i);
assert.match(String(levelOne.fields.features1), /Demoralize/i);
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
assert.equal(modifiedReadouts.fields.speed, "40 ft", "the speed modifier augments class speed on top of the carrying condition");
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
assert.equal(equippedRobe.fields.weight, "2 lb", "an equipped owned garment is not counted twice [core-rulebook page 124: Robe of the Deepcallers, 2 lb.]");
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

// The legacy paper-sheet projection must agree with the app sheet's own
// projection — same Expertise multiplier, same custom modifiers, same feats.
for (const sample of [base, warden]) {
  const derived = deriveSheetFromCard(sample);
  const calculated = automationFor(sample).fields;
  for (const [key, value] of Object.entries(derived)) {
    assert.equal(value, calculated[key], `deriveSheetFromCard disagrees with automationFor on ${key}`);
  }
}

// --- Batch 4 wave B: derived speed, saves, Passive Perception, mastery -------

// Roving — core-rulebook.txt [page 58]: +10 ft from Scout level 6 while not
// wearing Heavy armor.
const scoutSix = { ...warden, classId: "scout", level: 6 } as HunterCard;
assert.equal(automationFor(scoutSix).fields.speed, "50 ft", "Roving adds 10 ft to an unarmored level-six Scout (35 ft base + 10 Roving + 5 Featherweight)");
assert.match(automationFor(scoutSix).reasons.speed, /Roving/, "the speed explanation names Roving");
assert.equal(
  automationFor({ ...scoutSix, level: 5 } as HunterCard).fields.speed,
  "40 ft",
  "Roving does not apply before level six",
);

// Speedy [page 103] and Boon of Speed [page 106].
assert.equal(automationFor({ ...warden, feats: ["Speedy"] } as HunterCard).fields.speed, "45 ft", "Speedy adds 10 ft to the Warden's 35 ft");
assert.equal(automationFor({ ...warden, feats: ["Boon of Speed"] } as HunterCard).fields.speed, "65 ft", "Boon of Speed adds 30 ft");

// Carrying condition [page 40]: the speed delta reaches the sheet.
const encumbered = { ...warden, inventory: [{ itemId: "greatclub", qty: 12 }] } as HunterCard;
assert.equal(String(automationFor(encumbered).fields.weightCondition), "Heavily Encumbered", "the loaded fixture is Heavily Encumbered");
assert.equal(automationFor(encumbered).fields.speed, "10 ft", "a Heavily Encumbered hunter loses 20 ft of speed");

// Slippery Mind — core-rulebook.txt [page 65].
const stalker15 = { ...warden, classId: "stalker", level: 15 } as HunterCard;
assert.equal(automationFor(stalker15).fields.wisSaveP, true, "Slippery Mind grants Wisdom save proficiency at level fifteen");
assert.equal(automationFor(stalker15).fields.chaSaveP, true, "Slippery Mind grants Charisma save proficiency at level fifteen");
assert.equal(
  automationFor({ ...stalker15, level: 14 } as HunterCard).fields.wisSaveP,
  false,
  "Slippery Mind does not apply before level fifteen",
);

// Passive Perception — core-rulebook.txt [page 43] uses the full Wisdom
// (Perception) check modifier, so Expertise doubles proficiency.
const perceptive = {
  ...warden,
  skillProficiencies: ["Perception"],
  sheetAutomation: { version: 2, classSkills: ["Perception"], expertiseSkills: ["Perception"] },
} as HunterCard;
assert.equal(automationFor(perceptive).fields.passivePerception, "16", "Expertise doubles proficiency in Passive Perception");
assert.equal(
  automationFor({ ...perceptive, sheetAutomation: { version: 2, classSkills: ["Perception"] } } as HunterCard).fields.passivePerception,
  "14",
  "plain Perception proficiency adds the bonus once",
);

// Baseline attack modifiers — core-rulebook.txt [page 43].
assert.equal(levelOne.fields.meleeAttack, "+2", "melee attack is Strength modifier plus proficiency");
assert.equal(levelOne.fields.rangedAttack, "+3", "ranged attack is Dexterity modifier plus proficiency");

// Zealot prepared-Whisper limit — core-rulebook.txt [page 76].
const zealotCard = {
  ...warden,
  classId: "deepcaller",
  subclassId: "hunter-zealot",
  level: 3,
  preparedWhispers: [],
} as HunterCard;
const plainDeepcallerCard = { ...zealotCard, subclassId: null } as HunterCard;
assert.equal(
  (automationFor(zealotCard).pending.whispers?.remaining ?? 0) - (automationFor(plainDeepcallerCard).pending.whispers?.remaining ?? 0),
  1,
  "a level-three Zealot prepares one additional Whisper",
);
assert.deepEqual(
  [...ALWAYS_PREPARED_ZEALOT_IDS].sort(),
  ["armor-of-the-drowned-star", "eldritch-strike"],
  "the two Carved entries are always prepared and never count against the limit",
);
assert.ok(
  DEEPCALLER_RITES.some((rite) => rite.id === "armor-of-the-drowned-star" && rite.level === 1),
  "Armor of The Drowned Star is a Level 1 Rite, so the Zealot option list must search Rites too",
);

// Derived weapon-mastery filters — core-rulebook.txt [pages 63, 87].
const weaponItems = ITEMS.filter((item) => item.category === "Weapon");
assert.deepEqual(weaponItems.filter((item) => !WEAPON_FACTS[item.id]).map((item) => item.id), [], "every catalog weapon has weapon facts");
const stalkerMastery = weaponItems.filter((item) => {
  const facts = WEAPON_FACTS[item.id]!;
  return facts.category === "Simple" || (facts.category === "Martial" && /Finesse|Light/.test(facts.properties));
}).map((item) => item.id);
for (const id of ["club", "greatclub", "javelin", "light-hammer", "mace", "spear", "throwing-knife"]) {
  assert.ok(stalkerMastery.includes(id), `the Stalker is proficient with the Simple weapon ${id}`);
}
assert.ok(!stalkerMastery.includes("pistol"), "the Pistol is Martial Ranged with neither Finesse nor Light");
assert.ok(!weaponItems.some((item) => item.id === "hunter-cleaver"), "the Hunter Cleaver is removed from the weapon catalog");
const meleeMastery = weaponItems.filter((item) => WEAPON_FACTS[item.id]!.attack === "Melee");
assert.ok(meleeMastery.length > 20, "the Bloodbound may master any Simple or Martial melee weapon");
assert.ok(!meleeMastery.some((item) => WEAPON_FACTS[item.id]!.attack === "Ranged"), "ranged weapons stay out of the melee mastery list");

// Bloodvial purity — core-rulebook.txt [page 123]. Purity is a field on the one
// `blood-vial` id: four ids must NOT exist, and a line without a purity is
// Tainted (the most common form).
assert.ok(ITEMS.some((item) => item.id === BLOODVIAL_ITEM_ID), "the single Bloodvial catalog id still resolves");
assert.equal(ITEMS.find((item) => item.id === BLOODVIAL_ITEM_ID)!.weightLb, 0.5, "the Bloodvial weighs 0.5 lb");
for (const id of ["blood-vial-tainted", "blood-vial-stirred", "blood-vial-concentrated", "blood-vial-pure"]) {
  assert.ok(!ITEMS.some((item) => item.id === id), `purity is a field, not the separate item id ${id}`);
}
assert.deepEqual(
  BLOODVIAL_PURITIES.map((facts) => [facts.id, facts.healing, facts.madnessRemoved, facts.gritDc, facts.transformationLevelsOnFailure, facts.madnessOnFailure]),
  [
    ["tainted", "2d4 + 2", 2, 10, 1, 3],
    ["stirred", "4d4 + 4", 4, 15, 1, 6],
    ["concentrated", "8d4 + 8", 8, 20, 2, 10],
    ["pure", null, null, 25, 6, 15],
  ],
  "the four Bloodvial purities carry their source healing, Madness removal, Grit DC and failure consequences",
);
assert.equal(BLOODVIAL_PURITY_BY_ID.pure.choices.length, 2, "Pure Old Blood offers a choice of two effects");
assert.match(BLOODVIAL_PURITY_BY_ID.pure.choices[1], /no longer than 1 round/, "the Pure Old Blood revival is limited to one round of death");
assert.equal(cardBloodvialPurity({ inventory: [{ itemId: BLOODVIAL_ITEM_ID, qty: 2 }] }), "tainted", "a stored vial without a purity is Tainted");
assert.equal(cardBloodvialPurity({ inventory: [{ itemId: BLOODVIAL_ITEM_ID, qty: 1, purity: "concentrated" }] }), "concentrated", "a stored purity is honoured");
assert.equal(cardBloodvialPurity({ inventory: [] }), "tainted", "an empty inventory reports the default purity");
assert.equal(bloodvialFailureLabel(BLOODVIAL_PURITY_BY_ID.concentrated), "Grit DC 20 — on a failure: +2 Transformation Levels and +10 Madness.", "the failure line displays the DC and both consequences");
assert.equal(bloodvialEffectLabel(BLOODVIAL_PURITY_BY_ID.tainted), "Heals 2d4 + 2 HP · removes 2 Madness", "the effect line displays healing and Madness removed");

// core-rulebook.txt [page 12]: the Proficiency Bonus applies to a weapon's
// attack rolls only where the hunter is proficient with it. The ATTACK column
// is new, so nothing exercised this before.
{
  const scores = { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 10 };
  const holder = (classId: string) => ({ classId, level: 5, abilities: scores }) as never;
  const facts = (id: string) => WEAPON_FACTS[id];

  const stalker = getClass("stalker")!;
  assert.equal(
    stalker.weaponProficiencies,
    "Simple weapons and Martial weapons with the Finesse or Light property",
    "the Stalker's proficiency line is the one that needs parsing, not an id special-case",
  );
  assert.equal(isWeaponProficient(stalker.weaponProficiencies, facts("rapier")!), true, "a Stalker is proficient with a Finesse Martial weapon");
  assert.equal(isWeaponProficient(stalker.weaponProficiencies, facts("greatsword")!), false, "a Stalker is not proficient with a Martial weapon lacking Finesse or Light");
  assert.equal(isWeaponProficient(getClass("deepcaller")!.weaponProficiencies, facts("greatsword")!), false, "a Deepcaller has Simple weapons only");
  assert.equal(isWeaponProficient(getClass("brute")!.weaponProficiencies, facts("greatsword")!), true, "a Brute has Simple and Martial weapons");

  // Strength 16 is +3; the level-5 Proficiency Bonus is +3.
  assert.equal(weaponAttackBonus(holder("brute"), facts("greatsword")), 6, "a proficient hunter adds the Proficiency Bonus");
  assert.equal(weaponAttackBonus(holder("deepcaller"), facts("greatsword")), 3, "a non-proficient hunter adds the ability modifier alone");
  assert.equal(weaponAttackBonus(holder("deepcaller"), facts("club")), 6, "a Deepcaller is still proficient with Simple weapons");
  assert.equal(weaponAttackBonus(holder("stalker"), facts("rapier")), 6, "the Stalker's Finesse carve-out grants the bonus");
  assert.equal(weaponAttackBonus(holder("stalker"), facts("greatsword")), 3, "and withholds it otherwise");
}

console.log("Character automation tests passed.");
