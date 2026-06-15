import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import { sortUpcoming } from "@/data/sessions";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { createSession, updateSession, deleteSession } from "@/lib/sessions";
import { subscribeRsvps, setRsvp } from "@/lib/rsvp";
import { MapPinIcon, HunterIcon, PlusIcon } from "@/components/icons";
import type { Rsvp, RsvpStatus, SessionEvent } from "@/types";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function whenLabel(date: Date): string {
  if (isToday(date)) return `Tonight · ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow · ${format(date, "HH:mm")}`;
  return format(date, "EEEE d MMMM yyyy · HH:mm");
}

function Countdown({ target, now }: { target: Date; now: Date }) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(ms / 1000);
  const units = [
    { num: Math.floor(totalSec / 86400), lbl: "Days" },
    { num: Math.floor((totalSec % 86400) / 3600), lbl: "Hours" },
    { num: Math.floor((totalSec % 3600) / 60), lbl: "Min" },
    { num: totalSec % 60, lbl: "Sec" },
  ];
  return (
    <div className="countdown">
      {units.map((u) => (
        <div className="unit" key={u.lbl}>
          <div className="num">{String(u.num).padStart(2, "0")}</div>
          <div className="lbl">{u.lbl}</div>
        </div>
      ))}
    </div>
  );
}

function RsvpControls({ session }: { session: SessionEvent }) {
  const user = useAuthStore((s) => s.user);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);

  useEffect(() => subscribeRsvps(session.id, setRsvps), [session.id]);

  const mine = rsvps.find((r) => r.uid === user?.uid)?.status ?? null;
  const counts = {
    yes: rsvps.filter((r) => r.status === "yes").length,
    maybe: rsvps.filter((r) => r.status === "maybe").length,
    no: rsvps.filter((r) => r.status === "no").length,
  };

  async function choose(status: RsvpStatus) {
    if (!user) return;
    await setRsvp(session.id, {
      uid: user.uid,
      name: user.displayName ?? user.email ?? "Hunter",
      email: user.email ?? "",
      status,
    });
  }

  const options: { value: RsvpStatus; label: string }[] = [
    { value: "yes", label: "I'm in" },
    { value: "maybe", label: "Maybe" },
    { value: "no", label: "Can't" },
  ];

  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Will you answer the call?</p>
      <div className="btn-row">
        {options.map((o) => (
          <button
            key={o.value}
            className={`btn btn-sm ${mine === o.value ? "btn-primary" : "btn-ghost"}`}
            style={{ flex: 1 }}
            onClick={() => void choose(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="faint center" style={{ fontSize: "0.78rem", marginTop: 8, marginBottom: 0 }}>
        {counts.yes} in · {counts.maybe} maybe · {counts.no} out
      </p>
    </div>
  );
}

export function SessionsPage() {
  const now = useNow();
  const isStaff = useAuthStore((s) => s.isStaff);
  const user = useAuthStore((s) => s.user);

  const { sessions, status, start } = useSessionStore();
  useEffect(() => start(), [start]);

  const upcoming = useMemo(() => sortUpcoming(sessions, now), [sessions, now]);
  const next = upcoming[0];

  // Card-completion nag (players only).
  const card = usePlayerStore((s) => s.card);
  const cardStatus = usePlayerStore((s) => s.status);
  const loadCard = usePlayerStore((s) => s.load);
  useEffect(() => {
    if (!isStaff && user && cardStatus === "idle") void loadCard(user.uid);
  }, [isStaff, user, cardStatus, loadCard]);
  const needsCard = !isStaff && cardStatus === "loaded" && (!card || !card.classId || !card.name);

  const [editing, setEditing] = useState<SessionEvent | "new" | null>(null);

  return (
    <div>
      <div className="row between">
        <div>
          <p className="eyebrow">The Hunt</p>
          <h1 className="page-title">Sessions</h1>
        </div>
        {isStaff && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing("new")}>
            <PlusIcon width={16} height={16} /> Add
          </button>
        )}
      </div>
      <p className="page-intro">When we next gather around the table.</p>

      {needsCard && (
        <Link to="/hunter" style={{ display: "block", marginBottom: 16 }}>
          <div className="banner banner-warn row" style={{ gap: 8 }}>
            <HunterIcon width={18} height={18} />
            Your hunter card isn't ready yet — forge it before session 1.
          </div>
        </Link>
      )}

      {status === "loading" && <div className="card center"><p className="muted" style={{ margin: 0 }}>Loading the schedule…</p></div>}
      {status === "error" && <div className="banner banner-error">Could not load the schedule.</div>}

      {status === "ready" && !next && (
        <div className="card center">
          <p className="muted" style={{ marginBottom: 0 }}>
            No sessions scheduled yet.{isStaff ? " Tap Add to set the first date." : " Check back soon, hunter."}
          </p>
        </div>
      )}

      {next && (
        <div className="card">
          <p className="eyebrow">Next session</p>
          <h2 style={{ marginBottom: 2 }}>{next.title}</h2>
          <p className="muted" style={{ marginBottom: 14 }}>{whenLabel(new Date(next.date))}</p>
          <Countdown target={new Date(next.date)} now={now} />
          {next.location && (
            <div className="row faint" style={{ fontSize: "0.9rem", marginTop: 14 }}>
              <MapPinIcon width={16} height={16} /> {next.location}
            </div>
          )}
          {next.notes && (
            <>
              <hr className="divider" />
              <p className="muted" style={{ marginBottom: 0 }}>{next.notes}</p>
            </>
          )}
          <hr className="divider" />
          <RsvpControls session={next} />
          {isStaff && (
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditing(next)}>
                Edit
              </button>
              <Link className="btn btn-ghost btn-sm" style={{ flex: 1 }} to="/party">
                See who's coming
              </Link>
            </div>
          )}
        </div>
      )}

      {upcoming.length > 1 && (
        <>
          <div className="rule-ornament">◆</div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Later sessions</p>
          <div className="stack" style={{ gap: 10 }}>
            {upcoming.slice(1).map((s) => (
              <div className="card" key={s.id}>
                <div className="row between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                    <div className="muted" style={{ fontSize: "0.9rem" }}>{whenLabel(new Date(s.date))}</div>
                    {s.location && (
                      <div className="row faint" style={{ fontSize: "0.84rem", marginTop: 2 }}>
                        <MapPinIcon width={14} height={14} /> {s.location}
                      </div>
                    )}
                  </div>
                  {isStaff && (
                    <button className="btn btn-ghost btn-sm" style={{ flex: "none" }} onClick={() => setEditing(s)}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && user && (
        <SessionForm
          session={editing === "new" ? null : editing}
          authorEmail={user.email ?? ""}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// Datetime helpers for the <input type="datetime-local"> (no seconds/zone).
function toInputValue(iso: string): string {
  return iso.slice(0, 16);
}
function fromInputValue(v: string): string {
  return v.length === 16 ? `${v}:00` : v;
}

function SessionForm({
  session,
  authorEmail,
  onClose,
}: {
  session: SessionEvent | null;
  authorEmail: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(session?.title ?? "");
  const [date, setDate] = useState(session ? toInputValue(session.date) : "");
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
      date: fromInputValue(date),
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
    if (!session) return;
    if (!confirm("Delete this session?")) return;
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
