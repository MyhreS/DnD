import type { RefObject } from "react";
import type { HunterCard, SheetData } from "@/types";
import { CharacterAutomationProvider } from "../papersheet/CharacterAutomationProvider";
import { AppQuickView } from "./AppQuickView";
import { View4CharacterSheet, type View4Panel } from "../view4/View4CharacterSheet";
import { View4CreationSheet } from "../view4/View4CreationSheet";
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
  creating = false,
  onCreationComplete,
  mode = "hud",
  onBack,
  backRef,
  saveMsg,
  view4Panel = null,
  onView4PanelChange,
}: {
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
  card: HunterCard;
  readOnly: boolean;
  onPendingEditChange?: (pending: boolean) => void;
  creating?: boolean;
  onCreationComplete?: () => void;
  mode?: "quick" | "hud";
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
  saveMsg: string;
  view4Panel?: View4Panel | null;
  onView4PanelChange: (panel: View4Panel | null) => void;
}) {
  const model: AppSheetModel = { data, setField, setFields, card, readOnly };
  return (
    <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <StagedCharacterSheet model={model} mode={mode} creating={creating} onCreationComplete={onCreationComplete} onBack={onBack} backRef={backRef} saveMsg={saveMsg} view4Panel={view4Panel} onView4PanelChange={onView4PanelChange} />
    </AppEditStage>
  );
}

function StagedCharacterSheet({ model, mode, creating, onCreationComplete, onBack, backRef, saveMsg, view4Panel, onView4PanelChange }: {
  model: AppSheetModel;
  mode: "quick" | "hud";
  creating: boolean;
  onCreationComplete?: () => void;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
  saveMsg: string;
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
        {creating
          ? <View4CreationSheet model={stageModel} onBack={onBack} onComplete={() => onCreationComplete?.()} />
          : mode === "hud" ? <View4CharacterSheet model={stageModel} notesModel={model} panel={view4Panel} onPanelChange={onView4PanelChange} onBack={onBack} backRef={backRef} saveMsg={saveMsg} /> : <AppQuickView model={stageModel} onBack={onBack} backRef={backRef} saveMsg={saveMsg} />}
      </main>
      {!model.readOnly && !creating && !(mode === "hud" && view4Panel === "upgrade") && <AppEditTray />}
    </div>
  </CharacterAutomationProvider>;
}
