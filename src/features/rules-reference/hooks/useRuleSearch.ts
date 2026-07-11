import { useLayoutEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { RULES_REFERENCE } from "@/data/rulesReference";
import { searchEntries } from "@/lib/search";
import { useScrollMemory } from "@/hooks/common/useScrollMemory";
import { useRulesViewStore } from "../store/rulesViewStore";

/** Search + category-filter state for the Rules page, backed by the session
 * view store so the last lookup (query, chip, scroll) survives navigating
 * away and back. An explicit `?q=` deep link — the sheet's info buttons, the
 * legacy /reference redirect — wins over that memory and replaces it. */
export function useRuleSearch() {
  // The whole location (new object per navigation): a repeat deep link with an
  // identical URL still re-applies, and same-pathname history moves re-fire.
  const location = useLocation();

  useLayoutEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (q === null) return; // plain /rules → restore the remembered lookup
    useRulesViewStore.setState({ query: q, category: "all", scrollY: 0 });
    // Land at the top even when the page doesn't remount (useScrollMemory only
    // scrolls on mount — e.g. history moves between /rules and /rules?q=…).
    window.scrollTo(0, 0);
  }, [location]);

  useScrollMemory(useRulesViewStore);

  const query = useRulesViewStore((s) => s.query);
  const setQuery = useRulesViewStore((s) => s.setQuery);
  const category = useRulesViewStore((s) => s.category);
  const setCategory = useRulesViewStore((s) => s.setCategory);

  const results = useMemo(() => {
    const byCategory =
      category === "all" ? RULES_REFERENCE : RULES_REFERENCE.filter((e) => e.category === category);
    return searchEntries(byCategory, query);
  }, [query, category]);

  return { query, setQuery, category, setCategory, results };
}
