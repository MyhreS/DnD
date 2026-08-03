import { useEffect, useMemo, useState } from "react";
import { subscribeDmPicks, saveDmPicks } from "@/api/users";
import { useAuthStore } from "@/features/auth/store/authStore";
import { isPreviewActive } from "@/dev/preview";
import type { HunterCard } from "@/types";

// Pre-Firestore, picks lived per-device under this localStorage key. It is
// read exactly once (to migrate a device's picks into the user doc) and then
// removed — Firestore is the sole source of truth from here on.
const LEGACY_KEY = "cs-dm-picks";

function readLegacyPicks(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** The DM's personal board: character ids persisted on the signed-in user's
 * `/users/{uid}` doc (`dmPicks`), live-synced across devices and resolved
 * against the live character list. Picks whose character doc no longer exists
 * are never rendered, and once both lists have loaded they're pruned from the
 * doc too. `picked` is null while either list is still loading. Add/remove
 * update local state instantly and write through to Firestore. */
export function useDmPicks(characters: HunterCard[] | null): {
  pickIds: string[];
  picked: HunterCard[] | null;
  addPick: (id: string) => void;
  removePick: (id: string) => void;
} {
  const uid = useAuthStore((s) => s.user?.uid);
  // null = not loaded yet (so a slow subscription can't wipe a valid board).
  const [pickIds, setPickIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!uid) {
      // Signed out — the /dm route is gated away anyway; render an empty board.
      setPickIds([]);
      return;
    }
    let first = true;
    return subscribeDmPicks(uid, (ids) => {
      // One-time migration on the first snapshot: if this device still has
      // legacy local picks and the user doc has none, promote them. A
      // NON-empty Firestore list always wins — local picks are discarded.
      if (first && !isPreviewActive()) {
        first = false;
        const legacy = readLegacyPicks();
        localStorage.removeItem(LEGACY_KEY);
        if ((ids === null || ids.length === 0) && legacy.length > 0) {
          setPickIds(legacy); // optimistic; the snapshot echoes it right back
          void saveDmPicks(uid, legacy);
          return;
        }
      }
      first = false;
      setPickIds(ids ?? []);
    });
  }, [uid]);

  // Prune ids whose character was deleted — only once BOTH lists have loaded.
  useEffect(() => {
    if (characters === null || pickIds === null) return;
    const existing = new Set(characters.map((c) => c.id));
    if (pickIds.some((id) => !existing.has(id))) {
      const next = pickIds.filter((id) => existing.has(id));
      setPickIds(next);
      if (uid) void saveDmPicks(uid, next);
    }
  }, [characters, pickIds, uid]);

  const persist = (next: string[]) => {
    setPickIds(next);
    if (uid) void saveDmPicks(uid, next);
  };
  const addPick = (id: string) => {
    const base = pickIds ?? [];
    if (!base.includes(id)) persist([...base, id]);
  };
  const removePick = (id: string) => {
    persist((pickIds ?? []).filter((x) => x !== id));
  };

  const picked = useMemo(() => {
    if (characters === null || pickIds === null) return null;
    const byId = new Map(characters.map((c) => [c.id, c]));
    return pickIds.flatMap((id) => byId.get(id) ?? []);
  }, [characters, pickIds]);

  return { pickIds: pickIds ?? [], picked, addPick, removePick };
}
