import { useMemo } from "react";
import { searchEntries } from "@/lib/search";
import { HANDBOOK_INDEX, type HandbookHit } from "../lib/handbookIndex";
import { useHandbookViewStore } from "../store/handbookViewStore";

const MAX_RESULTS = 30;

/** Search + group-filter state for the Handbook, backed by the session view
 * store so an in-progress search survives navigating away and back. `?q=`
 * deep links seed it via useHandbookView (same contract as the Rules page).
 * While a query is active the page shows ranked results instead of the tabs. */
export function useHandbookSearch() {
  const query = useHandbookViewStore((s) => s.query);
  const setQuery = useHandbookViewStore((s) => s.setQuery);
  const group = useHandbookViewStore((s) => s.group);
  const setGroup = useHandbookViewStore((s) => s.setGroup);

  const active = query.trim().length > 0;
  const results = useMemo<HandbookHit[]>(() => {
    if (!active) return [];
    const pool =
      group === "all" ? HANDBOOK_INDEX : HANDBOOK_INDEX.filter((h) => h.group === group);
    return searchEntries(pool, query).slice(0, MAX_RESULTS);
  }, [active, group, query]);

  return { query, setQuery, group, setGroup, active, results };
}
