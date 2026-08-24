import generated from "./feats.generated.json";
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

export const FEATS = generated as FeatOption[];
export const ORIGIN_FEATS = FEATS.filter((feat) => feat.category === "Origin");
export const GENERAL_FEATS = FEATS.filter((feat) => feat.category === "General");
export const FIGHTING_STYLE_FEATS = FEATS.filter((feat) => feat.category === "Fighting Style");
export const EPIC_BOON_FEATS = FEATS.filter((feat) => feat.category === "Epic Boon");
