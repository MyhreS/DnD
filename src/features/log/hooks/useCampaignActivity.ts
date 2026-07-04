import { useEffect, useState } from "react";
import { subscribeCampaignActivity } from "@/api/activity";
import { isPreviewActive, previewActivity } from "@/dev/preview";
import type { ActivityEvent } from "@/types";

/** Live campaign log (newest first). `null` while the first snapshot loads. */
export function useCampaignActivity(campaignId: string | null): {
  events: ActivityEvent[] | null;
  error: string | null;
} {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreviewActive()) {
      setEvents(previewActivity());
      return;
    }
    if (!campaignId) {
      setEvents([]);
      return;
    }
    setEvents(null);
    setError(null);
    return subscribeCampaignActivity(
      campaignId,
      (list) => setEvents(list),
      () => setError("Couldn't load the campaign log."),
    );
  }, [campaignId]);

  return { events, error };
}
