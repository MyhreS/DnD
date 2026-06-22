import { useEffect, useState } from "react";
import { subscribeAllCharacters } from "@/api/players";
import { useSessionRsvps } from "@/features/sessions/hooks/useSessionRsvps";
import type { HunterCard } from "@/types";

export interface PartyData {
  players: HunterCard[] | null;
  rsvps: ReturnType<typeof useSessionRsvps>;
  error: string | null;
}

/** Loads every hunter card and live RSVPs for a session. The roster itself comes
 * from the campaign's members (campaignStore). */
export function usePartyData(opts: { sessionId?: string }): PartyData {
  const { sessionId } = opts;
  const [players, setPlayers] = useState<HunterCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rsvps = useSessionRsvps(sessionId);

  useEffect(() => {
    return subscribeAllCharacters(setPlayers, () => setError("Could not load the party."));
  }, []);

  return { players, rsvps, error };
}
