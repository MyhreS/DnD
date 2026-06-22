import { useEffect, useState } from "react";
import { subscribeAllCharacters } from "@/api/players";
import { listAllowlist } from "@/api/allowlist";
import { useSessionRsvps } from "@/features/sessions/hooks/useSessionRsvps";
import type { AllowlistMember, HunterCard } from "@/types";

export interface PartyData {
  players: HunterCard[] | null;
  /** Full roster — only loaded for staff (oversight). */
  members: AllowlistMember[] | null;
  rsvps: ReturnType<typeof useSessionRsvps>;
  error: string | null;
}

/** Loads hunters, (for staff) the roster, and live RSVPs for a session. */
export function usePartyData(opts: { oversight: boolean; sessionId?: string }): PartyData {
  const { oversight, sessionId } = opts;
  const [players, setPlayers] = useState<HunterCard[] | null>(null);
  const [members, setMembers] = useState<AllowlistMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rsvps = useSessionRsvps(sessionId);

  // Live party (every hunter card).
  useEffect(() => {
    return subscribeAllCharacters(setPlayers, () => setError("Could not load the party."));
  }, []);

  // Roster (allowlist) — staff only; changes rarely, so a one-time load.
  useEffect(() => {
    let active = true;
    if (oversight) {
      listAllowlist()
        .then((m) => active && setMembers(m))
        .catch(() => active && setMembers([]));
    } else {
      setMembers(null);
    }
    return () => {
      active = false;
    };
  }, [oversight]);

  return { players, members, rsvps, error };
}
