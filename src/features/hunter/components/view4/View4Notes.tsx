import { useState } from "react";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4SessionNotes } from "./View4SessionNotes";

type NotesView = "personal" | "sessions";

export function View4Notes({ model }: { model: AppSheetModel }) {
  const { card } = useCharacterAutomation();
  const [view, setView] = useState<NotesView>("personal");
  const notes = sheetText(model.data, "pageNotes") || card.notes || "";
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return <div className="v4-notes">
    <div className="v4-notes-tabs" role="tablist" aria-label="Choose notes">
      <button type="button" role="tab" aria-selected={view === "personal"} onClick={() => setView("personal")}><span>Personal</span><small>This character</small></button>
      <button type="button" role="tab" aria-selected={view === "sessions"} onClick={() => setView("sessions")}><span>Sessions</span><small>Shared records</small></button>
    </div>

    {view === "personal" ? <section className="v4-notes-paper" role="tabpanel">
      <label htmlFor="view4-personal-notes">Personal journal</label>
      <textarea
        id="view4-personal-notes"
        data-testid="appsheet-notes"
        data-f="pageNotes"
        value={notes}
        disabled={model.readOnly}
        placeholder="Thoughts, clues and promises…"
        onChange={(event) => model.setFields({ pageNotes: event.target.value }, { notes: event.target.value })}
      />
      <footer><span>Saved with {card.name}</span><span>{words} word{words === 1 ? "" : "s"}</span></footer>
    </section> : <View4SessionNotes card={card} readOnly={model.readOnly} />}
  </div>;
}
