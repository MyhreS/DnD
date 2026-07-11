import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { HANDBOOK } from "@/data/handbook";
import { useScrollMemory } from "@/hooks/common/useScrollMemory";
import { HANDBOOK_TABS, type HandbookTab } from "../lib/handbookIndex";
import { useHandbookViewStore } from "../store/handbookViewStore";

/** The Handbook's session memory. The page reads tab + open cards from the
 * view store, so plain `/handbook` navigation (nav tabs) restores where the
 * reader left off. An EXPLICIT deep link (`?tab=`, `?chapter=`, `?section=`,
 * `?item=`, `?q=` — the sheet's info dots, search-hit jumps) wins over that
 * memory and replaces it, applied before paint so nothing flashes. */
export function useHandbookView() {
  const { search } = useLocation();

  useLayoutEffect(() => {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    const chapter = params.get("chapter");
    const section = params.get("section");
    const item = params.get("item");
    const q = params.get("q");
    // No deep-link params → hydrate purely from memory (the store as-is).
    if (tab === null && chapter === null && section === null && item === null && q === null) return;

    const validTab = HANDBOOK_TABS.includes(tab as HandbookTab) ? (tab as HandbookTab) : null;
    const validChapter = HANDBOOK.some((c) => c.id === chapter) ? chapter : null;
    useHandbookViewStore.setState((s) => ({
      // A content link switches to its tab; a bare `?q=` search link keeps the
      // remembered tab (the results view covers the tabs anyway).
      tab: validTab ?? (item ? "classes" : validChapter ? "rules" : s.tab),
      // Any explicit link resets the search: `?q=` to its query, a content
      // link to none — so the linked content isn't hidden behind old results.
      query: q ?? "",
      group: "all",
      openChapter: validChapter ?? s.openChapter,
      openClass: item ?? s.openClass,
      scrollY: 0,
    }));
  }, [search]);

  useScrollMemory(useHandbookViewStore);

  const tab = useHandbookViewStore((s) => s.tab);
  const setTab = useHandbookViewStore((s) => s.setTab);
  const openChapter = useHandbookViewStore((s) => s.openChapter);
  const setOpenChapter = useHandbookViewStore((s) => s.setOpenChapter);
  const openClass = useHandbookViewStore((s) => s.openClass);
  const setOpenClass = useHandbookViewStore((s) => s.setOpenClass);
  return { tab, setTab, openChapter, setOpenChapter, openClass, setOpenClass };
}
