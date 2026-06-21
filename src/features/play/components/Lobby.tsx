import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { AsyncButton } from "@/components/AsyncButton";
import { useGameStore } from "../store/gameStore";
import { ParticipantList } from "./ParticipantList";
import type { Game, GameParticipant } from "@/types";

export function Lobby({ game, participants }: { game: Game; participants: GameParticipant[] }) {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const card = usePlayerStore((s) => s.card);
  const navigate = useNavigate();

  const begin = useGameStore((s) => s.begin);
  const join = useGameStore((s) => s.join);
  const leave = useGameStore((s) => s.leave);
  const error = useGameStore((s) => s.error);

  const uid = user?.uid ?? "";
  const isDM = uid === game.dmUid;
  const joined = participants.some((p) => p.uid === uid);
  const hasCard = !!card && !!card.classId && !!card.name;

  async function joinAsPlayer() {
    if (!user || !card) return;
    await join(game.id, {
      uid: user.uid,
      name: card.name || member?.firstName || "Hunter",
      classId: card.classId,
      subclassId: card.subclassId ?? null,
      level: card.level,
      role: "player",
    });
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card">
        <p className="eyebrow">Lobby · waiting to begin</p>
        <h1 style={{ marginBottom: 2 }}>{game.title}</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          {game.dmName} is gathering the hunters{game.sessionId ? " for this session" : ""}.
        </p>
      </div>

      <ParticipantList participants={participants} emptyText="Waiting for hunters to join…" />

      {error && <div className="banner banner-error">{error}</div>}

      {isDM ? (
        <div className="card">
          <p className="faint" style={{ fontSize: "0.86rem", marginTop: 0 }}>
            Begin when everyone's in. You can change phases and stop the game at any time.
          </p>
          <AsyncButton
            className="btn btn-primary"
            pendingText="Beginning…"
            showDone={false}
            onClick={() => begin(game.id)}
          >
            Begin game
          </AsyncButton>
        </div>
      ) : !hasCard ? (
        <div className="card">
          <p className="muted" style={{ marginTop: 0 }}>
            You need a hunter to join the hunt. Create one, then come back — the game will still be here.
          </p>
          <Link className="btn btn-primary" to="/character">Create your hunter</Link>
        </div>
      ) : joined ? (
        <div className="card center">
          <p className="muted" style={{ margin: 0 }}>You're in. Waiting for {game.dmName} to begin…</p>
        </div>
      ) : (
        <AsyncButton
          className="btn btn-primary"
          pendingText="Joining…"
          showDone={false}
          onClick={joinAsPlayer}
        >
          Join the lobby
        </AsyncButton>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
          Exit to menu
        </button>
        {!isDM && joined && (
          <AsyncButton
            className="btn btn-ghost"
            style={{ color: "var(--blood-bright)" }}
            pendingText="Leaving…"
            showDone={false}
            onClick={() => leave(game.id, uid)}
          >
            Leave game
          </AsyncButton>
        )}
      </div>
    </div>
  );
}
