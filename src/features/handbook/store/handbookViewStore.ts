import { create } from "zustand";
import { HANDBOOK } from "@/data/handbook";
import type { HandbookGroup, HandbookTab } from "../lib/handbookIndex";

/** Where the reader is in the Handbook — tab, open accordion cards, search and
 * scroll. Session-scoped and in-memory on purpose: the SPA keeps the store
 * alive across route changes, so leaving for another page and coming back
 * lands exactly where you left off, while a fresh app start begins clean.
 * Deep links (`?tab=…`, `?q=…`) override + replace it — see useHandbookView. */
interface HandbookViewState {
  tab: HandbookTab;
  /** Search box contents; non-empty means the results view is showing. */
  query: string;
  group: HandbookGroup | "all";
  /** The open chapter card on the Chapters tab (null = all closed). */
  openChapter: string | null;
  /** The open class card on the Classes tab (null = all closed). */
  openClass: string | null;
  /** Window scroll position, saved by useScrollMemory. */
  scrollY: number;
  setTab: (tab: HandbookTab) => void;
  setQuery: (query: string) => void;
  setGroup: (group: HandbookGroup | "all") => void;
  setOpenChapter: (id: string | null) => void;
  setOpenClass: (id: string | null) => void;
}

export const useHandbookViewStore = create<HandbookViewState>((set) => ({
  tab: "rules",
  query: "",
  group: "all",
  openChapter: HANDBOOK[0]?.id ?? null,
  openClass: null,
  scrollY: 0,
  setTab: (tab) => set({ tab }),
  setQuery: (query) => set({ query }),
  setGroup: (group) => set({ group }),
  setOpenChapter: (openChapter) => set({ openChapter }),
  setOpenClass: (openClass) => set({ openClass }),
}));
