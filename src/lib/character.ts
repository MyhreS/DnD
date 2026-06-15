import type { AbilityScores, HunterCard, HunterClass } from "@/types";
import { abilityModifier, PROFICIENCY_BONUS_LVL1 } from "@/data/abilities";
import { acCategory, ARMOR_BY_ID } from "@/data/armor";

export const DEFAULT_ABILITIES: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

/** Max-die HP at level 1 plus CON modifier (minimum 1). */
export function maxHp(klass: HunterClass, abilities: AbilityScores): number {
  return Math.max(1, klass.hitDie + abilityModifier(abilities.con));
}

export interface ArmorClassResult {
  total: number;
  baseAc: number;
  category: string;
  dexRule: string;
  dexApplied: number;
}

/** Armor Class from the chosen Main Armor (or unarmored) plus Dexterity. */
export function armorClass(
  abilities: AbilityScores,
  mainArmorId: string | null,
): ArmorClassResult {
  const dexMod = abilityModifier(abilities.dex);
  const main = mainArmorId ? ARMOR_BY_ID[mainArmorId] : undefined;
  const baseAc = main ? main.acValue : 10;
  const cat = acCategory(baseAc);
  const dexApplied = cat.applyDex(dexMod);
  return {
    total: baseAc + dexApplied,
    baseAc,
    category: cat.label,
    dexRule: cat.dexRule,
    dexApplied,
  };
}

export const PROFICIENCY_BONUS = PROFICIENCY_BONUS_LVL1;

/** A fresh, unsaved card skeleton for a brand-new hunter. */
export function emptyCard(params: {
  uid: string;
  email: string;
  displayName: string;
}): HunterCard {
  const now = Date.now();
  return {
    uid: params.uid,
    ownerEmail: params.email,
    ownerName: params.displayName,
    name: "",
    classId: "",
    background: "",
    level: 1,
    abilities: { ...DEFAULT_ABILITIES },
    skillProficiencies: [],
    mainArmorId: null,
    madness: 0,
    transform: 0,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}
