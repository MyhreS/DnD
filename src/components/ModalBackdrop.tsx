import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Shared chrome for every dialog: the fixed `.modal-backdrop`, rendered
 * through a portal to <body>. The portal matters — pages animate in via
 * `.fade-in`, and while that transform plays the wrapper is the containing
 * block for position:fixed, so a backdrop rendered inline lands mid-page
 * instead of covering the viewport. Clicking the backdrop itself (not the
 * dialog) calls `onDismiss`, when given. */
export function ModalBackdrop({
  label,
  onDismiss,
  children,
}: {
  label: string;
  /** Called when the user clicks outside the dialog. Omit for modals that
   * must be completed (e.g. the level-up walk). */
  onDismiss?: () => void;
  children: ReactNode;
}) {
  return createPortal(
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
