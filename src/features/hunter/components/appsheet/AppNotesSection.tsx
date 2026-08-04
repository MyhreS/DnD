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
  const { card, result } = useCharacterAutomation();
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

      <div className="appsheet-two-column">
        <AppPanel title="Active transformations">
          {transformations.length ? <div className="appsheet-token-list">{transformations.map((entry, index) => <span key={`${entry}-${index}`}>{entry}</span>)}</div> : <p className="appsheet-empty-copy">No active transformations recorded.</p>}
          <AutoReason reason="Transformation results are rolled physically and recorded by the DM; reducing Transformation Level clears active results." />
        </AppPanel>
        <AppPanel title="Visible armor impression">
          <p className="appsheet-large-readout">{String(result.fields.impressions || "No special visible impression.")}</p>
          <AutoReason reason={result.reasons.impressions} />
        </AppPanel>
      </div>
    </AppSection>
  );
}
