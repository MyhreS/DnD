import { useState } from "react";
import { createPortal } from "react-dom";
import { PaperSheet } from "./PaperSheet";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import type { HunterCard } from "@/types";

/** The paper sheet as a full-screen popup: dark desk background, the original
 * sheet toolbar (steps toggle, clear, PDF export) and autosave to Firestore.
 * `readOnly` is for looking at someone else's hunter (party view). */
export function PaperSheetModal({
  card,
  onClose,
  readOnly = false,
}: {
  card: HunterCard;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const { data, setField, saveMsg, clear } = usePaperSheetAutosave(card, readOnly);
  const [showSteps, setShowSteps] = useState(true);
  usePaperSheetOpen();

  return createPortal(
    <div className="papersheet-modal" role="dialog" aria-modal="true" aria-label="Character sheet">
      <div className="papersheet-toolbar">
        <button type="button" className="ghost" onClick={onClose}>← Done</button>
        <h1>CATACOMBS &amp; STARSPAWNS · CHARACTER SHEET</h1>
        <span className="savemsg">{readOnly ? "Read-only" : saveMsg}</span>
        <label>
          <input type="checkbox" checked={showSteps} onChange={(e) => setShowSteps(e.target.checked)} />
          Show step numbers
        </label>
        {!readOnly && (
          <button type="button" className="ghost" onClick={clear}>Clear sheet</button>
        )}
        <button type="button" onClick={() => window.print()}>Export to PDF</button>
      </div>
      <PaperSheet data={data} setField={setField} readOnly={readOnly} hideSteps={!showSteps} />
    </div>,
    document.body,
  );
}
