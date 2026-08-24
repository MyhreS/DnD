import { useEffect, useRef } from "react";

/** Dialog basics for the sheet overlay: focus lands on the Hunters button when
 * it opens (keyboard users aren't stranded on the hidden page behind it) and
 * Escape closes it. Returns the ref to put on the Hunters button. */
export function usePaperSheetFocus(onClose: () => void) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return backRef;
}
