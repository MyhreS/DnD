import { useRef } from "react";
import { AsyncButton } from "@/components/AsyncButton";
import { isPreviewActive } from "@/dev/preview";
import { useAiHelp } from "../../hooks/useAiHelp";
import { useGuidesPopover } from "../../hooks/useGuidesPopover";

/** The toolbar's "Get help from AI" button (edit mode only — the modal's
 * editable context already implies the signed-in owner). One click mints a
 * 24h token scoped to THIS character and puts a paste-ready briefing (who,
 * which character, the API endpoints, the token) on the clipboard. When the
 * browser blocks the automatic write, a popover offers the text + a manual
 * Copy button (a fresh gesture). Hidden in preview mode — no real auth there,
 * so the mint callable would only fail. */
export function AiHelpButton({ characterId }: { characterId: string }) {
  const { copied, message, fallbackText, run, copyFallback, closeFallback } =
    useAiHelp(characterId);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useGuidesPopover(fallbackText != null, closeFallback, popRef, anchorRef);

  if (isPreviewActive()) return null;

  return (
    <>
      <span ref={anchorRef} style={{ display: "contents" }}>
        <AsyncButton className="ghost" pendingText="Creating link…" showDone={false} onClick={run}>
          {copied ? "Copied ✓" : "Get help from AI"}
        </AsyncButton>
      </span>
      <span className="aihelp-live" aria-live="polite" role="status">
        {message}
      </span>
      {fallbackText != null && (
        <div
          className="guides-pop aihelp-pop"
          ref={popRef}
          role="dialog"
          aria-label="Copy your AI helper briefing"
        >
          <p>Automatic copy was blocked — copy it yourself:</p>
          <textarea
            readOnly
            rows={7}
            value={fallbackText}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="aihelp-pop-actions">
            <button type="button" onClick={copyFallback}>
              Copy
            </button>
            <button type="button" className="ghost" onClick={closeFallback}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
