import { SheetProvider } from "./sheetPrimitives";
import { SheetPage1 } from "./SheetPage1";
import { SheetPage2 } from "./SheetPage2";
import { SheetPage3, SheetPage4, SheetPage5 } from "./SheetPages345";
import type { SheetData } from "@/types";
import "./papersheet.css";

/** The five A4 pages of the paper character sheet, bound to a SheetData map. */
export function PaperSheet({
  data,
  setField,
  readOnly = false,
  hideSteps = false,
}: {
  data: SheetData;
  setField: (f: string, v: string | boolean) => void;
  readOnly?: boolean;
  hideSteps?: boolean;
}) {
  return (
    <div className={hideSteps ? "papersheet hide-steps" : "papersheet"}>
      <SheetProvider data={data} setField={setField} readOnly={readOnly}>
        <SheetPage1 />
        <SheetPage2 />
        <SheetPage3 />
        <SheetPage4 />
        <SheetPage5 />
      </SheetProvider>
    </div>
  );
}
