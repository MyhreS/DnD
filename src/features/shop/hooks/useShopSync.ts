import { useEffect } from "react";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useShopStore } from "../store/shopStore";

/** Subscribe the shop store to the active campaign while mounted. */
export function useShopSync(): void {
  const campaignId = useCampaignStore((s) => s.activeId);
  const sync = useShopStore((s) => s.sync);
  const stop = useShopStore((s) => s.stop);
  useEffect(() => {
    sync(campaignId);
    return () => stop();
  }, [campaignId, sync, stop]);
}
