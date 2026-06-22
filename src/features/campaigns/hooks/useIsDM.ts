import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "../store/campaignStore";

/** True when the signed-in user is the DM of the active campaign. Replaces the
 * old global "staff" capability — DM-ship is now per-campaign. */
export function useIsDM(): boolean {
  const uid = useAuthStore((s) => s.user?.uid);
  const dmUid = useCampaignStore((s) => s.active?.dmUid);
  return !!uid && uid === dmUid;
}
