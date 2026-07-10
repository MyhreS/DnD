import { useState } from "react";
import { SHEET_INFO } from "../../lib/sheetInfo";

/** The little ⓘ beside every sheet section: hover (desktop) or tap (mobile)
 * shows what the field is and how to fill it in, which handbook page/section
 * covers it, and a link that opens the app's Handbook there in a new tab —
 * so flipping between the sheet and the rules stays painless. */
export function Info({ k, side }: { k: string; side?: "left" | "right" | "up" }) {
  const info = SHEET_INFO[k];
  const [open, setOpen] = useState(false);
  if (!info) return null;
  return (
    <span className={`info${open ? " open" : ""}${side ? ` side-${side}` : ""}`}>
      <button
        type="button"
        aria-label={`About: ${info.title}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      <span className="info-pop" role="tooltip">
        <b>{info.title}</b>
        <span className="info-text">{info.text}</span>
        <span className="info-ref">
          {info.pdfPage ? `Handbook PDF p. ${info.pdfPage} · ` : ""}
          {info.refTitle}
        </span>
        <a
          href={info.link}
          target="_blank"
          rel="noopener noreferrer"
          onMouseDown={(e) => e.preventDefault() /* keep the dot's focus — blur would close before the click lands */}
        >
          Open in Handbook ↗
        </a>
      </span>
    </span>
  );
}
