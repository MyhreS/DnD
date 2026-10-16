import featData from "./feats.data.json";
import type { AbilityKey } from "@/types";

export type FeatCategory = "Origin" | "General" | "Fighting Style" | "Epic Boon";

export interface FeatOption {
  id: string;
  name: string;
  category: FeatCategory;
  prerequisite: string;
  description: string;
  abilityOptions: AbilityKey[];
  abilityPoints: number;
  abilityMaximum: number;
}

/** Hand-maintained feat catalog, authored from `docs/rules/core-rulebook.txt`
 * (chapter 5, pages 96–106). There is no generator: edit `feats.data.json`
 * directly and keep it aligned with the current rulebook. */
export const FEATS = featData as FeatOption[];
export const ORIGIN_FEATS = FEATS.filter((feat) => feat.category === "Origin");
export const GENERAL_FEATS = FEATS.filter((feat) => feat.category === "General");
export const FIGHTING_STYLE_FEATS = FEATS.filter((feat) => feat.category === "Fighting Style");
export const EPIC_BOON_FEATS = FEATS.filter((feat) => feat.category === "Epic Boon");

/** Feats that also ask for a skill. `any` = every skill, `proficient` = a skill
 * the Hunter is proficient in. Keen Mind and Observant grant proficiency, or
 * Expertise when the Hunter already has the skill ([pages 100, 102, 105]). */
export type FeatSkillPick = { slot: "skill" | "expertise"; label: string; options: readonly string[] | "any" | "proficient" };
export const FEAT_SKILL_PICKS: Record<string, readonly FeatSkillPick[]> = {
  "Skill Expert": [
    { slot: "skill", label: "Skill proficiency", options: "any" },
    { slot: "expertise", label: "Expertise", options: "proficient" },
  ],
  "Keen Mind": [{ slot: "skill", label: "Lore Knowledge skill", options: ["Eldritch Knowledge", "Old World History", "Investigation", "Blood Nature", "Religion"] }],
  Observant: [{ slot: "skill", label: "Keen Observer skill", options: ["Insight", "Investigation", "Perception"] }],
  "Boon of Skill": [{ slot: "expertise", label: "Expertise", options: "any" }],
};

export function featPickKey(featureKey: string, slot: FeatSkillPick["slot"]): string {
  return `${featureKey}:feat-${slot}`;
}
