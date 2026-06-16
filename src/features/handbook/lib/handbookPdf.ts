import { HANDBOOK_PDF_PATH } from "@/data/handbook";

const FILENAME = "Catacombs-and-Starspawns-Handbook.pdf";

let started = false;

/**
 * Warm the cache with the large (~26MB) handbook PDF once, in the background,
 * so downloading it is instant. A plain GET populates the CacheFirst runtime
 * cache (see vite.config workbox.runtimeCaching). Safe to call often.
 */
export function prefetchHandbookPdf(): void {
  if (started || !navigator.onLine) return;
  started = true;
  fetch(HANDBOOK_PDF_PATH).catch(() => {
    started = false; // let a later visit retry
  });
}

/**
 * Save the handbook PDF. On iOS (and other Web Share targets) this opens the
 * native share sheet so you can "Save to Files" / pick a location; elsewhere it
 * falls back to a normal file download. Reuses the prefetched/cached bytes.
 */
export async function downloadHandbookPdf(): Promise<void> {
  const blob = await fetch(HANDBOOK_PDF_PATH).then((r) => r.blob());
  const file = new File([blob], FILENAME, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Player's Handbook" });
      return;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // user dismissed
      // otherwise fall through to a plain download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
