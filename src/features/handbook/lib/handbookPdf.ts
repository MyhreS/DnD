import { HANDBOOK_PDF_PATH } from "@/data/handbook";

/**
 * Open a PDF document. On iOS (and other Web Share targets) this opens the
 * native share sheet so you can "Save to Files" / pick a location; elsewhere it
 * falls back to a normal file download. Fetched on demand — we deliberately
 * don't cache these (the files can be large and blow the iOS PWA storage quota).
 */
export async function openDocument(
  path: string,
  filename: string,
  title: string,
): Promise<void> {
  const blob = await fetch(path).then((r) => r.blob());
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // user dismissed
      // otherwise fall through to a plain download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Save the full Player's Handbook PDF. */
export function downloadHandbookPdf(): Promise<void> {
  return openDocument(
    HANDBOOK_PDF_PATH,
    "Catacombs-and-Starspawns-Handbook.pdf",
    "Player's Handbook",
  );
}
