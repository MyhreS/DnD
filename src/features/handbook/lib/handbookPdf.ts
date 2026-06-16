import { HANDBOOK_PDF_PATH } from "@/data/handbook";

let started = false;

/**
 * Warm the cache with the large (~26MB) handbook PDF once, in the background,
 * so opening it in the viewer is instant. A plain GET populates the CacheFirst
 * runtime cache (see vite.config workbox.runtimeCaching). Safe to call often.
 */
export function prefetchHandbookPdf(): void {
  if (started || !navigator.onLine) return;
  started = true;
  fetch(HANDBOOK_PDF_PATH).catch(() => {
    started = false; // let a later visit retry
  });
}
