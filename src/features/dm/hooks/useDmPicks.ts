import { useEffect, useMemo } from "react";
import { useSettings } from "@/app/settings";
import type { HunterCard } from "@/types";

/** The DM's personal board: persisted character ids (per-device, `cs-dm-picks`
 * in the settings store) resolved against the live character list. Picks whose
 * character doc no longer exists are never rendered, and once the list has
 * loaded they're pruned from storage too. `picked` is null while loading. */
export function useDmPicks(characters: HunterCard[] | null): {
  pickIds: string[];
  picked: HunterCard[] | null;
  addPick: (id: string) => void;
  removePick: (id: string) => void;
} {
  const pickIds = useSettings((s) => s.dmPicks);
  const addPick = useSettings((s) => s.addDmPick);
  const removePick = useSettings((s) => s.removeDmPick);
  const setDmPicks = useSettings((s) => s.setDmPicks);

  // Prune ids whose character was deleted — only once the list has loaded,
  // so a slow subscription can't wipe a valid selection.
  useEffect(() => {
    if (characters === null) return;
    const existing = new Set(characters.map((c) => c.id));
    if (pickIds.some((id) => !existing.has(id))) {
      setDmPicks(pickIds.filter((id) => existing.has(id)));
    }
  }, [characters, pickIds, setDmPicks]);

  const picked = useMemo(() => {
    if (characters === null) return null;
    const byId = new Map(characters.map((c) => [c.id, c]));
    return pickIds.flatMap((id) => byId.get(id) ?? []);
  }, [characters, pickIds]);

  return { pickIds, picked, addPick, removePick };
}
