import { useNow } from "@/hooks/common/useNow";
import { getClass } from "@/data/classes";
import type { GameParticipant } from "@/types";

const ONLINE_MS = 75_000;

/** Who's in the game, with a presence dot. */
export function ParticipantList({
  participants,
  emptyText = "Nobody here yet.",
}: {
  participants: GameParticipant[];
  emptyText?: string;
}) {
  const now = useNow(15_000).getTime();
  const players = participants.filter((p) => p.role === "player");
  const dm = participants.find((p) => p.role === "dm");

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 10 }}>
        In the game · {players.length} {players.length === 1 ? "hunter" : "hunters"}
      </p>
      {dm && <Row p={dm} now={now} />}
      {players.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: "8px 0 0" }}>{emptyText}</p>
      ) : (
        players.map((p) => <Row key={p.uid} p={p} now={now} />)
      )}
    </div>
  );
}

function Row({ p, now }: { p: GameParticipant; now: number }) {
  const online = now - p.lastSeen < ONLINE_MS;
  const klass = getClass(p.classId);
  const sub = p.role === "dm" ? "Dungeon Master" : klass ? `${klass.name} · Lvl ${p.level}` : "Hunter";
  return (
    <div className="row between" style={{ padding: "8px 0", borderTop: "1px solid var(--border)", gap: 10 }}>
      <div className="row" style={{ gap: 10, minWidth: 0, alignItems: "center" }}>
        <span
          aria-hidden
          title={online ? "Online" : "Away"}
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            flex: "none",
            background: online ? "var(--ok)" : "var(--ink-faint)",
            boxShadow: online ? "0 0 6px var(--ok)" : "none",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.name}
          </div>
          <div className="faint" style={{ fontSize: "0.78rem" }}>{sub}</div>
        </div>
      </div>
      {p.role === "dm" && <span className="role-tag" style={{ flex: "none" }}>DM</span>}
    </div>
  );
}
