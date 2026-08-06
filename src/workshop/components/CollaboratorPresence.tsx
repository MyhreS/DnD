import { useCurrentTime } from "@/workshop/hooks/useAgentOnline";
import type { WorkshopPresence } from "@/workshop/types";

const ACTIVE_WITHIN_MS = 45_000;

function activePeople(people: WorkshopPresence[], now: number): WorkshopPresence[] {
  return people.filter((person) => {
    const lastSeen = person.lastSeenAt?.toMillis() ?? 0;
    return person.state === "active" && now > 0 && lastSeen > 0 && now - lastSeen < ACTIVE_WITHIN_MS;
  });
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Someone";
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

type CollaboratorPresenceProps = {
  people: WorkshopPresence[];
  currentUid: string;
  currentName: string;
};

export function CollaboratorPresence({ people, currentUid, currentName }: CollaboratorPresenceProps) {
  const now = useCurrentTime();
  const active = activePeople(people, now);
  const others = active.filter((person) => person.uid !== currentUid);
  const label = others.length === 0
    ? "Just you"
    : others.length === 1
      ? `${firstName(others[0].name)} here`
      : `${others.length} others here`;
  const shown = others.length > 0 ? others.slice(0, 2) : [{ uid: currentUid, name: currentName }];

  return (
    <details className="collaborator-presence" data-testid="collaborator-presence">
      <summary aria-label={`${label}. Show who is using the Workshop.`}>
        <span className="presence-avatars" aria-hidden>
          {shown.map((person) => <i key={person.uid}>{initials(person.name)}</i>)}
        </span>
        <strong>{label}</strong>
      </summary>
      <div className="presence-menu">
        <p>Using Workshop now</p>
        <ul>
          {(active.length > 0 ? active : [{ uid: currentUid, name: currentName }]).map((person) => (
            <li key={person.uid}><span aria-hidden />{person.name}{person.uid === currentUid ? " (you)" : ""}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export function ThreadPresence({ people, currentUid, ticketId }: {
  people: WorkshopPresence[];
  currentUid: string;
  ticketId: string;
}) {
  const now = useCurrentTime();
  const others = activePeople(people, now).filter((person) => (
    person.uid !== currentUid && person.viewingTicketId === ticketId
  ));
  if (others.length === 0) return null;
  return (
    <p className="thread-presence" data-testid="thread-presence" role="status">
      <span aria-hidden />
      {others.length === 1 ? `${firstName(others[0].name)} is also viewing` : `${others.length} others are also viewing`}
    </p>
  );
}
