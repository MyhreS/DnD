import { useEffect } from "react";
import { prefetchHandbookPdf } from "../lib/handbookPdf";

/** Kick off the background PDF prefetch shortly after the page settles. */
export function usePrefetchHandbookPdf() {
  useEffect(() => {
    const t = window.setTimeout(prefetchHandbookPdf, 1200);
    return () => window.clearTimeout(t);
  }, []);
}
