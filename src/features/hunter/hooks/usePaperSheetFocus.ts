import { useEffect, useRef } from "react";

/** Dialog basics for the sheet overlay: focus lands on the Done button when
 * it opens (keyboard users aren't stranded on the hidden page behind it) and
 * Escape closes it. Returns the ref to put on the Done button. */
export function usePaperSheetFocus(onClose: () => void) {
  const doneRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    doneRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return doneRef;
}
