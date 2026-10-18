// Test Hunters for every class × path, levelled 1 → 20 through the same rules
// and upgrade code the app uses. Each one makes every choice the upgrade asks
// for and must end each level with nothing left pending. Expected numbers come
// from docs/rules/core-rulebook.txt; page references sit beside each check.
import { strict as assert } from "node:assert";
import { emptySheetCard, normalizeCard } from "../src/lib/character";
import { CLASSES } from "../src/data/classes";
import { BACKGROUNDS } from "../src/data/backgrounds";
import { automationFor, classResources } from "../src/features/hunter/lib/characterAutomation";
import { FEAT_SKILL_PICKS, featPickKey } from "../src/data/feats";
import { SHEET_SKILL_FIELD, SKILLS } from "../src/data/skills";
import { armorClassFor } from "../src/lib/character";
import { breakdownFor } from "../src/features/hunter/lib/calculationBreakdowns";
import { abilityChoice, classAbilitiesThroughLevel } from "../src/features/hunter/lib/classAbilityChoices";
import {
  featOptionsFor,
  recordedOptionsFor,
  upgradeFeatureComplete,
  upgradeFeatures,
} from "../src/features/hunter/components/character-sheet/upgradeModel";
import type { AbilityKey, HunterCard, HunterClass, SheetAutomationState } from "../src/types";

const ABILITIES: Record<AbilityKey, number> = { str: 14, dex: 14, con: 14, int: 12, wis: 12, cha: 10 };

/** core-rulebook.txt class tables: +2 at levels 1–4, +3 at 5–8, +4 at 9–12,
 * +5 at 13–16, +6 at 17–20. */
