import { useRef, useState, type FormEvent } from "react";
import { replyWorkshopTicket, uploadWorkshopImages } from "@/api/workshop";

export function TicketReply({ ticketId, uid }: { ticketId: string; uid: string }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const attachments = await uploadWorkshopImages(uid, files);
      await replyWorkshopTicket(ticketId, body, attachments);
      setBody("");
      setFiles([]);
      if (picker.current) picker.current.value = "";
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not send the reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="reply-form" onSubmit={(event) => void submit(event)}>
      <label htmlFor="ticket-reply">Add information</label>
      <textarea id="ticket-reply" value={body} onChange={(event) => setBody(event.target.value)} maxLength={8_000} placeholder="Reply to this thread…" data-testid="ticket-reply" />
      <div className="reply-actions">
        <label className="attach-button compact"><input ref={picker} type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} />＋ Image{files.length ? ` (${files.length})` : ""}</label>
        <button className="primary-button compact" disabled={!body.trim() || busy} data-testid="send-reply">{busy ? "Sending…" : "Reply"}</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
