import { useState } from "react";
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

const STEPS = [1, 2, 3, 4, 5] as const;
type CharacterViewMode = "app" | "quick" | "paper";
const VIEW_KEY = "cs-character-sheet-view";

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
    return saved === "paper" || saved === "app" || saved === "quick" ? saved : "app";
  });
  const [appEditPending, setAppEditPending] = useState(false);
  const setView = (next: CharacterViewMode) => {
    if ((view === "app" || view === "quick") && next !== view && appEditPending && !window.confirm("Discard the previewed changes and switch views?")) return;
    setAppEditPending(false);
    setViewState(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };
  const closeEditor = () => {
    if ((view === "app" || view === "quick") && appEditPending && !window.confirm("Discard the previewed changes and close the character?")) return;
    onClose();
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
  const backRef = usePaperSheetFocus(closeEditor);

  return createPortal(
    <div className={`papersheet-modal character-editor-modal view-${view}`} role="dialog" aria-modal="true" aria-label="Character sheet">
      <div className="papersheet-toolbar">
        <div className="papersheet-toolbar-primary">
          <button type="button" className="ghost" ref={backRef} onClick={closeEditor}>← Back</button>
          <div className="character-view-switch" role="group" aria-label="Character sheet view">
            <button type="button" className={view === "app" ? "active" : ""} aria-pressed={view === "app"} onClick={() => setView("app")}>App view</button>
            <button type="button" className={view === "quick" ? "active" : ""} aria-pressed={view === "quick"} onClick={() => setView("quick")}>App view 2</button>
            <button type="button" className={view === "paper" ? "active" : ""} aria-pressed={view === "paper"} onClick={() => setView("paper")}>Paper sheet</button>
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
      {view === "app" || view === "quick" ? (
        <AppCharacterSheet data={data} setField={sheetSetField} setFields={setFields} card={workingCard} readOnly={readOnly} onPendingEditChange={setAppEditPending} mode={view} />
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
