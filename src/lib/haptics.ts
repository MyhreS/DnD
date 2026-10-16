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
 * sequences. There are a few ways to toggle the switch from script; Profile →
 * Haptics lets a player try each and keeps the one their phone answers to.
 * Android/others: `navigator.vibrate` with short patterns. Desktop or
 * unsupported browsers: nothing happens. */
export type HapticKind = "selection" | "light" | "success" | "warning" | "error";
export type IosHapticMethod = "label" | "input" | "body";

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

const METHOD_KEY = "haptics-ios-method";
const IOS_METHODS: IosHapticMethod[] = ["label", "input", "body"];

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

export function iosHapticMethod(): IosHapticMethod {
  try {
    const saved = localStorage.getItem(METHOD_KEY) as IosHapticMethod | null;
    if (saved && IOS_METHODS.includes(saved)) return saved;
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
  return "label";
}

export function setIosHapticMethod(method: IosHapticMethod): void {
  try { localStorage.setItem(METHOD_KEY, method); } catch { /* ignore */ }
}

function makeSwitch(): { label: HTMLLabelElement; input: HTMLInputElement } {
  const label = document.createElement("label");
  label.ariaHidden = "true";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  return { label, input };
}

let bodySwitch: HTMLLabelElement | null = null;

function iosTick(method: IosHapticMethod) {
  if (method === "label") {
    // A fresh, undisplayed switch in <head>, clicked through its label.
    const { label } = makeSwitch();
    label.style.display = "none";
    document.head.appendChild(label);
    label.click();
    label.remove();
    return;
  }
  if (method === "input") {
    // A fresh, rendered (but invisible) switch, clicked directly.
    const { label, input } = makeSwitch();
    label.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;overflow:hidden";
    document.body.appendChild(label);
    input.click();
    label.remove();
    return;
  }
  if (!bodySwitch) {
    const { label } = makeSwitch();
    label.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;clip-path:inset(50%)";
    document.body.appendChild(label);
    bodySwitch = label;
  }
  bodySwitch.click();
}

export function haptic(kind: HapticKind = "selection", method?: IosHapticMethod): void {
  try {
    if (isIos()) {
      const chosen = method ?? iosHapticMethod();
      for (const delay of IOS_TICKS[kind]) {
        if (delay === 0) iosTick(chosen);
        else window.setTimeout(() => iosTick(chosen), delay);
      }
      return;
    }
    if (!isTouchDevice()) return;
    if (typeof navigator.vibrate === "function") navigator.vibrate(VIBRATION[kind]);
  } catch {
    // Haptics are a nicety; never let them break an action.
  }
}
