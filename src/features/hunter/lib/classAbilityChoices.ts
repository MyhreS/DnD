import { MANEUVER_KEY } from "@/data/characterOptions";
import type { HunterClass, LevelFeature, SheetAutomationState, Subclass } from "@/types";
import { RECORDED_CHOICE } from "../components/character-sheet/upgradeModel";

export interface AbilityChoice {
  /** What this Hunter picked for the feature, in words ("Stealth", "Level 4: Alert"). */
  picks: string[];
  /** The feature asks for a pick that hasn't been made yet. */
  missing: boolean;
}

/** The Hunter's own decisions for one class or path feature, so the Class
 * abilities list says what they chose instead of only "choose a …". */
export function abilityChoice(feature: LevelFeature, state: SheetAutomationState | undefined, subclass: Subclass | undefined): AbilityChoice | null {
  const name = feature.name.toLowerCase();
  if (/ subclass$/i.test(feature.name)) {
    return subclass ? { picks: [subclass.name], missing: false } : { picks: [], missing: true };
  }
  if (name === "expertise") {
    const picks = state?.expertiseSkills ?? [];
    return { picks, missing: picks.length === 0 };
  }
  if (name === "weapon mastery") {
    const picks = state?.weaponMasteries ?? [];
    return { picks, missing: picks.length === 0 };
  }
  const recorded = { ...(state?.levelChoices ?? {}), ...(state?.levelFeats ?? {}) };
  const maneuvers = /combat superiority/i.test(feature.name);
  const entries = Object.entries(recorded)
    .filter(([key]) => !key.includes(":feat-"))
    .map(([key, value]) => {
      const level = Number(key.slice(0, key.indexOf(":")));
      const rest = key.slice(key.indexOf(":") + 1).replace(/^subclass:/, "").toLowerCase();
      return { level, rest, value };
    })
    .filter((entry) => maneuvers ? entry.rest.startsWith(MANEUVER_KEY) : (entry.rest === name || entry.rest.startsWith(name)))
    .sort((a, b) => a.level - b.level);
  if (!entries.length) return RECORDED_CHOICE.test(feature.name) || maneuvers ? { picks: [], missing: true } : null;
  const levels = new Set(entries.map((entry) => entry.level));
  return {
    picks: entries.map((entry) => (levels.size > 1 ? `Level ${entry.level}: ${entry.value}` : entry.value)),
    missing: false,
  };
}

export type ClassAbility = LevelFeature & { source?: string };

/** The class and path abilities a Hunter has through their level. A path that
 * replaces the progression (Hunter Zealot, [page 75]) takes the place of the
 * class's own features from level 3. */
export function classAbilitiesThroughLevel(klass: HunterClass, subclassId: string | null | undefined, level: number): ClassAbility[] {
  const subclass = klass.subclasses.find((entry) => entry.id === subclassId);
  const classFeatures = (klass.features ?? []).filter((feature) => !(subclass?.replacesProgression && feature.level >= 3));
  const subclassAbilities = subclass
    ? subclass.features.map((feature) => ({ ...feature, source: subclass.name }))
    : [];
  return [...classFeatures, ...subclassAbilities]
    .filter((feature) => feature.level <= level)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
