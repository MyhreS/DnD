import { useEffect } from "react";

// Ref-counted: two sheet modals can overlap for a frame (closing the create
// draft while the view popup opens) — the body must stay marked until the
// LAST one unmounts. The pre-sheet overflow is captured when the FIRST opens,
// so a later-mounted overlay never "restores" the hidden state it inherited.
let openCount = 0;
let prevOverflow = "";

/** While a paper-sheet overlay is open: lock the page scroll behind it and
 * mark <body> so print CSS can hide the app and print only the sheet. */
export function usePaperSheetOpen(): void {
  useEffect(() => {
    if (openCount === 0) {
      prevOverflow = document.body.style.overflow;
      document.body.classList.add("papersheet-open");
      document.body.style.overflow = "hidden";
    }
    openCount += 1;
    return () => {
      openCount -= 1;
      if (openCount === 0) {
        document.body.classList.remove("papersheet-open");
        document.body.style.overflow = prevOverflow;
      }
    };
  }, []);
}
