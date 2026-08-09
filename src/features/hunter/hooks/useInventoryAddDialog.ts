import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "select:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useInventoryAddDialog(
  dialogRef: RefObject<HTMLDivElement | null>,
  triggerRef: RefObject<HTMLButtonElement | null>,
  onClose: () => void,
  focusKey: string,
) {
  useEffect(() => {
    const preferred = dialogRef.current?.querySelector<HTMLElement>("[data-dialog-autofocus]");
    (preferred ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [dialogRef, focusKey, onClose]);

  useEffect(() => () => triggerRef.current?.focus(), [triggerRef]);
}
