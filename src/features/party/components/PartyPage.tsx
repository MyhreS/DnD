import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useSessionStore } from "@/features/sessions/store/sessionStore";
import { useSessionsLive } from "@/features/sessions/hooks/useSessionsLive";
import { sortUpcoming } from "@/data/sessions";
import { usePartyData } from "../hooks/usePartyData";
import { HunterRow } from "./HunterRow";
import { RosterPanel } from "./RosterPanel";
import { exportPartyPdf } from "@/features/hunter/lib/characterPdf";
import { CardSkeleton } from "@/components/Skeleton";
import { AsyncButton } from "@/components/AsyncButton";

export function PartyPage() {
  // "Staff" can export everyone's sheets; matches admin + DM (and moderators).
  const canExport = useAuthStore((s) => s.caps.oversight);
  const oversight = canExport;
  const canEmail = useAuthStore((s) => s.caps.email);

  useSessionsLive();
  const activeId = useCampaignStore((s) => s.activeId);
  const memberUids = useCampaignStore((s) => s.active?.memberUids ?? []);
  const allSessions = useSessionStore((s) => s.sessions);
  const sessions = useMemo(() => allSessions.filter((s) => s.campaignId === activeId), [allSessions, activeId]);
  const nextSession = useMemo(() => sortUpcoming(sessions)[0], [sessions]);

  const { players, members, rsvps, error } = usePartyData({
    oversight,
    sessionId: nextSession?.id,
  });

  // Only this campaign's members' hunters.
  const hunters = (players ?? []).filter(
    (c) => c.classId && c.name && memberUids.includes(c.ownerUid),
  );

  return (
    <div>
      <div>
        <div className="row between">
          <div>
            <p className="eyebrow">The Hunting Party</p>
            <h1 className="page-title">Party</h1>
          </div>
          {canExport && hunters.length > 0 && (
            <AsyncButton
              className="btn-ghost btn-sm"
              pendingText="Generating…"
              showDone={false}
              onClick={() => exportPartyPdf(hunters)}
            >
              Export all PDF
            </AsyncButton>
          )}
        </div>
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
          <div className="stack" style={{ gap: 10 }}>
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>
        ) : hunters.length === 0 ? (
          <div className="card center"><p className="muted" style={{ margin: 0 }}>No hunters forged yet.</p></div>
        ) : (
          <div className="card-grid">
            {hunters.map((c) => (
              <HunterRow key={c.id} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
