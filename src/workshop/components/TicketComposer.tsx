import { useRef, useState, type FormEvent } from "react";
import { createWorkshopTicket, uploadWorkshopImages } from "@/api/workshop";
import { AttachmentPicker } from "@/workshop/components/AttachmentPicker";
import { WorkshopTip } from "@/workshop/components/WorkshopTip";
import { useOnlineStatus } from "@/workshop/hooks/useOnlineStatus";
import { useSentFeedback } from "@/workshop/hooks/useSentFeedback";
import { useWorkshopImagePaste } from "@/workshop/hooks/useWorkshopImagePaste";
import { useWorkshopDraft, useWorkshopFileDraft } from "@/workshop/hooks/useWorkshopDraft";
import { workshopErrorMessage } from "@/workshop/lib/errors";
import { submitOnEnter } from "@/workshop/lib/submitOnEnter";

export function TicketComposer({ uid, onCreated }: { uid: string; onCreated: (id: string) => void }) {
  const { body, setBody, hasDraft } = useWorkshopDraft("new-request");
  const { files, setFiles } = useWorkshopFileDraft("new-request");
  const [busy, setBusy] = useState(false);
  const { sent, setSent } = useSentFeedback();
  const [error, setError] = useState<string | null>(null);
  const submissionId = useRef<string | null>(null);
  const online = useOnlineStatus();

  function changeFiles(selected: File[]) {
    setSent(false);
    submissionId.current = null;
    setFiles(selected);
  }
  const pasteImages = useWorkshopImagePaste({ files, disabled: busy, onChange: changeFiles, onError: setError });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!body.trim() && files.length === 0) || busy || !online) return;
    setBusy(true);
    setSent(false);
    setError(null);
    const currentSubmissionId = submissionId.current ?? crypto.randomUUID();
    submissionId.current = currentSubmissionId;
    try {
      const attachments = await uploadWorkshopImages(uid, files);
      const ticketId = await createWorkshopTicket(body, attachments, currentSubmissionId);
      setBody("");
      setFiles([]);
      setSent(true);
      submissionId.current = null;
      onCreated(ticketId);
    } catch (failure) {
      setError(workshopErrorMessage(failure, "Could not send this request. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="composer" aria-labelledby="new-request-title">
      <p className="eyebrow">New request</p>
      <h1 id="new-request-title">What should we improve?</h1>
      <p className="composer-help">Describe the change in your own words. Add screenshots when something is easier to show.</p>
      <WorkshopTip />
      <form onSubmit={(event) => void submit(event)}>
        <label className="sr-only" htmlFor="ticket-body">Workshop request</label>
        <textarea
          id="ticket-body"
          data-testid="ticket-body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setSent(false);
            submissionId.current = null;
          }}
          onKeyDown={submitOnEnter}
          onPaste={pasteImages}
          maxLength={8_000}
          placeholder="Write feedback or a new idea…"
        />
        <div className="composer-actions">
          <AttachmentPicker files={files} disabled={busy} onChange={changeFiles} onError={setError} />
          <button
            className={`primary-button${busy ? " is-sending" : sent ? " is-sent" : ""}`}
            type="submit"
            disabled={(!body.trim() && files.length === 0) || busy || sent || !online}
            aria-busy={busy}
            aria-live="polite"
            data-testid="send-ticket"
          >
            {busy ? "Sending…" : sent ? "Sent ✓" : "Send request"}
          </button>
        </div>
        {(!online || hasDraft || files.length > 0 || body.length > 6_500) && (
          <div className="composer-meta" aria-live="polite">
            {!online ? <span className="offline-note">Offline · your draft is saved</span> : (hasDraft || files.length > 0) ? <span>Draft saved</span> : <span />}
            {body.length > 6_500 && <span className={body.length > 7_000 ? "is-near-limit" : ""}>{body.length.toLocaleString("en-GB")}/8,000</span>}
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
