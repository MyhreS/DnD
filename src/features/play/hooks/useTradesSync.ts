import { useEffect } from "react";
import { useTradeStore } from "../store/tradeStore";

/** Subscribe to a campaign's trades while mounted. */
export function useTradesSync(campaignId: string | null) {
  const sync = useTradeStore((s) => s.sync);
  const stop = useTradeStore((s) => s.stop);
  useEffect(() => {
    sync(campaignId);
    return () => stop();
  }, [campaignId, sync, stop]);
}
