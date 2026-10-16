import { useCallback, useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";

function key(gameId: string) {
  return `shop-seen:${gameId}`;
}

function read(gameId: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(key(gameId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

/** Which shop lines this player has not seen yet, so items the DM just added
 * can be marked "New". The first visit counts everything as seen. */
export function useSeenShopLines(gameId: string, lineIds: string[]) {
  const [seen, setSeen] = useState<Set<string>>(() => read(gameId) ?? new Set(lineIds));
  const fresh = lineIds.filter((id) => !seen.has(id));
  const freshKey = fresh.join(",");

  useEffect(() => {
    if (read(gameId) == null) {
      try { window.localStorage.setItem(key(gameId), JSON.stringify(lineIds)); } catch { /* storage may be unavailable */ }
    }
  }, [gameId, lineIds]);

  useEffect(() => {
    if (freshKey) haptic("selection");
  }, [freshKey]);

  const markSeen = useCallback(() => {
    const next = new Set([...seen, ...lineIds]);
    setSeen(next);
    try { window.localStorage.setItem(key(gameId), JSON.stringify([...next])); } catch { /* storage may be unavailable */ }
  }, [gameId, lineIds, seen]);

  return { fresh: new Set(fresh), markSeen };
}
