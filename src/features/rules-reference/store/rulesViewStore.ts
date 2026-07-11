import { create } from "zustand";
import type { RuleCategory } from "@/types";

/** Where the reader is on the Rules page — search, category chip and scroll.
 * Session-scoped and in-memory on purpose: the SPA keeps the store alive
 * across route changes, so leaving for the sheet and coming back lands on the
 * same lookup, while a fresh app start begins clean. A `?q=` deep link
 * overrides + replaces it — see useRuleSearch. */
interface RulesViewState {
  query: string;
  category: RuleCategory | "all";
  /** Window scroll position, saved by useScrollMemory. */
  scrollY: number;
  setQuery: (query: string) => void;
  setCategory: (category: RuleCategory | "all") => void;
}

export const useRulesViewStore = create<RulesViewState>((set) => ({
  query: "",
  category: "all",
  scrollY: 0,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
}));
