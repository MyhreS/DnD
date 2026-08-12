import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { PaperSheet } from "./PaperSheet";
import { StepGuidance } from "./StepGuidance";
import { GuidesMenu } from "./GuidesMenu";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import { usePaperSheetFocus } from "../../hooks/usePaperSheetFocus";
import type { HunterCard } from "@/types";
import { automationFor } from "../../lib/characterAutomation";
import { AppCharacterSheet } from "../appsheet/AppCharacterSheet";
import type { View4Panel } from "../view4/View4CharacterSheet";

const STEPS = [1, 2, 3, 4, 5] as const;
type CharacterViewMode = "quick" | "paper" | "hud";
const VIEW_KEY = "cs-character-sheet-view";
const VIEW_OPTIONS: ReadonlyArray<{ view: CharacterViewMode; label: string }> = [
  { view: "paper", label: "View 1" },
  { view: "quick", label: "View 3" },
  { view: "hud", label: "View 4" },
];

/** The shared character editor as a full-screen popup. Its app-native and
 * paper views consume one autosave session and the same saved character.
 * `readOnly` is for looking at someone else's hunter (party view / DM board) —
 * it strips the toolbar down to just Back; `create` marks the one surface
 * allowed to CREATE the doc (a brand-new draft) and is the only open that
 * starts with the step numbers + info icons showing. */
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
  // Guides default OFF; the create flow opens with them ON (initial value only —
  // `create` intentionally flips to false once autosave lands the draft).
  const [showSteps, setShowSteps] = useState(create);
  const [showInfo, setShowInfo] = useState(create);
  const [view, setViewState] = useState<CharacterViewMode>(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    return saved === "paper" || saved === "quick" || saved === "hud" ? saved : "hud";
  });
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [view4Panel, setView4Panel] = useState<View4Panel | null>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [appEditPending, setAppEditPending] = useState(false);
  const setView = (next: CharacterViewMode) => {
    if (view !== "paper" && next !== view && appEditPending && !window.confirm("Discard the previewed changes and switch views?")) return;
    setAppEditPending(false);
    setView4Panel(null);
    setViewState(next);
    window.localStorage.setItem(VIEW_KEY, next);
    setViewMenuOpen(false);
  };
  const closeEditor = () => {
    if (view !== "paper" && appEditPending && !window.confirm("Discard the previewed changes and close the character?")) return;
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
  // Which creation step (1–5) is spotlighted on the sheet; null = none.
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const automated = automationFor(workingCard);
  const automationState = workingCard.sheetAutomation;
  const sheetSetField = (field: string, value: string | boolean) => {
    if (automated.reasons[field] && !automationState?.manualOverrides?.includes(field)) {
      setFields({ [field]: value }, {
        sheetAutomation: {
          ...(automationState ?? { version: 1, classSkills: [], backgroundBonuses: {} }),
          manualOverrides: [...(automationState?.manualOverrides ?? []), field],
        },
      });
      return;
    }
    setField(field, value);
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
          <div
            className="character-view-menu"
            ref={viewMenuRef}
            onBlur={closeViewMenuOnBlur}
            onKeyDown={closeViewMenuOnEscape}
          >
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
        {!readOnly && (
          <>
            <span className="savemsg">{saveMsg}</span>
            {view === "paper" && showSteps && (
              <div className="stepsel" role="group" aria-label="Highlight a character-creation step">
                <span className="steplbl">Step</span>
                {STEPS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={activeStep === n ? "stepbtn active" : "stepbtn"}
                    aria-pressed={activeStep === n}
                    title={`Highlight everything you fill in during step ${n}`}
                    onClick={() => setActiveStep((s) => (s === n ? null : n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            {view === "paper" && showSteps && activeStep != null && <StepGuidance step={activeStep} />}
            {view === "paper" && (
              <>
                <GuidesMenu
                  showSteps={showSteps}
                  showInfo={showInfo}
                  setShowSteps={setShowSteps}
                  setShowInfo={setShowInfo}
                />
                <button type="button" className="ghost" onClick={() => window.print()}>Print</button>
              </>
            )}
          </>
        )}
      </div>
      {view !== "paper" ? (
        <AppCharacterSheet data={data} setField={sheetSetField} setFields={setFields} card={workingCard} readOnly={readOnly} onPendingEditChange={setAppEditPending} mode={view} view4Panel={view4Panel} onView4PanelChange={setView4Panel} />
      ) : (
        <PaperSheet
          data={data}
          setField={sheetSetField}
          readOnly={readOnly}
          hideSteps={!showSteps}
          hideInfo={!showInfo}
          activeStep={showSteps ? activeStep : null}
          automationReasons={automated.reasons}
          manualOverrides={automationState?.manualOverrides}
          card={workingCard}
          setFields={setFields}
        />
      )}
    </div>,
    document.body,
  );
}
