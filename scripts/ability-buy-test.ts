import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  MADUHAUSU_BUDGET,
  MADUHAUSU_COST,
  MADUHAUSU_FINAL_MAX,
  MADUHAUSU_MAX,
  MADUHAUSU_MIN,
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  POINT_COST,
  maduhausuSpent,
} from "../src/data/abilities";
import { BACKGROUNDS } from "../src/data/backgrounds";
import {
  abilityBuySummary,
  backgroundBonusSummary,
  budgetFor,
  finalCreationMaximum,
  scoreRangeFor,
  spentFor,
  type AbilityScores,
} from "../src/features/hunter/lib/abilityBuy";
import { ABILITY_KEYS } from "../src/lib/ability-keys";

const master = JSON.parse(readFileSync(new URL("../resources/master.json", import.meta.url), "utf8"));
const rules = master.establishedGameRules.characterCreation.abilityScores;
const standard = rules.methods.standard;
const maduhausu = rules.methods.maduhausu;

assert.equal(POINT_BUY_BUDGET, standard.budget);
assert.equal(POINT_BUY_MIN, standard.minimumScore);
assert.equal(POINT_BUY_MAX, standard.maximumScore);
assert.deepEqual(POINT_COST, Object.fromEntries(standard.costs.map(({ score, cost }: { score: number; cost: number }) => [score, cost])));
assert.equal(MADUHAUSU_BUDGET, maduhausu.budget);
assert.equal(MADUHAUSU_MIN, maduhausu.minimumScore);
assert.equal(MADUHAUSU_MAX, maduhausu.maximumScore);
assert.equal(MADUHAUSU_FINAL_MAX, maduhausu.finalLevelOneMaximum);
assert.deepEqual(MADUHAUSU_COST, Object.fromEntries(maduhausu.costs.map((row: { score: number; first: number; second: number; thirdPlus: number | null }) => [row.score, [row.first, row.second, row.thirdPlus]])));

assert.equal(budgetFor("pointbuy"), 27);
assert.equal(budgetFor("maduhausu"), 57);
assert.deepEqual(scoreRangeFor("pointbuy"), { minimum: 8, maximum: 15 });
assert.deepEqual(scoreRangeFor("maduhausu"), { minimum: 3, maximum: 16 });
assert.equal(finalCreationMaximum("pointbuy"), 20);
assert.equal(finalCreationMaximum("maduhausu"), 17);

function scores(values: readonly number[]): AbilityScores {
  return Object.fromEntries(ABILITY_KEYS.map((key, index) => [key, values[index]])) as AbilityScores;
}

const standardCosts = new Map<number, number>(standard.costs.map(({ score, cost }: { score: number; cost: number }) => [score, cost]));
let standardCases = 0;
function verifyEveryStandardScore(prefix: number[] = []) {
  if (prefix.length === ABILITY_KEYS.length) {
    const expected = prefix.reduce((sum, score) => sum + standardCosts.get(score)!, 0);
    assert.equal(spentFor("pointbuy", scores(prefix)), expected, `Standard cost mismatch for ${prefix.join("/")}`);
    standardCases += 1;
    return;
  }
  for (let score = POINT_BUY_MIN; score <= POINT_BUY_MAX; score += 1) verifyEveryStandardScore([...prefix, score]);
}
verifyEveryStandardScore();
assert.equal(standardCases, 262_144, "every Standard six-score purchase was checked");

const standardComplete = scores([15, 15, 15, 8, 8, 8]);
assert.deepEqual(abilityBuySummary("pointbuy", standardComplete), { budget: 27, spent: 27, pointsLeft: 0, valid: true, complete: true });
assert.equal(spentFor("pointbuy", scores([7, 15, 15, 8, 8, 8])), null, "a below-range Standard score is invalid");
assert.equal(spentFor("pointbuy", scores([16, 15, 15, 8, 8, 8])), null, "an above-range Standard score is invalid");
assert.equal(spentFor("pointbuy", scores([8.5, 15, 15, 8, 8, 8])), null, "a fractional Standard score is invalid");

