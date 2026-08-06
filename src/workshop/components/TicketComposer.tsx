import { useRef, useState, type FormEvent } from "react";
import { createWorkshopTicket, uploadWorkshopImages } from "@/api/workshop";
import { submitOnEnter } from "@/workshop/lib/submitOnEnter";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function TicketComposer({ uid, onCreated }: { uid: string; onCreated: (id: string) => void }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  function chooseImages(next: FileList | null) {
    const selected = Array.from(next ?? []);
    if (selected.length > MAX_IMAGES || selected.some((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES)) {
      setError("Choose up to five images, no larger than 10 MB each.");
      return;
    }
    setFiles(selected);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const attachments = await uploadWorkshopImages(uid, files);
      const ticketId = await createWorkshopTicket(body, attachments);
      setBody("");
      setFiles([]);
      if (picker.current) picker.current.value = "";
      onCreated(ticketId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not send this request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="composer" aria-labelledby="new-request-title">
      <p className="eyebrow">New request</p>
      <h1 id="new-request-title">What should we improve?</h1>
      <p className="composer-help">Describe the change in your own words. Add screenshots when something is easier to show.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label className="sr-only" htmlFor="ticket-body">Workshop request</label>
        <textarea
          id="ticket-body"
          data-testid="ticket-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={submitOnEnter}
          maxLength={8_000}
          placeholder="Write feedback or a new idea…"
        />
        <div className="composer-actions">
          <label className="attach-button">
            <input ref={picker} type="file" accept="image/*" multiple onChange={(event) => chooseImages(event.target.files)} />
            <span aria-hidden>＋</span> Add images
          </label>
          <button className="primary-button" type="submit" disabled={!body.trim() || busy} data-testid="send-ticket">
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
        {files.length > 0 && <p className="file-summary">{files.length} image{files.length === 1 ? "" : "s"} ready</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
