import { useState } from "react";
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
import "./appsheet.css";

const SECTIONS = [
  ["overview", "Overview"],
  ["abilities", "Abilities & skills"],
  ["combat", "Combat & armor"],
  ["gear", "Gear"],
  ["features", "Features"],
  ["notes", "Notes"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

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
  const [active, setActive] = useState<SectionId>("overview");
  const model: AppSheetModel = { data, setField, setFields, card, readOnly };
  return (
    <CharacterAutomationProvider card={card} onApply={setFields} readOnly={readOnly}>
      <AppEditStage model={model} onPendingChange={onPendingEditChange}>
      <div className="character-app-sheet" data-testid="app-character-sheet">
        <aside className="appsheet-nav" aria-label="Character sections">
          <div className="appsheet-nav-label">Character</div>
          <nav>
            {SECTIONS.map(([id, label], index) => (
              <button
                key={id}
                type="button"
                className={active === id ? "active" : ""}
                aria-current={active === id ? "page" : undefined}
                onClick={() => setActive(id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>{label}
              </button>
            ))}
          </nav>
          <p>One character. Every value stays synchronized with the paper sheet.</p>
        </aside>
        <main className="appsheet-workspace">
          {active === "overview" && <AppOverviewSection model={model} />}
          {active === "abilities" && <AppAbilitiesSection model={model} />}
          {active === "combat" && <AppCombatSection model={model} />}
          {active === "gear" && <AppGearSection model={model} />}
          {active === "features" && <AppFeaturesSection model={model} />}
          {active === "notes" && <AppNotesSection model={model} />}
        </main>
        {!readOnly && <AppEditTray />}
      </div>
      </AppEditStage>
    </CharacterAutomationProvider>
  );
}
