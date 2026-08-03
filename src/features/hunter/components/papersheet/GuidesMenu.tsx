import { useRef, useState } from "react";
import { useGuidesPopover } from "../../hooks/useGuidesPopover";

/** One small "Guides" toolbar button opening a compact popover with the two
 * sheet-guidance toggles: the red creation-step numbers and the ⓘ info dots.
 * The popover hangs off the toolbar (its position: relative), closes on
 * Escape or an outside tap, and hands focus back to the button. */
export function GuidesMenu({
  showSteps,
  showInfo,
  setShowSteps,
  setShowInfo,
}: {
  showSteps: boolean;
  showInfo: boolean;
  setShowSteps: (on: boolean) => void;
  setShowInfo: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useGuidesPopover(open, () => setOpen(false), popRef, btnRef);

  return (
    <>
      <button
        type="button"
        className="ghost"
        ref={btnRef}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Guides
      </button>
      {open && (
        <div className="guides-pop" ref={popRef} role="group" aria-label="Sheet guides">
          <label>
            <input
              type="checkbox"
              checked={showSteps}
              onChange={(e) => setShowSteps(e.target.checked)}
            />
            Step numbers
          </label>
          <label>
            <input
              type="checkbox"
              checked={showInfo}
              onChange={(e) => setShowInfo(e.target.checked)}
            />
            Info icons
          </label>
        </div>
      )}
    </>
  );
}
