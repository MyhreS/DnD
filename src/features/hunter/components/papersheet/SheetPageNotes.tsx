import { Ta } from "./sheetPrimitives";

/** Page 6 — one big free-form notes area. It is NOT a creation step, so it
 * carries no step badge or `data-step`: with a step spotlighted the whole
 * page simply dims like any other match-less region. */
export function SheetPageNotes() {
  return (
    <div className="page">
      <div className="blue-rule" style={{ marginTop: 0, width: "60mm" }} />
      <div className="pblock notespage">
        <h2 className="sec">NOTES</h2>
        <div className="notesarea">
          {/* PRINT-only ruling: Chromium mispaints repeating gradients on
            * paginated boxes (see papersheet.css), so the printed lines are
            * real elements; the screen keeps the gradient (it scrolls with
            * the text), where these stay hidden. */}
          <div className="noteslines" aria-hidden="true">
            {Array.from({ length: 27 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <Ta f="pageNotes" aria-label="Notes" />
        </div>
      </div>
      <div className="pageno">PAGE 6 · NOTES</div>
    </div>
  );
}
