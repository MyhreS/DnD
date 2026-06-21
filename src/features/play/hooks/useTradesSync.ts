import { useEffect } from "react";
import { useTradeStore } from "../store/tradeStore";

/** Subscribe to a game's trades while mounted. */
export function useTradesSync(gameId: string | null) {
  const sync = useTradeStore((s) => s.sync);
  const stop = useTradeStore((s) => s.stop);
  useEffect(() => {
    sync(gameId);
    return () => stop();
  }, [gameId, sync, stop]);
}
