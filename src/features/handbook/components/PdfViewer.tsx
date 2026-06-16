import { createPortal } from "react-dom";
import { HANDBOOK_PDF_PATH } from "@/data/handbook";
import { useOverlayChrome } from "../hooks/useOverlayChrome";

/**
 * Full-screen, in-app PDF viewer. Keeps the reader inside the PWA (so there's a
 * real Close button — opening the PDF in a new tab strands you in standalone
 * mode) and embeds the file inline. The PDF is prefetched, so it opens fast.
 */
export function PdfViewer({ onClose }: { onClose: () => void }) {
  useOverlayChrome(onClose);

  return createPortal(
    <div className="pdf-viewer" role="dialog" aria-modal="true" aria-label="Player's Handbook PDF">
      <div className="pdf-viewer-bar">
        <span className="pdf-viewer-title">Player's Handbook</span>
        <div className="pdf-viewer-actions">
          {/* Fallback: full native PDF view (some mobile browsers only show the
              first page inline). The overlay's Close button still returns here. */}
          <a className="pdf-viewer-link" href={HANDBOOK_PDF_PATH} target="_blank" rel="noreferrer">
            Open in browser ↗
          </a>
          <button type="button" className="pdf-viewer-close" onClick={onClose} aria-label="Close">
            Close ✕
          </button>
        </div>
      </div>
      <iframe className="pdf-viewer-frame" src={HANDBOOK_PDF_PATH} title="Player's Handbook (PDF)" />
    </div>,
    document.body,
  );
}
