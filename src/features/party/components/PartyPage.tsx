import { useMemo } from "react";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useIsDM } from "@/features/campaigns/hooks/useIsDM";
import { CampaignInvitePanel } from "@/features/campaigns/components/CampaignInvitePanel";
import { DeleteCampaign } from "@/features/campaigns/components/DeleteCampaign";
import { useSessionStore } from "@/features/sessions/store/sessionStore";
import { useSessionsLive } from "@/features/sessions/hooks/useSessionsLive";
import { sortUpcoming } from "@/data/sessions";
import { usePartyData } from "../hooks/usePartyData";
import { HunterRow } from "./HunterRow";
import { RosterPanel } from "./RosterPanel";
import { DMBuildHunter } from "./DMBuildHunter";
import { exportPartyPdf } from "@/features/hunter/lib/characterPdf";
import { CardSkeleton } from "@/components/Skeleton";
import { AsyncButton } from "@/components/AsyncButton";
import type { HunterCard } from "@/types";

export function PartyPage() {
  // "Staff" can export everyone's sheets; matches admin + DM (and moderators).
  const isDM = useIsDM();
  const canExport = isDM;
  const oversight = isDM;
  const canEmail = isDM;

  useSessionsLive();
  const activeId = useCampaignStore((s) => s.activeId);
  const campaignMembers = useCampaignStore((s) => s.members);
  const allSessions = useSessionStore((s) => s.sessions);
  const sessions = useMemo(() => allSessions.filter((s) => s.campaignId === activeId), [allSessions, activeId]);
  const nextSession = useMemo(() => sortUpcoming(sessions)[0], [sessions]);

  const { players, rsvps, error } = usePartyData({
    sessionId: nextSession?.id,
  });

  // Each campaign member's chosen hunter (or their newest if none picked yet).
  const hunters = useMemo(() => {
    const byId = new Map((players ?? []).map((c) => [c.id, c]));
    const byOwner = new Map<string, HunterCard[]>();
    for (const c of players ?? []) {
      const list = byOwner.get(c.ownerUid) ?? [];
      list.push(c);
      byOwner.set(c.ownerUid, list);
    }
    return campaignMembers
      .map((m) => (m.characterId ? byId.get(m.characterId) : undefined) ?? byOwner.get(m.uid)?.[0])
      .filter((c): c is HunterCard => !!c && !!c.classId && !!c.name);
  }, [players, campaignMembers]);

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

        {isDM && <div style={{ marginBottom: 12 }}><CampaignInvitePanel /></div>}

        {isDM && activeId && <DMBuildHunter members={campaignMembers} campaignId={activeId} />}

        {isDM && <div style={{ margin: "12px 0" }}><DeleteCampaign /></div>}

        {oversight && (
          <RosterPanel
            members={campaignMembers}
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
