import type { AbilityKey, AbilityScores, HunterCard, HunterClass } from "@/types";
import { abilityModifier } from "@/data/abilities";
import { acCategory, ARMOR_BY_ID } from "@/data/armor";
import { skillAbility } from "@/data/skills";

export const DEFAULT_ABILITIES: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

/** Proficiency bonus by level: +2 at 1–4, then +1 every 4 levels (max +6). */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);
}

/** Average roll of a die (used for HP after level 1): d10 → 6. */
function dieAverage(die: number): number {
  return Math.floor(die / 2) + 1;
}

/**
 * Maximum HP: a full hit die + CON at level 1, then the die's average + CON for
 * each level after (minimum 1 per level).
 */
export function maxHp(klass: HunterClass, abilities: AbilityScores, level = 1): number {
  const con = abilityModifier(abilities.con);
  const lvl = Math.max(1, level);
  let hp = Math.max(1, klass.hitDie + con);
  for (let l = 2; l <= lvl; l++) hp += Math.max(1, dieAverage(klass.hitDie) + con);
  return hp;
}

/** Maximum Sanity. The Deepcaller permanently gains +1 max Sanity per level. */
export function maxSanity(klass: HunterClass, level = 1): number {
  const bonus = klass.id === "deepcaller" ? Math.max(0, Math.min(20, level) - 1) : 0;
  return klass.maxSanity + bonus;
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

/** Saving-throw modifier for one ability (adds proficiency if the class is proficient). */
export function saveModifier(
  klass: HunterClass,
  abilities: AbilityScores,
  key: AbilityKey,
  level: number,
): number {
  const base = abilityModifier(abilities[key]);
  return base + (klass.savingThrows.includes(key) ? proficiencyBonus(level) : 0);
}

/** Skill-check modifier (ability modifier + proficiency if proficient in the skill). */
export function skillModifier(
  abilities: AbilityScores,
  skillName: string,
  proficient: boolean,
  level: number,
): number {
  const base = abilityModifier(abilities[skillAbility(skillName)]);
  return base + (proficient ? proficiencyBonus(level) : 0);
}

export interface RiteStats {
  ability: AbilityKey;
  abilityLabel: string;
  modifier: number;
  saveDc: number;
  attack: number;
}

/** Deepcaller rite stats: Save DC = 8 + INT + prof; Attack = INT + prof. */
export function riteStats(abilities: AbilityScores, level: number): RiteStats {
  const mod = abilityModifier(abilities.int);
  const prof = proficiencyBonus(level);
  return {
    ability: "int",
    abilityLabel: "Intelligence",
    modifier: mod,
    saveDc: 8 + mod + prof,
    attack: mod + prof,
  };
}

/** A fresh, unsaved card skeleton for a brand-new hunter. */
export function emptyCard(params: {
  ownerUid: string;
  email: string;
  displayName: string;
}): HunterCard {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerUid: params.ownerUid,
    ownerEmail: params.email,
    ownerName: params.displayName,
    name: "",
    classId: "",
    subclassId: null,
    background: "",
    level: 1,
    abilities: { ...DEFAULT_ABILITIES },
    skillProficiencies: [],
    mainArmorId: null,
    bloodTinge: false,
    preparedWhispers: [],
    coins: 0,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}
