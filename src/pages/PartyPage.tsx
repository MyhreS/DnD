import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";
import { loadParty } from "@/lib/players";
import { listAllowlist } from "@/lib/allowlist";
import { subscribeRsvps } from "@/lib/rsvp";
import { sortUpcoming } from "@/data/sessions";
import { HunterCardView } from "@/components/HunterCardView";
import { getClass } from "@/data/classes";
import { ChevronIcon, MailIcon } from "@/components/icons";
import type { AllowlistMember, HunterCard, Rsvp, RsvpStatus } from "@/types";

export function PartyPage() {
  const isStaff = useAuthStore((s) => s.isStaff);
  const { sessions, start } = useSessionStore();
  useEffect(() => start(), [start]);
  const nextSession = useMemo(() => sortUpcoming(sessions)[0], [sessions]);

  const [players, setPlayers] = useState<HunterCard[] | null>(null);
  const [members, setMembers] = useState<AllowlistMember[] | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadParty()
      .then((p) => active && setPlayers(p))
      .catch(() => active && setError("Could not load the party."));
    if (isStaff) {
      listAllowlist()
        .then((m) => active && setMembers(m))
        .catch(() => active && setMembers([]));
    }
    return () => {
      active = false;
    };
  }, [isStaff]);

  useEffect(() => {
    if (!nextSession) return;
    return subscribeRsvps(nextSession.id, setRsvps);
  }, [nextSession]);

  const hunters = (players ?? []).filter((c) => c.classId && c.name);

  return (
    <div>
      <p className="eyebrow">The Hunting Party</p>
      <h1 className="page-title">Party</h1>
      <p className="page-intro">
        {isStaff ? "Who's ready, and who needs a nudge." : "Meet your fellow hunters."}
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      {isStaff && (
        <RosterPanel members={members} players={players} rsvps={rsvps} sessionTitle={nextSession?.title} />
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

function HunterRow({ card }: { card: HunterCard }) {
  const [open, setOpen] = useState(false);
  const klass = getClass(card.classId);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, color: "var(--ink)", padding: 16 }}
      >
        <div className="row between">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{card.name}</div>
            <div className="gold" style={{ fontSize: "0.84rem" }}>
              {klass ? `${klass.name} · Lvl ${card.level}` : "Hunter"}
              <span className="faint"> · {card.ownerName}</span>
            </div>
          </div>
          <ChevronIcon
            width={18}
            height={18}
            style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s ease", color: "var(--gold-dim)", flex: "none" }}
          />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }} className="fade-in">
          <HunterCardView card={card} />
        </div>
      )}
    </div>
  );
}

function RosterPanel({
  members,
  players,
  rsvps,
  sessionTitle,
}: {
  members: AllowlistMember[] | null;
  players: HunterCard[] | null;
  rsvps: Rsvp[];
  sessionTitle?: string;
}) {
  if (members === null || players === null) {
    return <div className="card center"><p className="muted" style={{ margin: 0 }}>Loading roster…</p></div>;
  }

  const cardByEmail = new Map(players.map((p) => [p.ownerEmail.toLowerCase(), p]));
  const rsvpByEmail = new Map(rsvps.map((r) => [r.email.toLowerCase(), r.status]));

  // Players who are expected to bring a character (exclude admin/DM).
  const playerMembers = members.filter((m) => m.role === "player");

  const missingCharacter = playerMembers.filter((m) => {
    const card = cardByEmail.get(m.email);
    return !card || !card.classId || !card.name;
  });
  const notResponded = members.filter((m) => !rsvpByEmail.has(m.email) && m.role !== "admin");

  return (
    <div className="card">
      <p className="eyebrow">DM oversight</p>
      <h3 style={{ marginBottom: 10 }}>Roster {sessionTitle ? `· ${sessionTitle}` : ""}</h3>

      <ul className="list-reset pill-list">
        {members.map((m) => {
          const card = cardByEmail.get(m.email);
          const hasCard = !!card && !!card.classId && !!card.name;
          const status = rsvpByEmail.get(m.email);
          return (
            <li key={m.email}>
              <div className="row between" style={{ gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontWeight: 600, wordBreak: "break-all" }}>
                      {card?.ownerName ?? m.email}
                    </span>
                    {m.role !== "player" && <span className="role-tag">{m.role}</span>}
                  </div>
                  <div className="faint" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{m.email}</div>
                </div>
                <div className="stack-sm" style={{ alignItems: "flex-end", flex: "none" }}>
                  <RsvpBadge status={status} />
                  {m.role === "player" && (
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

      <hr className="divider" />
      <p className="eyebrow" style={{ marginBottom: 8 }}>Send a reminder</p>
      <div className="stack" style={{ gap: 8 }}>
        <ReminderButton
          label={`Nudge ${missingCharacter.length} missing a character`}
          emails={missingCharacter.map((m) => m.email)}
          subject="Catacombs & Starspawns — make your hunter card"
          body={`Hey! Before our next session, please open the app and forge your hunter card.\n\nhttps://dandd-ea955.web.app\n\n— sent from the C&S companion`}
        />
        <ReminderButton
          label={`Nudge ${notResponded.length} who haven't answered`}
          emails={notResponded.map((m) => m.email)}
          subject={`Catacombs & Starspawns — are you coming${sessionTitle ? ` to ${sessionTitle}` : ""}?`}
          body={`Hey! Please open the app and let us know if you can make the next session.\n\nhttps://dandd-ea955.web.app\n\n— sent from the C&S companion`}
        />
      </div>
      <p className="faint" style={{ fontSize: "0.74rem", marginTop: 10, marginBottom: 0 }}>
        Opens your email app with everyone on BCC. Automated reminders are coming later.
      </p>
    </div>
  );
}

function RsvpBadge({ status }: { status?: RsvpStatus }) {
  const map: Record<RsvpStatus | "pending", { cls: string; label: string }> = {
    yes: { cls: "dot-yes", label: "Coming" },
    maybe: { cls: "dot-maybe", label: "Maybe" },
    no: { cls: "dot-no", label: "Can't" },
    pending: { cls: "dot-pending", label: "No answer" },
  };
  const key = status ?? "pending";
  return (
    <span className="row" style={{ gap: 6, fontSize: "0.8rem" }}>
      <span className={`dot ${map[key].cls}`} /> {map[key].label}
    </span>
  );
}

function ReminderButton({
  label,
  emails,
  subject,
  body,
}: {
  label: string;
  emails: string[];
  subject: string;
  body: string;
}) {
  const href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
  if (emails.length === 0) {
    return (
      <div className="btn btn-ghost" style={{ opacity: 0.5, cursor: "default" }}>
        <MailIcon width={16} height={16} /> Everyone's sorted 🎉
      </div>
    );
  }
  return (
    <a className="btn btn-ghost" href={href}>
      <MailIcon width={16} height={16} /> {label}
    </a>
  );
}
