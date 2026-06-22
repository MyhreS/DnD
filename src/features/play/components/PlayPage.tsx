import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useIsDM } from "@/features/campaigns/hooks/useIsDM";
import { useHunterCard } from "@/features/hunter/hooks/useHunterCard";
import { useSessionsLive } from "@/features/sessions/hooks/useSessionsLive";
import { CardSkeleton } from "@/components/Skeleton";
import { useGameStore, currentGame } from "../store/gameStore";
import { usePresence } from "../hooks/usePresence";
import { StartGamePanel } from "./StartGamePanel";
import { Lobby } from "./Lobby";
import { InGame } from "./InGame";
import { Recap } from "./Recap";

export function PlayPage() {
  const user = useAuthStore((s) => s.user);
  const canRunGame = useIsDM();

  useHunterCard();
  useSessionsLive();

  const games = useGameStore((s) => s.games);
  const participants = useGameStore((s) => s.participants);
  const status = useGameStore((s) => s.status);
  const activeId = useCampaignStore((s) => s.activeId);
  const game = currentGame(games, activeId);

  // The most recent ended game, for a short post-session recap.
  const lastEnded = games.find((g) => !g.sandbox && g.status === "ended" && g.campaignId === activeId);
  const showRecap =
    !game && !!lastEnded && Date.now() - (lastEnded.endedAt ?? 0) < 8 * 60 * 60 * 1000;

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
        <div className="stack" style={{ gap: 14 }}>
          {showRecap && lastEnded && <Recap game={lastEnded} />}
          {canRunGame ? (
            <StartGamePanel />
          ) : (
            <div className="card center">
              <p className="muted" style={{ margin: 0 }}>
                No game is running yet. When your DM starts a session, it'll appear here.
              </p>
            </div>
          )}
        </div>
      ) : game.status === "lobby" ? (
        <Lobby game={game} participants={participants} />
      ) : (
        <InGame game={game} participants={participants} />
      )}
    </div>
  );
}
