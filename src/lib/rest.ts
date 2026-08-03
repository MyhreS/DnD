import type { GameLocation, HunterCard, HunterClass } from "@/types";
import { abilityModifier } from "@/data/abilities";
import { maxHp, maxSanity, proficiencyBonus, levelForInsight } from "@/lib/character";

/** Roll a single die with the given number of faces (1..faces). Runtime-only. */
function rollDie(faces: number): number {
  const f = Math.max(1, Math.floor(faces));
  return Math.floor(Math.random() * f) + 1;
}

/** Roll a Sanity Die spec like "2d6", "1d20" or "4d4" → the summed result. */
function rollSanityDie(spec: string): number {
  const m = /^(\d+)d(\d+)$/i.exec(spec.trim());
  if (!m) return 0;
  const count = Math.max(1, parseInt(m[1], 10));
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(parseInt(m[2], 10));
  return total;
}

/** A Long Rest restores all HP only in the Hunters Lodge (else half your max). */
export function restoresFullHp(location: GameLocation): boolean {
  return location === "lodge";
}

/** Hit Dice may be spent (on a Short Rest) only in a Safe Zone or the Lodge. */
export function canSpendHitDice(location: GameLocation): boolean {
  return location === "safe" || location === "lodge";
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
  const inLodge = restoresFullHp(location);

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
  const sanityRoll = Math.max(0, rollSanityDie(klass.sanityDie) + wis);
  const sanityTo = Math.min(newMaxSanity, afterMadness + sanityRoll);

  const patch: Partial<HunterCard> = {
    currentHp: hpTo,
    sanity: sanityTo,
    transformationLevel: 0,
    activeTransformations: [],
  };
  if (levelsGained > 0) {
    patch.level = newLevel;
    // Arm the level-up walkthrough: the player has yet to "see" the new levels.
    patch.lastSeenLevel = Math.min(card.lastSeenLevel ?? oldLevel, oldLevel);
  }

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
  /** The DC 13 Constitution (Grit) check for one extra level of reduction —
   * only rolled when there was a Transformation Level to reduce. */
  gritRoll: number | null;
  gritSuccess: boolean;
}

/**
 * Apply a Short Rest, per the Transformation Table rules: reduce your
 * Transformation Level by 1 and lose all active Transformations; make a DC 13
 * Constitution (Grit) check to reduce it by 1 more. In a Safe Zone or the
 * Hunters Lodge you also spend Hit Dice (up to your Proficiency Bonus), each
 * healing a roll of your Hit Die + CON.
 */
export function applyShortRest(
  card: HunterCard,
  klass: HunterClass,
  location: GameLocation,
): ShortRestOutcome {
  const hpMax = maxHp(klass, card.abilities, card.level);
  const hpFrom = card.currentHp ?? hpMax;
  const canHeal = canSpendHitDice(location);
  const con = abilityModifier(card.abilities.con);

  let hpTo = hpFrom;
  let hitDiceRolled = 0;
  if (canHeal && hpFrom < hpMax) {
    const dice = proficiencyBonus(card.level);
    let healed = 0;
    for (let i = 0; i < dice; i++) healed += Math.max(1, rollDie(klass.hitDie) + con);
    hpTo = Math.min(hpMax, hpFrom + healed);
    hitDiceRolled = dice;
  }

  const transformationFrom = card.transformationLevel ?? 0;
  let gritRoll: number | null = null;
  let gritSuccess = false;
  let transformationTo = Math.max(0, transformationFrom - 1);
  if (transformationFrom > 0) {
    const gritProf = card.skillProficiencies.includes("Grit")
      ? proficiencyBonus(card.level)
      : 0;
    gritRoll = rollDie(20) + con + gritProf;
    gritSuccess = gritRoll >= 13;
    if (gritSuccess) transformationTo = Math.max(0, transformationTo - 1);
  }

  const patch: Partial<HunterCard> = { transformationLevel: transformationTo };
  if (transformationFrom > 0) patch.activeTransformations = [];
  if (hpTo !== hpFrom) patch.currentHp = hpTo;

  return {
    patch,
    hpFrom,
    hpTo,
    hitDiceRolled,
    canSpendHitDice: canHeal,
    transformationFrom,
    transformationTo,
    gritRoll,
    gritSuccess,
  };
}
