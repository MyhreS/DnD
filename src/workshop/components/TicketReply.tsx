import { useRef, useState, type FormEvent } from "react";
import { replyWorkshopTicket, uploadWorkshopImages } from "@/api/workshop";
import { AttachmentPicker } from "@/workshop/components/AttachmentPicker";
import { useOnlineStatus } from "@/workshop/hooks/useOnlineStatus";
import { useSentFeedback } from "@/workshop/hooks/useSentFeedback";
import { useWorkshopDraft, useWorkshopFileDraft } from "@/workshop/hooks/useWorkshopDraft";
import { workshopErrorMessage } from "@/workshop/lib/errors";
import { submitOnEnter } from "@/workshop/lib/submitOnEnter";

export function TicketReply({ ticketId, uid }: { ticketId: string; uid: string }) {
  const draftKey = `reply:${ticketId}`;
  const { body, setBody, hasDraft } = useWorkshopDraft(draftKey);
  const { files, setFiles } = useWorkshopFileDraft(draftKey);
  const [busy, setBusy] = useState(false);
  const { sent, setSent } = useSentFeedback();
  const [error, setError] = useState<string | null>(null);
  const submissionId = useRef<string | null>(null);
  const online = useOnlineStatus();

  function changeFiles(selected: File[]) {
    setFiles(selected);
    setSent(false);
    submissionId.current = null;
  }

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
      await replyWorkshopTicket(ticketId, body, attachments, currentSubmissionId);
      setBody("");
      setFiles([]);
      setSent(true);
      submissionId.current = null;
    } catch (failure) {
      setError(workshopErrorMessage(failure, "Could not send the reply. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="reply-form" onSubmit={(event) => void submit(event)}>
      <label htmlFor="ticket-reply">Add information</label>
      <textarea id="ticket-reply" value={body} onChange={(event) => {
        setBody(event.target.value);
        setSent(false);
        submissionId.current = null;
      }} onKeyDown={submitOnEnter} maxLength={8_000} placeholder="Reply to this thread…" data-testid="ticket-reply" />
      <div className="reply-actions">
        <AttachmentPicker files={files} disabled={busy} compact onChange={changeFiles} onError={setError} />
        <button
          className={`primary-button compact${busy ? " is-sending" : sent ? " is-sent" : ""}`}
          disabled={(!body.trim() && files.length === 0) || busy || sent || !online}
          aria-busy={busy}
          aria-live="polite"
          data-testid="send-reply"
        >
          {busy ? "Sending…" : sent ? "Sent ✓" : "Reply"}
        </button>
      </div>
      {(!online || hasDraft || files.length > 0 || body.length > 6_500) && (
        <div className="reply-meta" aria-live="polite">
          {!online ? <span className="offline-note">Offline · draft saved</span> : (hasDraft || files.length > 0) ? <span>Draft saved</span> : <span />}
          {body.length > 6_500 && <span className={body.length > 7_000 ? "is-near-limit" : ""}>{body.length.toLocaleString("en-GB")}/8,000</span>}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
