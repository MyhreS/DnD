import type { RefObject } from "react";

export function CharacterSheetBackButton({
  onClick,
  backRef,
  ariaLabel = "Back",
}: {
  onClick: () => void;
  backRef?: RefObject<HTMLButtonElement | null>;
  ariaLabel?: string;
}) {
  return <button type="button" className="character-sheet-back" ref={backRef} onClick={onClick} aria-label={ariaLabel}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
    <span>Back</span>
  </button>;
}
