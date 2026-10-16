import { getClass, levelFeatureDetails, levelFeatureNames } from "@/data/classes";
import { FEAT_SKILL_PICKS, featPickKey } from "@/data/feats";
import { INSIGHT_BY_LEVEL } from "@/lib/insight";
import { maxHp, proficiencyBonus, withClassAbilityBonuses } from "@/lib/character";
import type { AbilityKey, HunterCard } from "@/types";

export interface LevelHistoryEntry {
  level: number;
  insight: number;
  /** Max HP gained at this level (level 1: the starting maximum). */
  hpGained: number;
  hpAfter: number;
  proficiencyBefore: number | null;
  proficiencyAfter: number;
  /** Features gained at this level, with their rule text. */
  features: Array<{ name: string; text: string }>;
  /** What the player chose at this level, in words. */
  choices: string[];
}

const ABILITY_NAME: Record<AbilityKey, string> = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

/** What each level the Hunter has reached gave them, rebuilt from the saved
 * card and the current rules — so it works for every Hunter, including those
 * levelled before the history existed. Newest level first. */
export function levelHistory(card: HunterCard): LevelHistoryEntry[] {
  const klass = getClass(card.classId);
  if (!klass) return [];
  const hunter = withClassAbilityBonuses(card);
  const subclass = klass.subclasses.find((entry) => entry.id === card.subclassId);
  const state = card.sheetAutomation;
  const feats = new Set([...(card.feats ?? [])]);
  const toughPerLevel = feats.has("Tough") ? 2 : 0;
  const entries: LevelHistoryEntry[] = [];

  for (let level = 1; level <= Math.max(1, Math.min(20, card.level)); level += 1) {
    const hpAfter = maxHp(klass, hunter.abilities, level) + toughPerLevel * level;
    const hpBefore = level === 1 ? 0 : maxHp(klass, hunter.abilities, level - 1) + toughPerLevel * (level - 1);
    const names = levelFeatureNames(klass, subclass, level).filter((name) => !/^subclass feature$/i.test(name));
    const details = levelFeatureDetails(klass, subclass, level);
    const features = [
      ...names.map((name) => ({ name, text: details.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.text ?? "" })),
      ...details.filter((entry) => !names.some((name) => name.toLowerCase() === entry.name.toLowerCase())).map((entry) => ({ name: entry.name, text: entry.text })),
    ];

    const choices: string[] = [];
    if (level === 3 && subclass) choices.push(`Path: ${subclass.name}`);
    for (const [key, feat] of Object.entries(state?.levelFeats ?? {})) {
      if (!key.startsWith(`${level}:`)) continue;
      const increases = Object.entries(state?.levelAbilityBonuses?.[key] ?? {})
        .filter(([, points]) => (points ?? 0) > 0)
        .map(([ability, points]) => `${ABILITY_NAME[ability as AbilityKey]} +${points}`);
      const picks = (FEAT_SKILL_PICKS[feat] ?? [])
        .map((pick) => state?.levelChoices?.[featPickKey(key, pick.slot)])
        .filter(Boolean);
      choices.push([`Feat: ${feat}`, increases.join(", "), picks.join(", ")].filter(Boolean).join(" — "));
    }
    for (const [key, value] of Object.entries(state?.levelChoices ?? {})) {
      if (!key.startsWith(`${level}:`) || key.includes(":feat-") || state?.levelFeats?.[key]) continue;
      choices.push(`${key.slice(key.indexOf(":") + 1).replace(/:maneuver:\d+$/i, " (maneuver)")}: ${value}`);
    }
    if (level === 1 && state?.classSkills?.length) choices.push(`Class skills: ${state.classSkills.join(", ")}`);
    if (names.some((name) => /^expertise$/i.test(name)) && state?.expertiseSkills?.length) choices.push(`Expertise: ${state.expertiseSkills.join(", ")}`);
    if (names.some((name) => /weapon mastery/i.test(name)) && state?.weaponMasteries?.length) choices.push(`Weapon Mastery: ${state.weaponMasteries.join(", ")}`);

    entries.push({
      level,
      insight: INSIGHT_BY_LEVEL[level] ?? 0,
      hpGained: hpAfter - hpBefore,
      hpAfter,
      proficiencyBefore: level === 1 ? null : proficiencyBonus(level - 1),
      proficiencyAfter: proficiencyBonus(level),
      features,
      choices,
    });
  }
  return entries.reverse();
}
