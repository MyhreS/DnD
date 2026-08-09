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
    <CharacterAutomationProvider card={card} onApply={setFields} readOnly={readOnly}>
      <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <div className="character-app-sheet" data-testid="app-character-sheet">
        <main className="appsheet-workspace">
          {mode === "quick" ? <AppQuickView model={model} /> : <>
            <AppOverviewSection model={model} />
            <AppCombatSection model={model} />
            <AppFeaturesSection model={model} />
            <AppAbilitiesSection model={model} />
            <AppGearSection model={model} />
            <AppNotesSection model={model} />
          </>}
        </main>
        {!readOnly && <AppEditTray />}
      </div>
      </AppEditStage>
    </CharacterAutomationProvider>
  );
}
