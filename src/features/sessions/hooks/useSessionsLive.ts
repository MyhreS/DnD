import { useEffect } from "react";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useSessionStore } from "../store/sessionStore";

/** Subscribes to the active campaign's schedule. Read via `useSessionStore`. */
export function useSessionsLive(): void {
  const start = useSessionStore((s) => s.start);
  const activeId = useCampaignStore((s) => s.activeId);
  useEffect(() => start(activeId), [start, activeId]);
}
