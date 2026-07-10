import { useEffect } from "react";

// Ref-counted: two sheet modals can overlap for a frame (closing the create
// draft while the view popup opens) — the body must stay marked until the
// LAST one unmounts. The pre-sheet overflow is captured when the FIRST opens,
// so a later-mounted overlay never "restores" the hidden state it inherited.
let openCount = 0;
let prevOverflow = "";

// @page cannot be scoped by selector, so an always-loaded stylesheet would
// force A4/no-margin onto EVERY print in the app. Inject it only while a
// sheet overlay is actually open.
const PAGE_STYLE_ID = "papersheet-page-style";

function addPageStyle() {
  if (document.getElementById(PAGE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PAGE_STYLE_ID;
  style.textContent = "@page { size: A4; margin: 0; }";
  document.head.appendChild(style);
}

/** While a paper-sheet overlay is open: lock the page scroll behind it, mark
 * <body> so print CSS can hide the app and print only the sheet, and scope
 * the sheet's A4 @page rule to the overlay's lifetime. */
export function usePaperSheetOpen(): void {
  useEffect(() => {
    if (openCount === 0) {
      prevOverflow = document.body.style.overflow;
      document.body.classList.add("papersheet-open");
      document.body.style.overflow = "hidden";
      addPageStyle();
    }
    openCount += 1;
    return () => {
      openCount -= 1;
      if (openCount === 0) {
        document.body.classList.remove("papersheet-open");
        document.body.style.overflow = prevOverflow;
        document.getElementById(PAGE_STYLE_ID)?.remove();
      }
    };
  }, []);
}