function expectedProficiency(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

function testHunter(klass: HunterClass, subclassId: string | null, level: number, state: SheetAutomationState): HunterCard {
  const base = emptySheetCard({ ownerUid: "matrix", email: "matrix@example.test", displayName: "Matrix" });
  return normalizeCard({
    ...base,
    id: `matrix-${klass.id}-${subclassId ?? "none"}-${level}`,
    name: `${klass.name} ${subclassId ?? ""} ${level}`.trim(),
    classId: klass.id,
    subclassId: level >= 3 ? subclassId : null,
    backgroundId: BACKGROUNDS[0].id,
    level,
    lastSeenLevel: level,
    abilities: { ...ABILITIES },
    baseAbilities: { ...ABILITIES },
    skillProficiencies: klass.skillChoices.options.slice(0, klass.skillChoices.count),
    sheetAutomation: state,
  });
}

let hunters = 0;
let choicesMade = 0;

for (const klass of CLASSES) {
  const paths: Array<string | null> = [...klass.subclasses.map((entry) => entry.id), ...(klass.subclassOptional ? [null] : [])];
  assert.ok(paths.length > 0, `${klass.title} offers at least one path`);
  for (let level = 1; level <= 20; level += 1) {
    assert.equal(klass.progression.filter((row) => row.level === level).length, 1, `${klass.title} has exactly one progression row for level ${level}`);
  }

  for (const subclassId of paths) {
    const label = `${klass.title} / ${subclassId ?? "no path"}`;
    const state: SheetAutomationState = {
      version: 3,
      classSkills: klass.skillChoices.options.slice(0, klass.skillChoices.count),
      levelChoices: {},
      levelFeats: {},
      levelAbilityBonuses: {},
      setupComplete: true,
    };
    let previousHp = 0;

    for (let level = 1; level <= 20; level += 1) {
      // Make every choice this level's upgrade asks for, exactly as a player
      // would in the Upgrade flow, with the first option each time.
      for (const feature of upgradeFeatures(klass, subclassId, level - 1, level).filter((entry) => entry.choice || entry.key.includes(":"))) {
        if (!feature.choice && !recordedOptionsFor(feature, state).length) continue;
        const card = testHunter(klass, subclassId, level, state);
        const feats = featOptionsFor(feature, card, klass);
        if (feats.length) {
          const feat = feats.find((entry) => entry.abilityPoints === 0) ?? feats[0];
          state.levelFeats![feature.key] = feat.name;
          if (feat.abilityPoints > 0) state.levelAbilityBonuses![feature.key] = { str: feat.abilityPoints };
          for (const pick of FEAT_SKILL_PICKS[feat.name] ?? []) state.levelChoices![featPickKey(feature.key, pick.slot)] = SKILLS[0].name;
          // A once-only feat is never offered again once held ([page 96]).
          const held = new Set(Object.values(state.levelFeats!));
          const after = featOptionsFor({ ...feature, key: `${feature.key}:next` }, { ...card, feats: [...held] }, klass);
          for (const repeat of after.filter((entry) => held.has(entry.name))) {
            assert.ok(["Ability Score Improvement", "Skilled"].includes(repeat.name), `${label} level ${level}: "${repeat.name}" offered again although it is not Repeatable`);
          }
        } else {
          const options = recordedOptionsFor(feature, state);
          assert.ok(options.length > 0 || !feature.choice, `${label} level ${level}: "${feature.name}" offers no options in the Upgrade flow`);
          if (options.length) state.levelChoices![feature.key] = options[0].value;
        }
        assert.ok(upgradeFeatureComplete(feature, state), `${label} level ${level}: "${feature.name}" is still incomplete after choosing`);
        choicesMade += 1;
      }

      const card = testHunter(klass, subclassId, level, state);
      const result = automationFor(card);
      hunters += 1;
      const fields = result.fields as Record<string, unknown>;

      assert.equal(fields.profBonus, `+${expectedProficiency(level)}`, `${label} level ${level}: Proficiency Bonus`);
      const row = klass.progression.find((entry) => entry.level === level)!;
      assert.equal(row.profBonus, expectedProficiency(level), `${label} level ${level}: class table Proficiency Bonus`);

      const hp = Number(fields.hpMax);
      assert.ok(Number.isFinite(hp) && hp > previousHp, `${label} level ${level}: max HP rises with each level (${previousHp} → ${hp})`);
      if (level === 1) {
        // Level 1 HP is the full Hit Die + Constitution modifier.
        assert.equal(hp, klass.hitDie + 2, `${label} level 1: Hit Die ${klass.hitDie} + Constitution +2`);
      }
      previousHp = hp;

      const pending = Object.entries(result.pending).filter(([, value]) => value != null).map(([key]) => key);
      const allowedPending = new Set(["whispers"]); // Prepared Whispers are picked from the sheet, not by this test.
      assert.deepEqual(pending.filter((key) => !allowedPending.has(key)), [], `${label} level ${level}: nothing left pending after every choice (${pending.join(", ")})`);

      assert.equal(fields.hdMax, String(level), `${label} level ${level}: one Hit Die per level`);

      // Every tracked class resource has a positive maximum on the sheet.
      for (const resource of classResources(card)) {
        assert.ok(resource.max > 0 && fields[`${resource.key}Max`] === String(resource.max), `${label} level ${level}: ${resource.label} maximum`);
      }

      // Class abilities list what was chosen: once every upgrade choice is
      // made, no class or path ability may still read "Not chosen yet".
      const path = klass.subclasses.find((entry) => entry.id === subclassId);
      for (const ability of classAbilitiesThroughLevel(klass, level >= 3 ? subclassId : null, level)) {
        if (/^(expertise|weapon mastery)$/i.test(ability.name)) continue; // picked on the sheet, not by this test
        if (/ subclass$/i.test(ability.name) && !subclassId) continue;
        const choice = abilityChoice(ability, state, level >= 3 ? path : undefined);
        assert.ok(!choice?.missing, `${label} level ${level}: Class abilities shows "${ability.name}" as not chosen`);
      }

      // Every "how is this calculated" breakdown adds up to the value shown.
      for (const key of ["hpMax", "sanityMax", "profBonus", "weight", "weightCondition", "meleeAttack", "rangedAttack",
        ...["str", "dex", "con", "int", "wis", "cha"].flatMap((ability) => [`${ability}Score`, `${ability}Mod`, `${ability}Save`]),
        ...SKILLS.map((skill) => SHEET_SKILL_FIELD[skill.name])]) {
        const breakdown = breakdownFor(card, key);
        assert.ok(breakdown, `${label} level ${level}: no breakdown for ${key}`);
        assert.equal(breakdown!.total, String(fields[key]), `${label} level ${level}: ${key} breakdown says ${breakdown!.total}, sheet says ${fields[key]}`);
      }

      // Hunter Zealot replaces the Deepcaller progression from level 3 ([page 75]).
      if (subclassId === "hunter-zealot" && level >= 3) {
        const names = upgradeFeatures(klass, subclassId, level - 1, level).map((entry) => entry.name);
        for (const banned of ["Forbidden Revelation", "Endured Truth", "Great Summoning", "Eldritch Mastery"]) {
          assert.ok(!names.some((name) => name.startsWith(banned)), `${label} level ${level}: Zealot must not gain Deepcaller "${banned}"`);
        }
        assert.equal(fields.wepMartial, true, `${label} level ${level}: Zealot Training grants martial weapons`);
      }
    }
  }
}

// Targeted rules, core-rulebook.txt.
{
  const bloodbound = CLASSES.find((entry) => entry.id === "bloodbound")!;
  const base = { version: 3, classSkills: bloodbound.skillChoices.options.slice(0, 2), setupComplete: true } as SheetAutomationState;
  const strong = { ...testHunter(bloodbound, bloodbound.subclasses[0].id, 20, base), abilities: { ...ABILITIES, str: 23, con: 20 } };
  const fields = automationFor(strong).fields as Record<string, unknown>;
  assert.equal(fields.strScore, "25", "Primal Champion: Strength +4, to a maximum of 25 [page 83]");
  assert.equal(fields.conScore, "24", "Primal Champion: Constitution +4 [page 83]");

  const brute = CLASSES.find((entry) => entry.id === "brute")!;
  const unpicked = brute.skillChoices.options.find((skill) => !brute.skillChoices.options.slice(0, 2).includes(skill))!;
  const studied = testHunter(brute, "battle-master", 7, { ...base, classSkills: brute.skillChoices.options.slice(0, 2), levelChoices: { "7:Student of War": unpicked } });
  const field = Object.entries((automationFor(studied).fields)).find(([key, value]) => key.endsWith("P") && value === true && key.toLowerCase().includes(unpicked.slice(0, 4).toLowerCase()));
  assert.ok(field, `Student of War adds ${unpicked} [page 52]`);

  const armored = { ...testHunter(brute, "champion", 4, base), mainArmorId: "hunter-leather-coat", feats: ["Defense"] };
  assert.equal(armorClassFor(armored).total, armorClassFor({ ...armored, feats: [] }).total + 1, "Defense: +1 AC while wearing armor [page 103]");
}

console.log(`Class matrix: ${hunters} test Hunters across ${CLASSES.length} classes, ${choicesMade} upgrade choices made, all levels 1–20 completable.`);
