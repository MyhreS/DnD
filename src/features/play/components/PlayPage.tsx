import { useAuthStore } from "@/features/auth/store/authStore";
import { useHunterCard } from "@/features/hunter/hooks/useHunterCard";
import { useSessionsLive } from "@/features/sessions/hooks/useSessionsLive";
import { CardSkeleton } from "@/components/Skeleton";
import { useGameStore, currentGame } from "../store/gameStore";
import { usePresence } from "../hooks/usePresence";
import { StartGamePanel } from "./StartGamePanel";
import { Lobby } from "./Lobby";
import { InGame } from "./InGame";

export function PlayPage() {
  const user = useAuthStore((s) => s.user);
  const canRunGame = useAuthStore((s) => s.caps.runGame);

  useHunterCard();
  useSessionsLive();

  const games = useGameStore((s) => s.games);
  const participants = useGameStore((s) => s.participants);
  const status = useGameStore((s) => s.status);
  const game = currentGame(games);

  usePresence(game?.id ?? null, user?.uid ?? null);

  return (
    <div className="reading">
      <p className="eyebrow">At the Table</p>
      <h1 className="page-title">Play</h1>

      {status === "loading" || status === "idle" ? (
        <CardSkeleton lines={3} />
      ) : status === "error" ? (
        <div className="card center">
          <p className="muted" style={{ margin: 0 }}>Couldn't reach the game. Check your connection and try again.</p>
        </div>
      ) : !game ? (
        canRunGame ? (
          <StartGamePanel />
        ) : (
          <div className="card center">
            <p className="muted" style={{ margin: 0 }}>
              No game is running yet. When your DM starts a session, it'll appear here.
            </p>
          </div>
        )
      ) : game.status === "lobby" ? (
        <Lobby game={game} participants={participants} />
      ) : (
        <InGame game={game} participants={participants} />
      )}
    </div>
  );
}
