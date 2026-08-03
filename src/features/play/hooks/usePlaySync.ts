import { useEffect } from "react";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useGameStore } from "../store/gameStore";

/** Keep the active campaign's live-game subscription running, so the "return to
 * game" banner and Play screen always have fresh state. */
export function usePlaySync() {
  const init = useGameStore((s) => s.init);
  const activeId = useCampaignStore((s) => s.activeId);
  useEffect(() => {
    init(activeId);
  }, [init, activeId]);
}
