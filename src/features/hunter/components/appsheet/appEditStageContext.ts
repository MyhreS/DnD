import { createContext, useContext } from "react";
import type { HunterCard, SheetData } from "@/types";
import { automationFor } from "../../lib/characterAutomation";

export type StagedPatch = Partial<HunterCard>;

export interface AppEditStageValue {
  patch: StagedPatch;
  previewCard: HunterCard;
  previewData: SheetData;
  currentResult: ReturnType<typeof automationFor>;
  previewResult: ReturnType<typeof automationFor>;
  hasChanges: boolean;
  fieldChangeLabels: string[];
  stageLevel: (level: number) => void;
  stageHp: (hp: number) => void;
  stageSanity: (sanity: number) => void;
  stageTransformation: (level: number) => void;
  stageChange: (fields: SheetData, patch: Partial<HunterCard>) => void;
  stageField: (field: string, value: string | boolean) => void;
  apply: () => void;
  cancel: () => void;
}

export const AppEditStageContext = createContext<AppEditStageValue | null>(null);

export function useAppEditStage(): AppEditStageValue {
  const value = useContext(AppEditStageContext);
  if (!value) throw new Error("App edit controls must be inside AppEditStage");
  return value;
}
