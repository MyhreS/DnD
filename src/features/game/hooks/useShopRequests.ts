import { useEffect, useState } from "react";
import { subscribeShopRequests } from "@/api/shopRequests";
import type { ShopRequest } from "@/types";

/** Live purchase requests for a session's shop (none in preview mode). */
export function useShopRequests(gameId: string, enabled: boolean): ShopRequest[] {
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  useEffect(() => {
    if (!enabled) return;
    return subscribeShopRequests(gameId, setRequests);
  }, [gameId, enabled]);
  return enabled ? requests : [];
}
