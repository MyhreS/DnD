import type { HunterCard, SheetData } from "@/types";
import { CharacterAutomationProvider } from "../papersheet/CharacterAutomationProvider";
import { AppOverviewSection } from "./AppOverviewSection";
import { AppAbilitiesSection } from "./AppAbilitiesSection";
import { AppCombatSection } from "./AppCombatSection";
import { AppGearSection } from "./AppGearSection";
import { AppFeaturesSection } from "./AppFeaturesSection";
import { AppNotesSection } from "./AppNotesSection";
import { AppQuickView } from "./AppQuickView";
import { View4CharacterSheet, type View4Panel } from "../view4/View4CharacterSheet";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStage, AppEditTray } from "./AppEditStage";
import { useAppEditStage } from "./appEditStageContext";
import "./appsheet.css";
import "./appsheet-details.css";
import "../view4/view4.css";

export function AppCharacterSheet({
  data,
  setField,
  setFields,
  card,
  readOnly,
  onPendingEditChange,
  mode = "app",
  view4Panel = null,
  onView4PanelChange,
}: {
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
  card: HunterCard;
  readOnly: boolean;
  onPendingEditChange?: (pending: boolean) => void;
  mode?: "app" | "quick" | "hud";
  view4Panel?: View4Panel | null;
  onView4PanelChange: (panel: View4Panel | null) => void;
}) {
  const model: AppSheetModel = { data, setField, setFields, card, readOnly };
  return (
    <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <StagedCharacterSheet model={model} mode={mode} view4Panel={view4Panel} onView4PanelChange={onView4PanelChange} />
    </AppEditStage>
  );
}

function StagedCharacterSheet({ model, mode, view4Panel, onView4PanelChange }: {
  model: AppSheetModel;
  mode: "app" | "quick" | "hud";
  view4Panel: View4Panel | null;
  onView4PanelChange: (panel: View4Panel | null) => void;
}) {
  const stage = useAppEditStage();
  const stageModel: AppSheetModel = {
    ...model,
    card: stage.previewCard,
    data: stage.previewData,
    setField: stage.stageField,
    setFields: stage.stageChange,
  };
  return <CharacterAutomationProvider
    card={stage.previewCard}
    readOnly={model.readOnly}
    onApply={stage.stageChange}
  >
    <div className="character-app-sheet" data-testid="app-character-sheet">
      <main className="appsheet-workspace">
        {mode === "hud" ? <View4CharacterSheet model={stageModel} notesModel={model} panel={view4Panel} onPanelChange={onView4PanelChange} /> : mode === "quick" ? <AppQuickView model={stageModel} /> : <>
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
