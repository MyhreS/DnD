import type { ReactElement } from "react";
import { isIos, markTapTick } from "@/lib/haptics";

/** Safari's native switch control (not yet in React's types). */
const SWITCH = { switch: "" } as object;

/** iPhone: only a real finger tap on a native switch makes the phone tick —
 * since iOS 26.5 a switch toggled from script stays silent. So this lays an
 * invisible native switch over one button: the tap lands on the switch, the
 * phone ticks, and the tap is handed on to the button. Elsewhere it renders
 * the button untouched (Android uses the Vibration API from the handler). */
export function HapticTap({ children, disabled = false }: { children: ReactElement; disabled?: boolean }) {
  if (!isIos()) return children;
  return (
    <span className="haptic-tap">
      {children}
      {!disabled && (
        <input
          type="checkbox"
          {...SWITCH}
          className="haptic-tap-switch"
          aria-hidden="true"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            markTapTick();
            (event.currentTarget.previousElementSibling as HTMLElement | null)?.click();
          }}
        />
      )}
    </span>
  );
}
