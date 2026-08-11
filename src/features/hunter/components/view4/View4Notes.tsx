import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

export function View4Notes({ model }: { model: AppSheetModel }) {
  const { card } = useCharacterAutomation();
  const notes = sheetText(model.data, "pageNotes") || card.notes || "";
  const transformations = card.activeTransformations ?? [];
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return <div className="v4-notes">
    <section className="v4-notes-paper">
      <label htmlFor="view4-campaign-notes">Campaign journal</label>
      <textarea
        id="view4-campaign-notes"
        data-testid="appsheet-notes"
        data-f="pageNotes"
        value={notes}
        disabled={model.readOnly}
        placeholder="People, places, promises, clues…"
        onChange={(event) => model.setFields({ pageNotes: event.target.value }, { notes: event.target.value })}
      />
      <footer><span>Shared with your other character views</span><span>{words} word{words === 1 ? "" : "s"}</span></footer>
    </section>

    {transformations.length > 0 && <section className="v4-notes-transformations">
      <span>Active transformations</span>
      <div>{transformations.map((entry, index) => <b key={`${entry}-${index}`}>{entry}</b>)}</div>
      <small>Reducing Transformation clears active results.</small>
    </section>}
  </div>;
}