const maduRows = new Map<number, readonly [number, number, number | null]>(maduhausu.costs.map((row: { score: number; first: number; second: number; thirdPlus: number | null }) => [row.score, [row.first, row.second, row.thirdPlus]]));
function independentMaduhausuCost(values: readonly number[]): number | null {
  const seen = new Map<number, number>();
  let total = 0;
  for (const score of values) {
    const row = maduRows.get(score);
    if (!row || !Number.isInteger(score)) return null;
    const occurrence = (seen.get(score) ?? 0) + 1;
    seen.set(score, occurrence);
    const cost = row[Math.min(occurrence, 3) - 1];
    if (cost == null) return null;
    total += cost;
  }
  return total;
}

let maduhausuCases = 0;
function verifyEveryMaduhausuMultiset(prefix: number[] = [], minimum = MADUHAUSU_MIN) {
  if (prefix.length === ABILITY_KEYS.length) {
    const expected = independentMaduhausuCost(prefix);
    assert.equal(maduhausuSpent(prefix), expected, `Maduhausu cost mismatch for ${prefix.join("/")}`);
    assert.equal(spentFor("maduhausu", scores(prefix)), expected, `Maduhausu six-score mismatch for ${prefix.join("/")}`);
    maduhausuCases += 1;
    return;
  }
  for (let score = minimum; score <= MADUHAUSU_MAX; score += 1) verifyEveryMaduhausuMultiset([...prefix, score], score);
}
verifyEveryMaduhausuMultiset();
assert.equal(maduhausuCases, 27_132, "every Maduhausu six-score multiset was checked");

const maduhausuComplete = scores([16, 15, 13, 13, 6, 3]);
assert.deepEqual(abilityBuySummary("maduhausu", maduhausuComplete), { budget: 57, spent: 57, pointsLeft: 0, valid: true, complete: true });
assert.equal(maduhausuSpent([16, 16, 16]), null, "a third score of 16 is too expensive");
assert.equal(maduhausuSpent([2]), null, "a below-range Maduhausu score is invalid");
assert.equal(maduhausuSpent([17]), null, "an above-range Maduhausu score is invalid");
assert.equal(maduhausuSpent([10.5]), null, "a fractional Maduhausu score is invalid");
for (const permutation of [[16, 15, 14, 14, 3, 3], [3, 14, 16, 3, 15, 14], [14, 3, 15, 16, 14, 3]]) {
  assert.equal(maduhausuSpent(permutation), 60, `repeat costs are independent of ability order: ${permutation.join("/")}`);
}

const noble = BACKGROUNDS.find((background) => background.id === "noble")!;
assert.deepEqual(noble.abilityScores, rules.backgroundAdjustment.eligibleAbilitiesByBackground.noble);
for (const background of BACKGROUNDS) {
  assert.deepEqual(background.abilityScores, rules.backgroundAdjustment.eligibleAbilitiesByBackground[background.id], `${background.name} ability options match master.json`);
}
assert.deepEqual(backgroundBonusSummary(noble.abilityScores, { str: 2, int: 1 }, standardComplete, "pointbuy"), { used: 3, remaining: 0, valid: true, complete: true });
assert.deepEqual(backgroundBonusSummary(noble.abilityScores, { str: 1, int: 1, cha: 1 }, standardComplete, "pointbuy"), { used: 3, remaining: 0, valid: true, complete: true });
assert.deepEqual(backgroundBonusSummary(noble.abilityScores, { str: 2 }, standardComplete, "pointbuy"), { used: 2, remaining: 1, valid: true, complete: false });
assert.equal(backgroundBonusSummary(noble.abilityScores, { str: 2, int: 2 }, standardComplete, "pointbuy").valid, false, "backgrounds cannot spend four points");
assert.equal(backgroundBonusSummary(noble.abilityScores, { dex: 1 }, standardComplete, "pointbuy").valid, false, "backgrounds cannot improve an ineligible ability");
assert.equal(backgroundBonusSummary(noble.abilityScores, { str: 3 }, standardComplete, "pointbuy").valid, false, "one background ability cannot receive +3");
assert.equal(backgroundBonusSummary(noble.abilityScores, { str: 2, int: 1 }, maduhausuComplete, "maduhausu").valid, false, "Maduhausu background points cannot raise 16 above the level-one cap of 17");
assert.equal(backgroundBonusSummary(noble.abilityScores, { str: 1, int: 2 }, maduhausuComplete, "maduhausu").complete, true, "a legal Maduhausu +1/+2 split completes background allocation");

console.log(`Ability-buy tests passed (${standardCases} Standard purchases and ${maduhausuCases} Maduhausu multisets checked).`);
