import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "../store/campaignStore";

/** Keep the signed-in user's campaigns + active campaign in sync app-wide. */
export function useCampaignSync() {
  const uid = useAuthStore((s) => s.user?.uid);
  const init = useCampaignStore((s) => s.init);
  useEffect(() => {
    if (uid) init(uid);
  }, [uid, init]);
}
