import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RULES_REFERENCE } from "@/data/rulesReference";
import { searchEntries } from "@/lib/search";
import type { RuleCategory } from "@/types";

/** Search + category-filter state for the Rules page. `?q=` seeds
 * the search box, so other pages (the sheet's info buttons) can deep-link
 * straight to a rule. */
export function useRuleSearch() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState<RuleCategory | "all">("all");

  const results = useMemo(() => {
    const byCategory =
      category === "all" ? RULES_REFERENCE : RULES_REFERENCE.filter((e) => e.category === category);
    return searchEntries(byCategory, query);
  }, [query, category]);

  return { query, setQuery, category, setCategory, results };
}
