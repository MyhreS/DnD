import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { HunterCard } from "@/types";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetFocus } from "../../hooks/usePaperSheetFocus";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import { AppCharacterSheet } from "../appsheet/AppCharacterSheet";
import type { View4Panel } from "../view4/View4CharacterSheet";
import "../character-editor.css";

type CharacterViewMode = "quick" | "hud";
const VIEW_KEY = "cs-character-sheet-view";
const VIEW_OPTIONS: ReadonlyArray<{ view: CharacterViewMode; label: string }> = [
  { view: "quick", label: "View 3" },
  { view: "hud", label: "View 4" },
];

/** Shared full-screen character editor for the two app-native views. */
export function PaperSheetModal({
  card,
  onClose,
  readOnly = false,
  create = false,
}: {
  card: HunterCard;
  onClose: () => void;
  readOnly?: boolean;
  create?: boolean;
}) {
  const { data, setField, setFields, workingCard, saveMsg } = usePaperSheetAutosave(card, { readOnly, create });
  const [view, setViewState] = useState<CharacterViewMode>(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    return saved === "quick" || saved === "hud" ? saved : "hud";
  });
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [view4Panel, setView4Panel] = useState<View4Panel | null>(null);
  const [appEditPending, setAppEditPending] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuTriggerRef = useRef<HTMLButtonElement>(null);

  const setView = (next: CharacterViewMode) => {
    if (next !== view && appEditPending && !window.confirm("Discard the previewed changes and switch views?")) return;
    setAppEditPending(false);
    setView4Panel(null);
    setViewState(next);
    window.localStorage.setItem(VIEW_KEY, next);
    setViewMenuOpen(false);
  };
  const closeEditor = () => {
    if (appEditPending && !window.confirm("Discard the previewed changes and close the character?")) return;
    onClose();
  };
  const handleBack = () => {
    if (viewMenuOpen) {
      setViewMenuOpen(false);
      viewMenuTriggerRef.current?.focus();
      return;
    }
    if (view === "hud" && view4Panel) {
      setView4Panel(null);
      return;
    }
    closeEditor();
  };

  usePaperSheetOpen();
  const backRef = usePaperSheetFocus(handleBack);
  const closeViewMenuOnBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setViewMenuOpen(false);
  };
  const closeViewMenuOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !viewMenuOpen) return;
    event.preventDefault();
    event.stopPropagation();
    setViewMenuOpen(false);
    viewMenuTriggerRef.current?.focus();
  };
  const activeViewLabel = VIEW_OPTIONS.find((option) => option.view === view)?.label;

  return createPortal(
    <div className={`papersheet-modal character-editor-modal view-${view}`} role="dialog" aria-modal="true" aria-label="Character sheet">
      <div className="papersheet-toolbar">
        <div className="papersheet-toolbar-primary">
          <button type="button" className="ghost" ref={backRef} onClick={handleBack}>← Back</button>
          <div className="character-view-menu" ref={viewMenuRef} onBlur={closeViewMenuOnBlur} onKeyDown={closeViewMenuOnEscape}>
            <button
              type="button"
              ref={viewMenuTriggerRef}
              className="ghost character-view-menu-trigger"
              aria-label="Choose character view"
              aria-haspopup="menu"
              aria-expanded={viewMenuOpen}
              aria-controls="character-sheet-views"
              onClick={() => setViewMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">☰</span>
              {activeViewLabel}
            </button>
            {viewMenuOpen && (
              <div id="character-sheet-views" className="character-view-menu-popover" role="menu" aria-label="Character sheet views">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.view}
                    type="button"
                    role="menuitemradio"
                    aria-checked={view === option.view}
                    className={view === option.view ? "active" : ""}
                    onClick={() => setView(option.view)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!readOnly && <span className="savemsg">{saveMsg}</span>}
      </div>
      <AppCharacterSheet
        data={data}
        setField={setField}
        setFields={setFields}
        card={workingCard}
        readOnly={readOnly}
        onPendingEditChange={setAppEditPending}
        mode={view}
        view4Panel={view4Panel}
        onView4PanelChange={setView4Panel}
      />
    </div>,
    document.body,
  );
}
