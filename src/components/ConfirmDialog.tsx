import { useId } from "react";
import { createPortal } from "react-dom";
import { useModalDialog } from "@/hooks/common/useModalDialog";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep editing",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useModalDialog(onCancel);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return createPortal(
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <p className="eyebrow">Please confirm</p>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="confirm-dialog-description">{description}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" data-dialog-initial-focus onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn confirm-dialog-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
