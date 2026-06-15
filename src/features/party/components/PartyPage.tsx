import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSessionStore } from "@/features/sessions/store/sessionStore";
import { useSessionsLive } from "@/features/sessions/hooks/useSessionsLive";
import { sortUpcoming } from "@/data/sessions";
import { usePartyData } from "../hooks/usePartyData";
import { HunterRow } from "./HunterRow";
import { RosterPanel } from "./RosterPanel";

export function PartyPage() {
  const oversight = useAuthStore((s) => s.caps.oversight);
  const canEmail = useAuthStore((s) => s.caps.email);

  useSessionsLive();
  const sessions = useSessionStore((s) => s.sessions);
  const nextSession = useMemo(() => sortUpcoming(sessions)[0], [sessions]);

  const { players, members, rsvps, error } = usePartyData({
    oversight,
    sessionId: nextSession?.id,
  });

  const hunters = (players ?? []).filter((c) => c.classId && c.name);

  return (
    <div>
      <p className="eyebrow">The Hunting Party</p>
      <h1 className="page-title">Party</h1>
      <p className="page-intro">
        {oversight ? "Who's ready, and who needs a nudge." : "Meet your fellow hunters."}
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      {oversight && (
        <RosterPanel
          members={members}
          players={players}
          rsvps={rsvps}
          sessionId={nextSession?.id}
          sessionTitle={nextSession?.title}
          canEmail={canEmail}
        />
      )}

      <p className="eyebrow" style={{ margin: "18px 0 10px" }}>The hunters</p>
      {players === null ? (
        <div className="card center"><p className="muted" style={{ margin: 0 }}>Loading…</p></div>
      ) : hunters.length === 0 ? (
        <div className="card center"><p className="muted" style={{ margin: 0 }}>No hunters forged yet.</p></div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {hunters.map((c) => (
            <HunterRow key={c.uid} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
