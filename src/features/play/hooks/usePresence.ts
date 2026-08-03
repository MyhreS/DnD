import { useEffect } from "react";
import { pingPresence } from "@/api/games";
import { isPreviewActive } from "@/dev/preview";

/** While you're on the Play screen and in a game, heartbeat your presence so the
 * DM/lobby can show who's actually here. No-op in preview (no real backend). */
export function usePresence(gameId: string | null, uid: string | null) {
  useEffect(() => {
    if (!gameId || !uid || isPreviewActive()) return;
    void pingPresence(gameId, uid);
    const t = setInterval(() => void pingPresence(gameId, uid), 30_000);
    return () => clearInterval(t);
  }, [gameId, uid]);
}
