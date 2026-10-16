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
 * sequences. iOS 26.5+ only ticks for a real tap on a switch, so buttons
 * that matter are wrapped in <HapticTap>; scripted ticks still help older iOS.
 * Android/others: `navigator.vibrate` with short patterns. Desktop or
 * unsupported browsers: nothing happens. */
export type HapticKind = "selection" | "light" | "success" | "warning" | "error";

const VIBRATION: Record<HapticKind, number | number[]> = {
  // Many Android motors cannot render pulses shorter than ~20 ms.
  selection: 20,
  light: 30,
  success: [30, 80, 40],
  warning: [40, 100, 40],
  error: [50, 70, 50, 70, 50],
};

/** Delays (ms) of each iOS tick in a pattern. */
const IOS_TICKS: Record<HapticKind, number[]> = {
  selection: [0],
  light: [0],
  success: [0, 120],
  warning: [0, 160],
  error: [0, 100, 200],
};

let lastTapTick = 0;

/** A real tap just ticked through a HapticTap switch; skip the scripted tick
 * for that same tap so it never plays twice. */
export function markTapTick(): void {
  lastTapTick = Date.now();
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Scripted tick: a fresh, undisplayed switch clicked through its label.
 * Works on iOS 18 to 26.4; iOS 26.5+ ignores it (see HapticTap). */
function iosTick() {
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

export function haptic(kind: HapticKind = "selection"): void {
  try {
    if (isIos()) {
      if (Date.now() - lastTapTick < 600) return;
      for (const delay of IOS_TICKS[kind]) {
        if (delay === 0) iosTick();
        else window.setTimeout(iosTick, delay);
      }
      return;
    }
    if (!isTouchDevice()) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(VIBRATION[kind]);
  } catch {
    // Haptics are a nicety; never let them break an action.
  }
}
