import { useEffect } from "react";
import { useLootStore } from "../store/lootStore";

/** Subscribe to a game's dropped loot while mounted. */
export function useLootSync(gameId: string | null) {
  const sync = useLootStore((s) => s.sync);
  const stop = useLootStore((s) => s.stop);
  useEffect(() => {
    sync(gameId);
    return () => stop();
  }, [gameId, sync, stop]);
}
