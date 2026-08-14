import { useState, type FormEvent } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCharacterSessions } from "@/features/hunter/hooks/useCharacterSessions";
import { useView4SessionNotes } from "@/features/hunter/hooks/useView4SessionNotes";
import type { Game, HunterCard } from "@/types";

function sessionDate(game: Game): string {
  const timestamp = game.endedAt ?? game.startedAt ?? game.createdAt;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(timestamp));
}

function noteTime(createdAt: number): string {
  if (!createdAt) return "Just now";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(createdAt));
}

export function View4SessionNotes({ card, readOnly }: { card: HunterCard; readOnly: boolean }) {
  const user = useAuthStore((state) => state.user);
  const member = useAuthStore((state) => state.member);
  const { sessions, error: sessionsError } = useCharacterSessions(card);
  const [chosenId, setChosenId] = useState("");
  const selected = sessions.find((session) => session.id === chosenId) ?? sessions[0] ?? null;
  const { notes, body, setBody, sending, error, submit } = useView4SessionNotes(selected?.id ?? null);
  const authorName = member?.firstName || user?.displayName || card.ownerName || "Someone";
  const writable = Boolean(selected && selected.status !== "ended" && !readOnly && user?.uid);

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (user?.uid) void submit(user.uid, authorName);
  }

  if (!sessions.length) return <section className="v4-session-empty">
    <h3>No sessions yet</h3>
    <p>Session notes will appear here once this hunter joins a session.</p>
    {sessionsError && <small role="alert">{sessionsError}</small>}
  </section>;

  return <div className="v4-session-notes">
    <label className="v4-session-picker">
      <span>Session</span>
      <select value={selected?.id ?? ""} onChange={(event) => setChosenId(event.target.value)}>
        {sessions.map((session) => <option key={session.id} value={session.id}>{session.title} · {sessionDate(session)}</option>)}
      </select>
      {selected && <small>{selected.status === "ended" ? "Finished session · notes are read-only" : "Current session · shared with the table"}</small>}
    </label>

    {writable && <form className="v4-session-compose" onSubmit={addNote}>
      <label htmlFor={`v4-session-note-${selected?.id}`}>Add to this session</label>
      <textarea id={`v4-session-note-${selected?.id}`} value={body} maxLength={2000} rows={3} placeholder="What should the table remember?" onChange={(event) => setBody(event.target.value)} />
      <footer><span>{body.length}/2000</span><button type="submit" disabled={!body.trim() || sending}>{sending ? "Saving…" : "Add note"}</button></footer>
    </form>}

    {(sessionsError || error) && <p className="v4-session-error" role="alert">{sessionsError || error}</p>}
    <section className="v4-session-history" aria-label="Notes from selected session" aria-live="polite">
      <header><span>Session record</span><small>{notes.length} {notes.length === 1 ? "note" : "notes"}</small></header>
      {notes.length ? notes.map((note) => <article key={note.id}>
        <header><strong>{note.authorName}</strong><time dateTime={note.createdAt ? new Date(note.createdAt).toISOString() : undefined}>{noteTime(note.createdAt)}</time></header>
        <p>{note.body}</p>
      </article>) : <p>No notes have been added to this session yet.</p>}
    </section>
  </div>;
}
