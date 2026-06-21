import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sortUpcoming } from "@/data/sessions";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSessionStore } from "../store/sessionStore";
import { useSessionsLive } from "../hooks/useSessionsLive";
import { useHunterCard } from "@/features/hunter/hooks/useHunterCard";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useNow } from "@/hooks/common/useNow";
import { needsCharacter } from "@/config";
import { MapPinIcon, HunterIcon, PlusIcon } from "@/components/icons";
import type { SessionEvent } from "@/types";
import { whenLabel } from "../lib/format";
import { Countdown } from "./Countdown";
import { RsvpControls } from "./RsvpControls";
import { SessionForm } from "./SessionForm";

export function SessionsPage() {
  const now = useNow();
  const user = useAuthStore((s) => s.user);
  const identity = useAuthStore((s) => s.identity);
  const canManage = useAuthStore((s) => s.caps.manageSessions);

  useSessionsLive();
  const { sessions, status } = useSessionStore();
  const upcoming = useMemo(() => sortUpcoming(sessions, now), [sessions, now]);
  const next = upcoming[0];

  useHunterCard();
  const card = usePlayerStore((s) => s.card);
  const cardStatus = usePlayerStore((s) => s.status);
  const showNag =
    needsCharacter(identity) && cardStatus === "loaded" && (!card || !card.classId || !card.name);

  const [editing, setEditing] = useState<SessionEvent | "new" | null>(null);

  return (
    <div className="reading">
      <div className="row between">
        <div>
          <p className="eyebrow">The Hunt</p>
          <h1 className="page-title">Sessions</h1>
        </div>
        {canManage && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing("new")}>
            <PlusIcon width={16} height={16} /> Add
          </button>
        )}
      </div>
      <p className="page-intro">When we next gather around the table.</p>

      {showNag && (
        <Link to="/character" style={{ display: "block", marginBottom: 16 }}>
          <div className="banner banner-warn row" style={{ gap: 8 }}>
            <HunterIcon width={18} height={18} />
            Your hunter card isn't ready yet — forge it before session 1.
          </div>
        </Link>
      )}

      {status === "loading" && (
        <div className="card center"><p className="muted" style={{ margin: 0 }}>Loading the schedule…</p></div>
      )}
      {status === "error" && <div className="banner banner-error">Could not load the schedule.</div>}

      {status === "ready" && !next && (
        <div className="card center">
          <p className="muted" style={{ marginBottom: 0 }}>
            No sessions scheduled yet.{canManage ? " Tap Add to set the first date." : " Check back soon, hunter."}
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
          {next.notes && (<><hr className="divider" /><p className="muted" style={{ marginBottom: 0 }}>{next.notes}</p></>)}
          <hr className="divider" />
          <RsvpControls session={next} />
          {canManage && (
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setEditing(next)}>Edit</button>
              <Link className="btn btn-ghost btn-sm" style={{ flex: 1 }} to="/party">See who's coming</Link>
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
                  {canManage && (
                    <button className="btn btn-ghost btn-sm" style={{ flex: "none" }} onClick={() => setEditing(s)}>Edit</button>
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
