import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/** A stable anchor id for a rules-chapter section heading. */
export function sectionSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Handbook deep-link params (`?tab=rules&chapter=step-3-abilities&section=
 * determine-ability-modifiers`) — used by the sheet's info buttons. Left in
 * the URL on purpose: the links open in a new tab and should survive reload. */
export function useHandbookIntent() {
  const [params] = useSearchParams();
  return {
    tab: params.get("tab"),
    chapter: params.get("chapter"),
    section: params.get("section"),
  };
}

/** Scrolls the deep-linked section into view (once, on arrival) and pulses a
 * highlight on it so the reader lands exactly where the sheet pointed. */
export function useScrollToSection(chapterId: string | null, section: string | null) {
  useEffect(() => {
    if (!chapterId || !section) return;
    // The chapter content mounts in this same commit — defer one frame.
    const t = window.setTimeout(() => {
      const el = document.getElementById(`hb-${chapterId}-${section}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("hb-focus");
      window.setTimeout(() => el.classList.remove("hb-focus"), 2600);
    }, 80);
    return () => window.clearTimeout(t);
  }, [chapterId, section]);
}
