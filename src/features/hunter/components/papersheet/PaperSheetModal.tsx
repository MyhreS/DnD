import { createPortal } from "react-dom";
import type { HunterCard } from "@/types";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetFocus } from "../../hooks/usePaperSheetFocus";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import { SourceCharacterSheet } from "../SourceCharacterSheet";
import "../character-editor.css";

/** One source-faithful editor for both new and existing hunters. Every value is
 * recorded manually because the current source set supplies a sheet, not class,
 * equipment, progression, or derived-stat rules. */
export function PaperSheetModal({ card, onClose, readOnly = false, create = false }: {
  card: HunterCard;
  onClose: () => void;
  readOnly?: boolean;
  create?: boolean;
}) {
  const { data, setField, setFields, workingCard, saveMsg } = usePaperSheetAutosave(card, { readOnly, create });
  usePaperSheetOpen();
  const backRef = usePaperSheetFocus(onClose);

  return createPortal(
    <div className="papersheet-modal character-editor-modal" role="dialog" aria-modal="true" aria-label="Character sheet">
      <SourceCharacterSheet
        data={data}
        setField={setField}
        setFields={setFields}
        card={workingCard}
        readOnly={readOnly}
        onBack={onClose}
        backRef={backRef}
        saveMsg={readOnly ? "" : saveMsg}
      />
    </div>,
    document.body,
  );
}
