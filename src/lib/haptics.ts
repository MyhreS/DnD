/** Haptic feedback for the phone app, used sparingly the way Apple's Human
 * Interface Guidelines describe: only for meaningful moments, matching the
 * system's own patterns.
 *
 * - selection: a value or choice changed (next turn, a step completed).
 * - light: a small physical action landed (damage/heal applied).
 * - success / warning / error: the outcome of a task.
 *
 * iPhone: Safari has no Vibration API. Since iOS 18 toggling a native
 * `<input type="checkbox" switch>` plays the system's light "tick", so that
 * tick is the only iOS primitive; notification types are short tick
 * sequences. Android/others: `navigator.vibrate` with short patterns. Desktop
 * or unsupported browsers: nothing happens. */
export type HapticKind = "selection" | "light" | "success" | "warning" | "error";

const VIBRATION: Record<HapticKind, number | number[]> = {
  selection: 8,
  light: 14,
  success: [18, 70, 26],
  warning: [26, 90, 26],
  error: [32, 60, 32, 60, 32],
};

/** Delays (ms) of each iOS tick in a pattern. */
const IOS_TICKS: Record<HapticKind, number[]> = {
  selection: [0],
  light: [0],
  success: [0, 110],
  warning: [0, 150],
  error: [0, 90, 180],
};

let iosSwitch: HTMLLabelElement | null = null;

function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.ariaHidden = "true";
    label.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;clip-path:inset(50%)";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

export function haptic(kind: HapticKind = "selection"): void {
  if (!isTouchDevice()) return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(VIBRATION[kind]);
      return;
    }
    for (const delay of IOS_TICKS[kind]) {
      if (delay === 0) iosTick();
      else window.setTimeout(iosTick, delay);
    }
  } catch {
    // Haptics are a nicety; never let them break an action.
  }
}
