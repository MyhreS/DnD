import { remindMissingCharacters, remindMissingRsvps } from "@/api/notifications";
import { EmailButton } from "./EmailButton";
import type { CampaignMember, HunterCard, Rsvp, RsvpStatus } from "@/types";

function RsvpBadge({ status }: { status?: RsvpStatus }) {
  const map: Record<RsvpStatus | "pending", { cls: string; label: string }> = {
    yes: { cls: "dot-yes", label: "Coming" },
    maybe: { cls: "dot-maybe", label: "Maybe" },
    no: { cls: "dot-no", label: "Can't" },
    pending: { cls: "dot-pending", label: "No answer" },
  };
  const { cls, label } = map[status ?? "pending"];
  return (
    <span className="row" style={{ gap: 6, fontSize: "0.8rem" }}>
      <span className={`dot ${cls}`} /> {label}
    </span>
  );
}

export function RosterPanel({
  members,
  players,
  rsvps,
  sessionId,
  sessionTitle,
  canEmail,
}: {
  members: CampaignMember[];
  players: HunterCard[] | null;
  rsvps: Rsvp[];
  sessionId?: string;
  sessionTitle?: string;
  canEmail: boolean;
}) {
  if (players === null) {
    return <div className="card center"><p className="muted" style={{ margin: 0 }}>Loading roster…</p></div>;
  }

  const byId = new Map(players.map((p) => [p.id, p]));
  const byOwner = new Map<string, HunterCard[]>();
  for (const c of players) {
    const list = byOwner.get(c.ownerUid) ?? [];
    list.push(c);
    byOwner.set(c.ownerUid, list);
  }
  const cardFor = (m: CampaignMember) =>
    (m.characterId ? byId.get(m.characterId) : undefined) ?? byOwner.get(m.uid)?.[0];
  const rsvpByEmail = new Map(rsvps.map((r) => [r.email.toLowerCase(), r.status]));

  const playerMembers = members.filter((m) => m.role !== "dm");
  const missingCharacter = playerMembers.filter((m) => {
    const card = cardFor(m);
    return !card || !card.classId || !card.name;
  });
  const notResponded = members.filter((m) => !rsvpByEmail.has(m.email.toLowerCase()));

  return (
    <div className="card">
      <p className="eyebrow">Party oversight</p>
      <h3 style={{ marginBottom: 10 }}>Roster {sessionTitle ? `· ${sessionTitle}` : ""}</h3>

      {members.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>Just you so far — invite players below.</p>
      ) : (
        <ul className="list-reset pill-list">
          {members.map((m) => {
            const card = cardFor(m);
            const hasCard = !!card && !!card.classId && !!card.name;
            return (
              <li key={m.uid}>
                <div className="row between" style={{ gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>{m.name}</span>
                      {m.role === "dm" && <span className="role-tag">DM</span>}
                    </div>
                    <div className="faint" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{m.email}</div>
                  </div>
                  <div className="stack-sm" style={{ alignItems: "flex-end", flex: "none" }}>
                    <RsvpBadge status={rsvpByEmail.get(m.email.toLowerCase())} />
                    {m.role !== "dm" && (
                      <span className="faint" style={{ fontSize: "0.74rem" }}>
                        {hasCard ? `✓ ${card!.name}` : "✗ no hunter"}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEmail && members.length > 0 && (
        <>
          <hr className="divider" />
          <p className="eyebrow" style={{ marginBottom: 8 }}>Send reminder emails</p>
          <div className="stack" style={{ gap: 8 }}>
            <EmailButton
              label={`Email ${missingCharacter.length} missing a hunter`}
              disabled={missingCharacter.length === 0}
              run={remindMissingCharacters}
            />
            <EmailButton
              label={`Email ${notResponded.length} who haven't answered`}
              disabled={notResponded.length === 0 || !sessionId}
              run={() => remindMissingRsvps(sessionId!)}
            />
          </div>
        </>
      )}
    </div>
  );
}
