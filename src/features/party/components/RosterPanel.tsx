import { displayName } from "@/config";
import { remindMissingCharacters, remindMissingRsvps } from "@/api/notifications";
import { EmailButton } from "./EmailButton";
import type { AllowlistMember, HunterCard, Rsvp, RsvpStatus } from "@/types";

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
  members: AllowlistMember[] | null;
  players: HunterCard[] | null;
  rsvps: Rsvp[];
  sessionId?: string;
  sessionTitle?: string;
  canEmail: boolean;
}) {
  if (members === null || players === null) {
    return <div className="card center"><p className="muted" style={{ margin: 0 }}>Loading roster…</p></div>;
  }

  const cardByEmail = new Map(players.map((p) => [p.ownerEmail.toLowerCase(), p]));
  const rsvpByEmail = new Map(rsvps.map((r) => [r.email.toLowerCase(), r.status]));

  const playerMembers = members.filter((m) => m.playerType === "player");
  const missingCharacter = playerMembers.filter((m) => {
    const card = cardByEmail.get(m.email);
    return !card || !card.classId || !card.name;
  });
  const notResponded = members.filter((m) => !rsvpByEmail.has(m.email));

  return (
    <div className="card">
      <p className="eyebrow">Party oversight</p>
      <h3 style={{ marginBottom: 10 }}>Roster {sessionTitle ? `· ${sessionTitle}` : ""}</h3>

      <ul className="list-reset pill-list">
        {members.map((m) => {
          const card = cardByEmail.get(m.email);
          const hasCard = !!card && !!card.classId && !!card.name;
          return (
            <li key={m.email}>
              <div className="row between" style={{ gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{displayName(m, members)}</span>
                    {m.playerType === "dm" && <span className="role-tag">DM</span>}
                    {m.accessRole !== "user" && <span className="role-tag">{m.accessRole}</span>}
                  </div>
                  <div className="faint" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{m.email}</div>
                </div>
                <div className="stack-sm" style={{ alignItems: "flex-end", flex: "none" }}>
                  <RsvpBadge status={rsvpByEmail.get(m.email)} />
                  {m.playerType === "player" && (
                    <span className="faint" style={{ fontSize: "0.74rem" }}>
                      {hasCard ? "✓ character" : "✗ no character"}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {canEmail && (
        <>
          <hr className="divider" />
          <p className="eyebrow" style={{ marginBottom: 8 }}>Send reminder emails</p>
          <div className="stack" style={{ gap: 8 }}>
            <EmailButton
              label={`Email ${missingCharacter.length} missing a character`}
              disabled={missingCharacter.length === 0}
              run={remindMissingCharacters}
            />
            <EmailButton
              label={`Email ${notResponded.length} who haven't answered`}
              disabled={notResponded.length === 0 || !sessionId}
              run={() => remindMissingRsvps(sessionId!)}
            />
          </div>
          <p className="faint" style={{ fontSize: "0.74rem", marginTop: 10, marginBottom: 0 }}>
            Sends from the campaign mailbox via the app's backend.
          </p>
        </>
      )}
    </div>
  );
}
