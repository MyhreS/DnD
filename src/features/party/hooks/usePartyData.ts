import { useEffect, useState } from "react";
import { subscribeAllCharacters } from "@/api/players";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
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
  const activeId = useCampaignStore((s) => s.activeId);
  const rsvps = useSessionRsvps(sessionId);

  useEffect(() => {
    // Scope to the active campaign — the gallery only shows this campaign's
    // members' hunters anyway, so streaming every hunter in the app is waste.
    return subscribeAllCharacters(
      setPlayers,
      () => setError("Could not load the party."),
      activeId,
    );
  }, [activeId]);

  return { players, rsvps, error };
}
