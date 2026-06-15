import { useEffect, useState } from "react";
import { subscribeRsvps } from "@/api/rsvp";
import type { Rsvp } from "@/types";

/** Live RSVPs for a session (empty while none / no session). */
export function useSessionRsvps(sessionId: string | undefined): Rsvp[] {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  useEffect(() => {
    if (!sessionId) {
      setRsvps([]);
      return;
    }
    return subscribeRsvps(sessionId, setRsvps);
  }, [sessionId]);
  return rsvps;
}
