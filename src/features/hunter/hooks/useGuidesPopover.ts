import { useEffect, type RefObject } from "react";

/** Popover behaviour for the toolbar's Guides menu: while open, focus moves to
 * the first toggle, Escape closes it (captured BEFORE the sheet's own
 * Escape-to-close so the modal stays open) and returns focus to the button,
 * and any tap outside dismisses it. */
export function useGuidesPopover(
  open: boolean,
  close: () => void,
  popRef: RefObject<HTMLDivElement | null>,
  btnRef: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    popRef.current?.querySelector("input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // don't let the sheet's document-level Escape close the modal
      close();
      btnRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, close, popRef, btnRef]);
}
