import type { HunterCard, SheetData } from "@/types";
import { CharacterAutomationProvider } from "../papersheet/CharacterAutomationProvider";
import { AppOverviewSection } from "./AppOverviewSection";
import { AppAbilitiesSection } from "./AppAbilitiesSection";
import { AppCombatSection } from "./AppCombatSection";
import { AppGearSection } from "./AppGearSection";
import { AppFeaturesSection } from "./AppFeaturesSection";
import { AppNotesSection } from "./AppNotesSection";
import { AppQuickView } from "./AppQuickView";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStage, AppEditTray } from "./AppEditStage";
import { useAppEditStage } from "./appEditStageContext";
import "./appsheet.css";
import "./appsheet-details.css";

export function AppCharacterSheet({
  data,
  setField,
  setFields,
  card,
  readOnly,
  onPendingEditChange,
  mode = "app",
}: {
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
  card: HunterCard;
  readOnly: boolean;
  onPendingEditChange?: (pending: boolean) => void;
  mode?: "app" | "quick";
}) {
  const model: AppSheetModel = { data, setField, setFields, card, readOnly };
  return (
    <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <StagedCharacterSheet model={model} mode={mode} />
    </AppEditStage>
  );
}

function StagedCharacterSheet({ model, mode }: {
  model: AppSheetModel;
  mode: "app" | "quick";
}) {
  const stage = useAppEditStage();
  const staged = mode === "app" || mode === "quick";
  const stageModel: AppSheetModel = staged ? {
    ...model,
    card: stage.previewCard,
    data: stage.previewData,
    setField: stage.stageField,
    setFields: stage.stageChange,
  } : model;
  return <CharacterAutomationProvider
    card={staged ? stage.previewCard : model.card}
    readOnly={model.readOnly}
    onApply={staged ? stage.stageChange : model.setFields}
  >
    <div className="character-app-sheet" data-testid="app-character-sheet">
      <main className="appsheet-workspace">
        {mode === "quick" ? <AppQuickView model={stageModel} /> : <>
          <AppOverviewSection model={stageModel} />
          <AppCombatSection model={stageModel} />
          <AppFeaturesSection model={stageModel} />
          <AppAbilitiesSection model={stageModel} />
          <AppGearSection model={stageModel} />
          <AppNotesSection model={model} />
        </>}
      </main>
      {!model.readOnly && <AppEditTray />}
    </div>
  </CharacterAutomationProvider>;
}
