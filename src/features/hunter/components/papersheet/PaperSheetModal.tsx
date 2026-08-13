import { useState } from "react";
import { createPortal } from "react-dom";
import { useCharacterView } from "@/app/characterView";
import type { HunterCard } from "@/types";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetFocus } from "../../hooks/usePaperSheetFocus";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import { AppCharacterSheet } from "../appsheet/AppCharacterSheet";
import type { View4Panel } from "../view4/View4CharacterSheet";
import "../character-editor.css";

/** Shared full-screen character editor for the two app-native views. */
export function PaperSheetModal({ card, onClose, readOnly = false, create = false }: {
  card: HunterCard;
  onClose: () => void;
  readOnly?: boolean;
  create?: boolean;
}) {
  const { data, setField, setFields, workingCard, saveMsg } = usePaperSheetAutosave(card, { readOnly, create });
  const view = useCharacterView((state) => state.view);
  const [view4Panel, setView4Panel] = useState<View4Panel | null>(null);
  const [appEditPending, setAppEditPending] = useState(false);

  const closeEditor = () => {
    if (appEditPending && !window.confirm("Discard the previewed changes and close the character?")) return;
    onClose();
  };
  const handleBack = () => {
    if (view === "hud" && view4Panel) {
      setView4Panel(null);
      return;
    }
    closeEditor();
  };

  usePaperSheetOpen();
  const backRef = usePaperSheetFocus(handleBack);

  return createPortal(
    <div className={`papersheet-modal character-editor-modal view-${view}`} role="dialog" aria-modal="true" aria-label="Character sheet">
      <AppCharacterSheet
        data={data}
        setField={setField}
        setFields={setFields}
        card={workingCard}
        readOnly={readOnly}
        onPendingEditChange={setAppEditPending}
        mode={view}
        onBack={handleBack}
        backRef={backRef}
        saveMsg={readOnly ? "" : saveMsg}
        view4Panel={view4Panel}
        onView4PanelChange={setView4Panel}
      />
    </div>,
    document.body,
  );
}
