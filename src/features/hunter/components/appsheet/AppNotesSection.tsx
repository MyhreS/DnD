import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import {
  AppPanel,
  AppSection,
  AutoReason,
  DecisionField,
  sheetText,
  type AppSheetModel,
} from "./appSheetShared";

export function AppNotesSection({ model }: { model: AppSheetModel }) {
  const { card } = useCharacterAutomation();
  const transformations = card.activeTransformations ?? [];
  const notes = sheetText(model.data, "pageNotes") || card.notes || "";

  return (
    <AppSection title="Notes">
      <div className="appsheet-notes-layout single">
        <AppPanel title="Campaign notes" className="appsheet-notes-panel">
          <DecisionField label="Notes shared by both character views">
            <textarea
              data-testid="appsheet-notes"
              data-f="pageNotes"
              value={notes}
              disabled={model.readOnly}
              placeholder="People, places, promises, clues…"
              onChange={(event) => model.setFields({ pageNotes: event.target.value }, { notes: event.target.value })}
            />
          </DecisionField>
        </AppPanel>
      </div>

      {transformations.length > 0 && (
        <AppPanel title="Active transformations">
          <div className="appsheet-token-list">{transformations.map((entry, index) => <span key={`${entry}-${index}`}>{entry}</span>)}</div>
          <AutoReason reason="Transformation results are rolled physically and recorded by the DM; reducing Transformation Level clears active results." />
        </AppPanel>
      )}
    </AppSection>
  );
}
