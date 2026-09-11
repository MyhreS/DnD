import assert from "node:assert/strict";
import { canSpendFavor, resolveDeath } from "../src/lib/death";
import { recoveredCard } from "../src/lib/recovery";
import { INSIGHT_BY_LEVEL } from "../src/lib/insight";
import type { HunterCard } from "../src/types";

// The death / Favor rules, core-rulebook.txt [page 44-45]. These are the pure
// decisions behind the DM's death prompt: whether loot drops, what the Favor
// costs, and what a returning Hunter's Insight becomes.

function card(partial: Partial<HunterCard> = {}): HunterCard {
  return {
    id: "c1",
    ownerUid: "u1",
    name: "Ash",
    level: 4,
    insight: 42,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    coins: 12,
    inventory: [{ itemId: "dagger", qty: 1 }],
    ...partial,
  } as HunterCard;
}

// --- A Favor can only be expended if one is held ---
assert.equal(canSpendFavor(card({ favors: 0 })), false);
assert.equal(canSpendFavor(card({})), false);
assert.equal(canSpendFavor(card({ favors: 1 })), true);
assert.equal(canSpendFavor(card({ favors: 2 })), true);

// --- No Favor: death proceeds normally, the gear drops as loot ---
const plain = resolveDeath(card({ favors: 0 }), false);
assert.equal(plain.favorSpent, false);
assert.equal(plain.dropsLoot, true);
assert.equal(plain.card.favors, 0);

// --- Asking to spend one you do not have changes nothing (still drops loot) ---
const none = resolveDeath(card({ favors: 0 }), true);
assert.equal(none.favorSpent, false);
assert.equal(none.dropsLoot, true);

// --- Expending a Favor: nothing drops, and exactly one Favor is consumed ---
const spent = resolveDeath(card({ favors: 2 }), true);
assert.equal(spent.favorSpent, true);
assert.equal(spent.dropsLoot, false, "body and gear disappear from the world");
assert.equal(spent.card.favors, 1);

// --- Holding a Favor but choosing not to expend it keeps it, and drops loot ---
const kept = resolveDeath(card({ favors: 1 }), false);
assert.equal(kept.favorSpent, false);
assert.equal(kept.dropsLoot, true);
assert.equal(kept.card.favors, 1);

// --- The resolved card is a copy; the original is never mutated ---
const original = card({ favors: 1 });
resolveDeath(original, true);
assert.equal(original.favors, 1);

// --- Returning: Insight drops to the minimum total for the current Level ---
const returned = recoveredCard(card({ level: 4, insight: 42 }));
assert.equal(returned.level, 4, "you never lose a Level from expending a Favor");
assert.equal(returned.insight, INSIGHT_BY_LEVEL[4]);
assert.equal(returned.insight, 30);

// --- It only ever loses Insight: a card already below the minimum is untouched ---
assert.equal(recoveredCard(card({ level: 4, insight: 11 })).insight, 11);
assert.equal(recoveredCard(card({ level: 1, insight: 0 })).insight, 0);

// --- Out-of-range levels are clamped to the advancement table ---
assert.equal(recoveredCard(card({ level: 99, insight: 99999 })).insight, INSIGHT_BY_LEVEL[INSIGHT_BY_LEVEL.length - 1]);
assert.equal(recoveredCard(card({ level: 0, insight: 5 })).insight, 0);

console.log("death/Favor rules ok");
