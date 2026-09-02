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
