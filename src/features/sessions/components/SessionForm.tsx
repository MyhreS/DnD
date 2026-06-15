import { useState } from "react";
import { createSession, updateSession, deleteSession } from "@/api/sessions";
import type { SessionEvent } from "@/types";

// Datetime helpers for <input type="datetime-local"> (no seconds/zone).
const toInput = (iso: string) => iso.slice(0, 16);
const fromInput = (v: string) => (v.length === 16 ? `${v}:00` : v);

export function SessionForm({
  session,
  authorEmail,
  onClose,
}: {
  session: SessionEvent | null;
  authorEmail: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(session?.title ?? "");
  const [date, setDate] = useState(session ? toInput(session.date) : "");
  const [location, setLocation] = useState(session?.location ?? "");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && date.length >= 16 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const payload = {
      title: title.trim(),
      date: fromInput(date),
      location: location.trim(),
      notes: notes.trim(),
    };
    try {
      if (session) await updateSession(session.id, payload);
      else await createSession(payload, authorEmail);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save the session.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!session || !confirm("Delete this session?")) return;
    setBusy(true);
    try {
      await deleteSession(session.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not delete the session.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{session ? "Edit session" : "New session"}</h2>
        <div className="field">
          <label htmlFor="s-title">Title</label>
          <input id="s-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session 4" />
        </div>
        <div className="field">
          <label htmlFor="s-date">Date &amp; time</label>
          <input id="s-date" className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="s-loc">Location</label>
          <input id="s-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where?" />
        </div>
        <div className="field">
          <label htmlFor="s-notes">Notes</label>
          <textarea id="s-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="banner banner-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={!canSave}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
        {session && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, color: "var(--blood-bright)" }} onClick={() => void remove()} disabled={busy}>
            Delete session
          </button>
        )}
      </div>
    </div>
  );
}
