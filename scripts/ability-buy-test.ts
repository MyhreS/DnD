import { strict as assert } from "node:assert";
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

/** The beta core rulebook [page 32] prints both point-buy methods. The numbers
 * are asserted here as literals against src/data/abilities.ts; the stored
 * `abilityMode` literal "maduhausu" is deliberately left unchanged. */
const standard = {
  budget: 27,
  minimumScore: 8,
  maximumScore: 15,
  costs: [
    { score: 8, cost: 0 }, { score: 9, cost: 1 }, { score: 10, cost: 2 }, { score: 11, cost: 3 },
    { score: 12, cost: 4 }, { score: 13, cost: 5 }, { score: 14, cost: 7 }, { score: 15, cost: 9 },
  ],
};
const maduhausu = {
  budget: 57,
  minimumScore: 3,
  maximumScore: 16,
  finalLevelOneMaximum: 17,
  costs: [
    { score: 3, first: 0, second: 0, thirdPlus: 0 },
    { score: 4, first: 1, second: 1, thirdPlus: 1 },
    { score: 5, first: 2, second: 2, thirdPlus: 2 },
    { score: 6, first: 3, second: 3, thirdPlus: 3 },
    { score: 7, first: 4, second: 4, thirdPlus: 4 },
    { score: 8, first: 5, second: 5, thirdPlus: 5 },
    { score: 9, first: 6, second: 6, thirdPlus: 6 },
    { score: 10, first: 7, second: 7, thirdPlus: 7 },
    { score: 11, first: 8, second: 8, thirdPlus: 8 },
    { score: 12, first: 9, second: 9, thirdPlus: 9 },
    { score: 13, first: 10, second: 10, thirdPlus: 10 },
    { score: 14, first: 12, second: 14, thirdPlus: 17 },
    { score: 15, first: 14, second: 18, thirdPlus: 23 },
    { score: 16, first: 20, second: 26, thirdPlus: null },
  ] as { score: number; first: number; second: number; thirdPlus: number | null }[],
};

assert.equal(POINT_BUY_BUDGET, standard.budget);
assert.equal(POINT_BUY_MIN, standard.minimumScore);
assert.equal(POINT_BUY_MAX, standard.maximumScore);
assert.deepEqual(POINT_COST, Object.fromEntries(standard.costs.map(({ score, cost }) => [score, cost])));
assert.equal(MADUHAUSU_BUDGET, maduhausu.budget);
assert.equal(MADUHAUSU_MIN, maduhausu.minimumScore);
assert.equal(MADUHAUSU_MAX, maduhausu.maximumScore);
assert.equal(MADUHAUSU_FINAL_MAX, maduhausu.finalLevelOneMaximum);
assert.deepEqual(MADUHAUSU_COST, Object.fromEntries(maduhausu.costs.map((row) => [row.score, [row.first, row.second, row.thirdPlus]])));

assert.equal(budgetFor("pointbuy"), 27);
assert.equal(budgetFor("maduhausu"), 57);
assert.deepEqual(scoreRangeFor("pointbuy"), { minimum: 8, maximum: 15 });
assert.deepEqual(scoreRangeFor("maduhausu"), { minimum: 3, maximum: 16 });
assert.equal(finalCreationMaximum("pointbuy"), 20);
assert.equal(finalCreationMaximum("maduhausu"), 17);

function scores(values: readonly number[]): AbilityScores {
  return Object.fromEntries(ABILITY_KEYS.map((key, index) => [key, values[index]])) as AbilityScores;
}

const standardCosts = new Map<number, number>(standard.costs.map(({ score, cost }) => [score, cost]));
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

const maduRows = new Map<number, readonly [number, number, number | null]>(maduhausu.costs.map((row) => [row.score, [row.first, row.second, row.thirdPlus]]));
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
assert.deepEqual(noble.abilityScores, ["str", "int", "cha"]);
for (const background of BACKGROUNDS) {
  assert.equal(background.abilityScores.length, 3, `${background.name} offers three eligible abilities`);
  assert.equal(new Set(background.abilityScores).size, 3, `${background.name} lists each eligible ability once`);
  for (const key of background.abilityScores) {
    assert.ok(ABILITY_KEYS.includes(key), `${background.name} lists a real ability: ${key}`);
  }
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
