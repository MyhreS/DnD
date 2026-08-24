import { useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { HunterCard } from "@/types";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetFocus } from "../../hooks/usePaperSheetFocus";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import { AppCharacterSheet } from "../appsheet/AppCharacterSheet";
import type { CharacterSheetPanel } from "../character-sheet/CharacterSheetHome";
import "../character-editor.css";

/** Shared full-screen editor for the app's canonical character sheet. */
export function PaperSheetModal({ card, onClose, readOnly = false, create = false }: {
  card: HunterCard;
  onClose: () => void;
  readOnly?: boolean;
  create?: boolean;
}) {
  const { data, setField, setFields, workingCard, saveMsg } = usePaperSheetAutosave(card, { readOnly, create });
  const [panel, setPanel] = useState<CharacterSheetPanel | null>(null);
  const [appEditPending, setAppEditPending] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [creationFinished, setCreationFinished] = useState(false);
  const creating = !readOnly
    && !creationFinished
    && (create || workingCard.sheetAutomation?.setupComplete === false);

  const closeEditor = () => {
    if (appEditPending) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };
  const handleBack = () => {
    if (confirmingClose) {
      setConfirmingClose(false);
      return;
    }
    if (panel) {
      setPanel(null);
      return;
    }
    closeEditor();
  };

  usePaperSheetOpen();
  const backRef = usePaperSheetFocus(handleBack);

  return createPortal(
    <div className="papersheet-modal character-editor-modal character-sheet-modal" role="dialog" aria-modal="true" aria-label="Character sheet">
      <AppCharacterSheet
        data={data}
        setField={setField}
        setFields={setFields}
        card={workingCard}
        readOnly={readOnly}
        onPendingEditChange={setAppEditPending}
        creating={creating}
        onCreationComplete={() => setCreationFinished(true)}
        onBack={handleBack}
        backRef={backRef}
        saveMsg={readOnly ? "" : saveMsg}
        panel={panel}
        onPanelChange={setPanel}
      />
      {confirmingClose && (
        <ConfirmDialog
          title="Discard changes?"
          description="These previewed character changes have not been applied. Closing now will leave the saved character unchanged."
          confirmLabel="Discard changes"
          onCancel={() => setConfirmingClose(false)}
          onConfirm={onClose}
        />
      )}
    </div>,
    document.body,
  );
}
