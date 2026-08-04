import { SheetProvider } from "./sheetPrimitives";
import { SheetPage1 } from "./SheetPage1";
import { SheetPage2 } from "./SheetPage2";
import { SheetPage3, SheetPage4, SheetPage5 } from "./SheetPages345";
import { SheetPageNotes } from "./SheetPageNotes";
import type { SheetData } from "@/types";
import type { HunterCard } from "@/types";
import { CharacterAutomationProvider } from "./CharacterAutomationProvider";
import "./papersheet.css";

/** The six A4 pages of the paper character sheet, bound to a SheetData map. */
export function PaperSheet({
  data,
  setField,
  readOnly = false,
  hideSteps = false,
  hideInfo = false,
  activeStep = null,
  automationReasons = {},
  manualOverrides = [],
  card,
  setFields,
}: {
  data: SheetData;
  setField: (f: string, v: string | boolean) => void;
  readOnly?: boolean;
  hideSteps?: boolean;
  /** Hide the little ⓘ info dots beside each section (toolbar toggle). */
  hideInfo?: boolean;
  /** Creation step (1–5) to spotlight: units tagged `data-step` with this
   * number highlight, everything else dims (see papersheet.css). */
  activeStep?: number | null;
  automationReasons?: Record<string, string>;
  manualOverrides?: string[];
  card: HunterCard;
  setFields: (fields: SheetData, patch: Partial<HunterCard>) => void;
}) {
  return (
    <div
      className={["papersheet", hideSteps && "hide-steps", hideInfo && "hide-info"]
        .filter(Boolean)
        .join(" ")}
      data-active-step={activeStep ?? undefined}
    >
      <CharacterAutomationProvider card={card} onApply={setFields} readOnly={readOnly}>
        <SheetProvider data={data} setField={setField} readOnly={readOnly} automationReasons={automationReasons} manualOverrides={manualOverrides}>
          <SheetPage1 />
          <SheetPage2 />
          <SheetPage3 />
          <SheetPage4 />
          <SheetPage5 />
          <SheetPageNotes />
        </SheetProvider>
      </CharacterAutomationProvider>
    </div>
  );
}
