import { ModalBackdrop } from "./ModalBackdrop";

/** A small confirmation dialog on the shared .modal-backdrop/.modal pattern
 * (same chrome as LevelUpModal). Clicking the backdrop cancels. */
export function ConfirmModal({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalBackdrop label={title} onDismiss={onCancel}>
      <div className="modal">
        <h2 style={{ margin: "0 0 6px" }}>{title}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.92rem" }}>{body}</p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
