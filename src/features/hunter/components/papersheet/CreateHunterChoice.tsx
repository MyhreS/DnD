import { ModalBackdrop } from "@/components/ModalBackdrop";

/** "Create character" fork: the classic paper sheet (recommended) or the
 * guided in-app builder (still unfinished). */
export function CreateHunterChoice({
  onSheet,
  onApp,
  onCancel,
}: {
  onSheet: () => void;
  onApp: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalBackdrop label="How do you want to create your hunter?" onDismiss={onCancel}>
      <div className="modal">
        <p className="eyebrow" style={{ marginTop: 0 }}>New hunter</p>
        <h2 style={{ margin: "0 0 4px" }}>How do you want to build it?</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
          Both are saved to your account and can join campaigns.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          <button type="button" className="card card-hover" style={{ textAlign: "left", width: "100%" }} onClick={onSheet}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.05rem" }}>
              Character sheet way <span className="gold">(recommended)</span>
            </div>
            <p className="faint" style={{ fontSize: "0.84rem", margin: "4px 0 0" }}>
              Fill in the classic five-page paper sheet, exactly like at the table.
              Every field is saved as you write.
            </p>
          </button>
          <button type="button" className="card card-hover" style={{ textAlign: "left", width: "100%" }} onClick={onApp}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.05rem" }}>
              App way <span className="faint">(not finished)</span>
            </div>
            <p className="faint" style={{ fontSize: "0.84rem", margin: "4px 0 0" }}>
              The guided step-by-step builder — it does the maths for you, but
              it isn't finished yet.
            </p>
          </button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </ModalBackdrop>
  );
}
