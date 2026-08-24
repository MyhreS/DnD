import type { RefObject } from "react";
import type { HunterCard, SheetData } from "@/types";
import { CharacterAutomationProvider } from "../papersheet/CharacterAutomationProvider";
import { CharacterSheetHome, type CharacterSheetPanel } from "../character-sheet/CharacterSheetHome";
import { CharacterSheetCreationSheet } from "../character-sheet/CharacterSheetCreationSheet";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStage, AppEditTray } from "./AppEditStage";
import { useAppEditStage } from "./appEditStageContext";
import "./appsheet.css";
import "./appsheet-details.css";
import "../character-sheet/character-sheet.css";

export function AppCharacterSheet({
  data,
  setField,
  setFields,
  card,
  readOnly,
  onPendingEditChange,
  creating = false,
  onCreationComplete,
  onBack,
  backRef,
  saveMsg,
  panel = null,
  onPanelChange,
}: {
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
  card: HunterCard;
  readOnly: boolean;
  onPendingEditChange?: (pending: boolean) => void;
  creating?: boolean;
  onCreationComplete?: () => void;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
  saveMsg: string;
  panel?: CharacterSheetPanel | null;
  onPanelChange: (panel: CharacterSheetPanel | null) => void;
}) {
  const model: AppSheetModel = { data, setField, setFields, card, readOnly };
  return (
    <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <StagedCharacterSheet model={model} creating={creating} onCreationComplete={onCreationComplete} onBack={onBack} backRef={backRef} saveMsg={saveMsg} panel={panel} onPanelChange={onPanelChange} />
    </AppEditStage>
  );
}

function StagedCharacterSheet({ model, creating, onCreationComplete, onBack, backRef, saveMsg, panel, onPanelChange }: {
  model: AppSheetModel;
  creating: boolean;
  onCreationComplete?: () => void;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
  saveMsg: string;
  panel: CharacterSheetPanel | null;
  onPanelChange: (panel: CharacterSheetPanel | null) => void;
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
          ? <CharacterSheetCreationSheet model={stageModel} onBack={onBack} onComplete={() => onCreationComplete?.()} />
          : <CharacterSheetHome model={stageModel} notesModel={model} panel={panel} onPanelChange={onPanelChange} onBack={onBack} backRef={backRef} saveMsg={saveMsg} />}
      </main>
      {!model.readOnly && !creating && panel !== "upgrade" && <AppEditTray />}
    </div>
  </CharacterAutomationProvider>;
}
