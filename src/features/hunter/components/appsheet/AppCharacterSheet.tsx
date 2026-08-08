import type { HunterCard, SheetData } from "@/types";
import { CharacterAutomationProvider } from "../papersheet/CharacterAutomationProvider";
import { AppOverviewSection } from "./AppOverviewSection";
import { AppAbilitiesSection } from "./AppAbilitiesSection";
import { AppCombatSection } from "./AppCombatSection";
import { AppGearSection } from "./AppGearSection";
import { AppFeaturesSection } from "./AppFeaturesSection";
import { AppNotesSection } from "./AppNotesSection";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStage, AppEditTray } from "./AppEditStage";
import { LevelUpPrompt } from "./LevelUpPrompt";
import "./appsheet.css";
import "./appsheet-details.css";

export function AppCharacterSheet({
  data,
  setField,
  setFields,
  card,
  readOnly,
  onPendingEditChange,
}: {
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
  card: HunterCard;
  readOnly: boolean;
  onPendingEditChange?: (pending: boolean) => void;
}) {
  const model: AppSheetModel = { data, setField, setFields, card, readOnly };
  return (
    <CharacterAutomationProvider card={card} onApply={setFields} readOnly={readOnly}>
      <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <div className="character-app-sheet" data-testid="app-character-sheet">
        <main className="appsheet-workspace">
          <AppOverviewSection model={model} />
          <AppCombatSection model={model} />
          <AppFeaturesSection model={model} />
          <AppAbilitiesSection model={model} />
          <AppGearSection model={model} />
          <AppNotesSection model={model} />
        </main>
        {!readOnly && <AppEditTray />}
        <LevelUpPrompt card={card} readOnly={readOnly} />
      </div>
      </AppEditStage>
    </CharacterAutomationProvider>
  );
}
