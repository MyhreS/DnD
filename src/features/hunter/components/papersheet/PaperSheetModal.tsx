import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PaperSheet } from "./PaperSheet";
import { StepGuidance } from "./StepGuidance";
import { GuidesMenu } from "./GuidesMenu";
import { usePaperSheetAutosave } from "../../hooks/usePaperSheetAutosave";
import { usePaperSheetOpen } from "../../hooks/usePaperSheetOpen";
import { usePaperSheetFocus } from "../../hooks/usePaperSheetFocus";
import type { HunterCard } from "@/types";
import { automationFor, hasLegacySheetToConvert } from "../../lib/characterAutomation";
import { CharacterAutomationPanel } from "./CharacterAutomationPanel";
import { LegacySheetWizard } from "./LegacySheetWizard";

const STEPS = [1, 2, 3, 4, 5] as const;

/** The paper sheet as a full-screen popup: dark desk background, the sheet
 * toolbar (Back, step selector, Guides menu, Print) and autosave to
 * Firestore.
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
  // Which creation step (1–5) is spotlighted on the sheet; null = none.
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showBuilder, setShowBuilder] = useState(create);
  const [showMigration, setShowMigration] = useState(() => !readOnly && hasLegacySheetToConvert(card));
  const startedAsCreate = useRef(create);
  const automated = automationFor(workingCard);
  const automationState = workingCard.sheetAutomation;
  const closeModal = () => {
    if (startedAsCreate.current && workingCard.classId && workingCard.backgroundId && !automationState?.setupComplete) {
      setFields({}, {
        sheetAutomation: {
          ...(automationState ?? { version: 1, classSkills: [], backgroundBonuses: {} }),
          setupComplete: true,
        },
      });
    }
    onClose();
  };
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
  const backRef = usePaperSheetFocus(closeModal);

  return createPortal(
    <div className="papersheet-modal" role="dialog" aria-modal="true" aria-label="Character sheet">
      <div className="papersheet-toolbar">
        <button type="button" className="ghost" ref={backRef} onClick={closeModal}>← Back</button>
        <h1>CATACOMBS &amp; STARSPAWNS · CHARACTER SHEET</h1>
        {!readOnly && (
          <>
            <span className="savemsg">{saveMsg}</span>
            <button
              type="button"
              className={showBuilder ? "ghost automation-trigger active" : "ghost automation-trigger"}
              aria-pressed={showBuilder}
              onClick={() => setShowBuilder((open) => !open)}
            >
              ✦ Build &amp; calculate
            </button>
            {showSteps && (
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
            {showSteps && activeStep != null && <StepGuidance step={activeStep} />}
            <GuidesMenu
              showSteps={showSteps}
              showInfo={showInfo}
              setShowSteps={setShowSteps}
              setShowInfo={setShowInfo}
            />
            <button type="button" className="ghost" onClick={() => window.print()}>Print</button>
          </>
        )}
      </div>
      <PaperSheet
        data={data}
        setField={sheetSetField}
        readOnly={readOnly}
        hideSteps={!showSteps}
        hideInfo={!showInfo}
        activeStep={showSteps ? activeStep : null}
        automationReasons={automated.reasons}
        manualOverrides={automationState?.manualOverrides}
      />
      {!readOnly && showBuilder && (
        <CharacterAutomationPanel card={workingCard} onApply={setFields} onClose={() => setShowBuilder(false)} />
      )}
      {showMigration && (
        <LegacySheetWizard
          card={workingCard}
          onApply={setFields}
          onCancel={closeModal}
          onComplete={() => setShowMigration(false)}
        />
      )}
    </div>,
    document.body,
  );
}
