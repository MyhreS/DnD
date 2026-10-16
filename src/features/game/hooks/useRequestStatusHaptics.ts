import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";
import type { ShopRequest } from "@/types";

/** Success when the DM approves one of these requests, warning on decline. */
export function useRequestStatusHaptics(requests: ShopRequest[]) {
  const known = useRef(new Map<string, ShopRequest["status"]>());
  useEffect(() => {
    for (const request of requests) {
      const before = known.current.get(request.id);
      if (before === "pending" && request.status === "approved") haptic("success");
      if (before === "pending" && request.status === "declined") haptic("warning");
      known.current.set(request.id, request.status);
    }
  }, [requests]);
}
