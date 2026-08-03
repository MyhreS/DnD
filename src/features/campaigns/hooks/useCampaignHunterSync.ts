import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useCampaignStore } from "../store/campaignStore";

/** Selects the hunter you brought into the active campaign (membership.characterId)
 * so Play and the campaign Hunter page show the right one. One-way: membership →
 * selection (the picker writes membership, which flows back here). */
export function useCampaignHunterSync(): void {
  const uid = useAuthStore((s) => s.user?.uid);
  const members = useCampaignStore((s) => s.members);
  const characters = usePlayerStore((s) => s.characters);
  const selectedId = usePlayerStore((s) => s.selectedId);
  const select = usePlayerStore((s) => s.select);

  const myCharId = members.find((m) => m.uid === uid)?.characterId ?? null;

  useEffect(() => {
    if (myCharId && myCharId !== selectedId && characters.some((c) => c.id === myCharId)) {
      select(myCharId);
    }
  }, [myCharId, selectedId, characters, select]);
}
