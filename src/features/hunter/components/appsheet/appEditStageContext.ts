import { createContext, useContext } from "react";
import type { HunterCard, SheetData } from "@/types";
import { automationFor } from "../../lib/characterAutomation";

export type StagedPatch = Partial<HunterCard>;

const UPGRADE_PATCH_KEYS = new Set<keyof HunterCard>([
  "level",
  "classId",
  "backgroundId",
  "subclassId",
  "skillProficiencies",
  "featSkills",
  "preparedWhispers",
  "sheetAutomation",
]);

export function hasStagedUpgrade(patch: StagedPatch): boolean {
  return (Object.keys(patch) as Array<keyof HunterCard>).some((key) => UPGRADE_PATCH_KEYS.has(key));
}

export interface AppEditStageValue {
  patch: StagedPatch;
  savedCard: HunterCard;
  previewCard: HunterCard;
  previewData: SheetData;
  currentResult: ReturnType<typeof automationFor>;
  previewResult: ReturnType<typeof automationFor>;
  hasChanges: boolean;
  changedFields: string[];
  stageLevel: (level: number) => void;
  stageHp: (hp: number) => void;
  stageTransformation: (level: number) => void;
  stageChange: (fields: SheetData, patch: Partial<HunterCard>) => void;
  stageField: (field: string, value: string | boolean) => void;
  apply: (extraPatch?: Partial<HunterCard>) => void;
  cancel: () => void;
}

export const AppEditStageContext = createContext<AppEditStageValue | null>(null);

export function useAppEditStage(): AppEditStageValue {
  const value = useContext(AppEditStageContext);
  if (!value) throw new Error("App edit controls must be inside AppEditStage");
  return value;
}
