import type { GameLocation, HunterCard, HunterClass } from "@/types";
import { abilityModifier } from "@/data/abilities";
import { maxHp, maxSanity, proficiencyBonus, levelForInsight } from "@/lib/character";

/** Roll a single die with the given number of faces (1..faces). Runtime-only. */
function rollDie(faces: number): number {
  const f = Math.max(1, Math.floor(faces));
  return Math.floor(Math.random() * f) + 1;
}

export interface LongRestOutcome {
  patch: Partial<HunterCard>;
  hpFrom: number;
  hpTo: number;
  sanityFrom: number;
  sanityTo: number;
  sanityRoll: number;
  transformationCleared: number;
  leveledFrom: number | null;
  leveledTo: number | null;
  inLodge: boolean;
}

/**
 * Apply a Long Rest, per the handbook:
 *  - HP: full inside the Hunters Lodge, otherwise half your HP maximum.
 *  - Sanity: roll your Sanity Die (+ WIS) and regain that much Sanity.
 *  - Transformation: clear ALL levels.
 *  - Advancement: apply any pending Insight level-up — a level only takes effect
 *    after a Long Rest. The Deepcaller also suffers 2 Madness per level gained.
 */
export function applyLongRest(
  card: HunterCard,
  klass: HunterClass,
  location: GameLocation,
): LongRestOutcome {
  const oldLevel = card.level;
  const earned = levelForInsight(card.insight ?? 0);
  const newLevel = Math.max(oldLevel, earned);
  const levelsGained = newLevel - oldLevel;
  const inLodge = location === "lodge";

  const oldMaxHp = maxHp(klass, card.abilities, oldLevel);
  const newMaxHp = maxHp(klass, card.abilities, newLevel);
  const oldMaxSanity = maxSanity(klass, card.abilities, oldLevel);
  const newMaxSanity = maxSanity(klass, card.abilities, newLevel);
  const wis = abilityModifier(card.abilities.wis);

  // HP: full in the Lodge, else regain half the (new) HP maximum.
  const hpFrom = card.currentHp ?? oldMaxHp;
  const hpTo = inLodge ? newMaxHp : Math.min(newMaxHp, hpFrom + Math.floor(newMaxHp / 2));

  // Sanity: the Deepcaller suffers 2 Madness per level gained, then everyone
  // rolls their Sanity Die (+WIS) to recover.
  const sanityFrom = card.sanity ?? oldMaxSanity;
  const levelMadness = klass.id === "deepcaller" ? 2 * levelsGained : 0;
  const afterMadness = Math.max(0, sanityFrom - levelMadness);
  const sanityRoll = Math.max(0, rollDie(klass.sanityDie) + wis);
  const sanityTo = Math.min(newMaxSanity, afterMadness + sanityRoll);

  const patch: Partial<HunterCard> = {
    currentHp: hpTo,
    sanity: sanityTo,
    transformationLevel: 0,
  };
  if (levelsGained > 0) patch.level = newLevel;

  return {
    patch,
    hpFrom,
    hpTo,
    sanityFrom,
    sanityTo,
    sanityRoll,
    transformationCleared: card.transformationLevel ?? 0,
    leveledFrom: levelsGained > 0 ? oldLevel : null,
    leveledTo: levelsGained > 0 ? newLevel : null,
    inLodge,
  };
}

export interface ShortRestOutcome {
  patch: Partial<HunterCard>;
  hpFrom: number;
  hpTo: number;
  hitDiceRolled: number;
  canSpendHitDice: boolean;
  transformationFrom: number;
  transformationTo: number;
}

/**
 * Apply a Short Rest, per the handbook: remove 1 Transformation Level, and —
 * only in a Safe Zone or the Hunters Lodge — spend Hit Dice (up to your
 * Proficiency Bonus), each healing a roll of your Hit Die + CON.
 */
export function applyShortRest(
  card: HunterCard,
  klass: HunterClass,
  location: GameLocation,
): ShortRestOutcome {
  const hpMax = maxHp(klass, card.abilities, card.level);
  const hpFrom = card.currentHp ?? hpMax;
  const canSpendHitDice = location === "safe" || location === "lodge";
  const con = abilityModifier(card.abilities.con);

  let hpTo = hpFrom;
  let hitDiceRolled = 0;
  if (canSpendHitDice && hpFrom < hpMax) {
    const dice = proficiencyBonus(card.level);
    let healed = 0;
    for (let i = 0; i < dice; i++) healed += Math.max(1, rollDie(klass.hitDie) + con);
    hpTo = Math.min(hpMax, hpFrom + healed);
    hitDiceRolled = dice;
  }

  const transformationFrom = card.transformationLevel ?? 0;
  const transformationTo = Math.max(0, transformationFrom - 1);

  const patch: Partial<HunterCard> = { transformationLevel: transformationTo };
  if (hpTo !== hpFrom) patch.currentHp = hpTo;

  return {
    patch,
    hpFrom,
    hpTo,
    hitDiceRolled,
    canSpendHitDice,
    transformationFrom,
    transformationTo,
  };
}
