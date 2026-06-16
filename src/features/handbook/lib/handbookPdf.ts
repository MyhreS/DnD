import { HANDBOOK_PDF_PATH } from "@/data/handbook";

const FILENAME = "Catacombs-and-Starspawns-Handbook.pdf";

/**
 * Save the handbook PDF. On iOS (and other Web Share targets) this opens the
 * native share sheet so you can "Save to Files" / pick a location; elsewhere it
 * falls back to a normal file download. Fetched on demand — we deliberately
 * don't cache the 26MB file (it can blow the iOS PWA storage quota).
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
