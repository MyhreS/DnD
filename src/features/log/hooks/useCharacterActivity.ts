import { useEffect, useState } from "react";
import { subscribeCharacterActivity } from "@/api/activity";
import { isPreviewActive, previewActivity } from "@/dev/preview";
import type { ActivityEvent } from "@/types";

/** One hunter's history across campaigns (owner-only; newest first). */
export function useCharacterActivity(
  characterId: string | null,
  ownerUid: string | null,
): { events: ActivityEvent[] | null; error: string | null } {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPreviewActive()) {
      setEvents(previewActivity().filter((e) => e.characterId));
      return;
    }
    if (!characterId || !ownerUid) {
      setEvents([]);
      return;
    }
    setEvents(null);
    setError(null);
    return subscribeCharacterActivity(
      characterId,
      ownerUid,
      (list) => setEvents(list),
      () => setError("Couldn't load this hunter's history."),
    );
  }, [characterId, ownerUid]);

  return { events, error };
}
