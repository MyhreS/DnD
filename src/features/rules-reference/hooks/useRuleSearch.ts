import { useMemo, useState } from "react";
import { RULES_REFERENCE } from "@/data/rulesReference";
import { searchRules } from "../lib/searchRules";
import type { RuleCategory } from "@/types";

/** Search + category-filter state for the Rules Reference page. */
export function useRuleSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RuleCategory | "all">("all");

  const results = useMemo(() => {
    const byCategory =
      category === "all" ? RULES_REFERENCE : RULES_REFERENCE.filter((e) => e.category === category);
    return searchRules(byCategory, query);
  }, [query, category]);

  return { query, setQuery, category, setCategory, results };
}
