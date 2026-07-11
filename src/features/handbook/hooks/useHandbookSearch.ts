import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchEntries } from "@/lib/search";
import { HANDBOOK_INDEX, type HandbookGroup, type HandbookHit } from "../lib/handbookIndex";

const MAX_RESULTS = 30;

/** Search + group-filter state for the Handbook. `?q=` seeds the box (same
 * contract as the Rules page), so other pages can deep-link a search. While a
 * query is active the page shows ranked results instead of the tabs. */
export function useHandbookSearch() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [group, setGroup] = useState<HandbookGroup | "all">("all");

  const active = query.trim().length > 0;
  const results = useMemo<HandbookHit[]>(() => {
    if (!active) return [];
    const pool =
      group === "all" ? HANDBOOK_INDEX : HANDBOOK_INDEX.filter((h) => h.group === group);
    return searchEntries(pool, query).slice(0, MAX_RESULTS);
  }, [active, group, query]);

  return { query, setQuery, group, setGroup, active, results };
}
