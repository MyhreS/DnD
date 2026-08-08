import { createContext, useContext } from "react";
import type { HunterCard } from "@/types";
import { automationFor } from "../../lib/characterAutomation";

export type StagedPatch = Pick<Partial<HunterCard>, "level" | "lastSeenLevel" | "currentHp" | "sanity" | "subclassId" | "transformationLevel" | "activeTransformations">;

export interface AppEditStageValue {
  patch: StagedPatch;
  previewCard: HunterCard;
  currentResult: ReturnType<typeof automationFor>;
  previewResult: ReturnType<typeof automationFor>;
  hasChanges: boolean;
  stageLevel: (level: number) => void;
  stageHp: (hp: number) => void;
  stageSanity: (sanity: number) => void;
  stageTransformation: (level: number) => void;
  apply: () => void;
  cancel: () => void;
}

export const AppEditStageContext = createContext<AppEditStageValue | null>(null);

export function useAppEditStage(): AppEditStageValue {
  const value = useContext(AppEditStageContext);
  if (!value) throw new Error("App edit controls must be inside AppEditStage");
  return value;
}
