import { useEffect, useState, type FormEvent } from "react";
import { addSessionNote, subscribeSessionNotes } from "@/api/sessionNotes";
import { isPreviewActive } from "@/dev/preview";
import type { SessionNote } from "@/types";

const PREVIEW_NOTES: SessionNote[] = [
  { id: "preview-note-1", authorUid: "preview-p1", authorName: "Eileen", body: "The eastern door is sealed with a symbol of the moon.", createdAt: Date.now() - 18 * 60_000 },
];

function noteTime(createdAt: number): string {
  if (!createdAt) return "Just now";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(createdAt));
}

export function SessionNotes({ gameId, userId, userName, writable }: {
  gameId: string;
  userId?: string;
  userName?: string;
  writable: boolean;
}) {
  const preview = isPreviewActive();
  const [notes, setNotes] = useState<SessionNote[]>(preview ? PREVIEW_NOTES : []);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preview) return;
    return subscribeSessionNotes(gameId, setNotes, () => setError("Could not load the session notes."));
  }, [gameId, preview]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = body.trim();
    if (!clean || !userId || sending) return;
    setSending(true);
    setError("");
    try {
      if (preview) {
        setNotes((current) => [{ id: `preview-note-${Date.now()}`, authorUid: userId, authorName: userName || "You", body: clean, createdAt: Date.now() }, ...current]);
      } else {
        await addSessionNote(gameId, userId, userName || "Someone", clean);
      }
      setBody("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your note.");
    } finally {
      setSending(false);
    }
  }

  return <section className="game-notes" aria-labelledby="session-notes-title">
    <header>
      <div><p className="eyebrow">Shared record</p><h3 id="session-notes-title">Session notes</h3></div>
      <span>{notes.length ? `${notes.length} ${notes.length === 1 ? "note" : "notes"}` : "Live for everyone"}</span>
    </header>
    {writable ? <form className="game-notes-compose" onSubmit={submit}>
      <label className="game-sr-only" htmlFor={`session-note-${gameId}`}>Add a session note</label>
      <textarea id={`session-note-${gameId}`} className="input" value={body} maxLength={2000} rows={3} placeholder="Write something the table should remember…" onChange={(event) => setBody(event.target.value)} />
      <div><small>{body.length}/2000</small><button className="btn btn-primary" type="submit" disabled={!body.trim() || sending}>{sending ? "Saving…" : "Add note"}</button></div>
    </form> : <p className="muted">This session is saved. Notes remain here for the table to revisit.</p>}
    {error && <p className="game-notes-error" role="alert">{error}</p>}
    {notes.length ? <div className="game-notes-list" aria-live="polite">{notes.map((note) => <article key={note.id}><div><strong>{note.authorName}</strong><time dateTime={note.createdAt ? new Date(note.createdAt).toISOString() : undefined}>{noteTime(note.createdAt)}</time></div><p>{note.body}</p></article>)}</div> : <p className="game-notes-empty">No notes yet. Add the first detail for the table.</p>}
  </section>;
}
