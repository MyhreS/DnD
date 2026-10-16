import { haptic, isIos, markTapTick, type HapticKind } from "./haptics";

/** Haptics for any control marked `data-haptic` (optionally `="light"` etc.).
 *
 * iPhone (iOS 26.5+) only ticks when a real finger tap toggles a native
 * `<input type="checkbox" switch>`. So when a finger touches a marked
 * control, one shared invisible switch moves under the finger; Safari's tap
 * then lands on it (iOS picks the click target when the finger lifts), the
 * phone ticks, and the tap is handed on to the control. A finger that moves
 * (a scroll) puts the switch away. Other phones vibrate from the click. */
const KINDS = new Set<HapticKind>(["selection", "light", "success", "warning", "error"]);
const SIZE = 48;

function kindOf(element: HTMLElement): HapticKind {
  const value = element.dataset.haptic as HapticKind | undefined;
  return value && KINDS.has(value) ? value : "selection";
}

function markedControl(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  // A tap on a checkbox's label text counts as a tap on the checkbox.
  const labelled = node.closest("label")?.control;
  const control = node.closest<HTMLElement>("[data-haptic]")
    ?? (labelled?.matches("[data-haptic]") ? labelled : null);
  if (!control) return null;
  if (control.matches(":disabled, [aria-disabled='true']")) return null;
  return control;
}

export function installHapticTaps(): () => void {
  if (typeof document === "undefined") return () => {};

  if (!isIos()) {
    // Android & co.: the Vibration API works straight from the click.
    const onClick = (event: MouseEvent) => {
      const control = markedControl(event.target);
      if (control) haptic(kindOf(control));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }

  const overlay = document.createElement("input");
  overlay.type = "checkbox";
  overlay.setAttribute("switch", "");
  overlay.setAttribute("aria-hidden", "true");
  overlay.tabIndex = -1;
  overlay.className = "haptic-finger-switch";
  overlay.style.cssText = `position:fixed;z-index:2147483647;width:${SIZE}px;height:${SIZE}px;margin:0;padding:0;border:0;opacity:0;display:none;`;
  document.body.appendChild(overlay);

  let target: HTMLElement | null = null;
  let start = { x: 0, y: 0 };
  let hideTimer = 0;

  const hide = () => {
    overlay.style.display = "none";
    target = null;
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.target === overlay) return;
    const control = event.touches.length === 1 ? markedControl(event.target) : null;
    if (!control) { hide(); return; }
    const touch = event.touches[0];
    start = { x: touch.clientX, y: touch.clientY };
    target = control;
    window.clearTimeout(hideTimer);
    overlay.style.left = `${touch.clientX - SIZE / 2}px`;
    overlay.style.top = `${touch.clientY - SIZE / 2}px`;
    overlay.style.display = "block";
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!target) return;
    const touch = event.touches[0];
    if (Math.abs(touch.clientX - start.x) > 10 || Math.abs(touch.clientY - start.y) > 10) hide();
  };

  const onTouchEnd = () => {
    window.clearTimeout(hideTimer);
    // The tap's click follows touchend; put the switch away if none comes.
    hideTimer = window.setTimeout(hide, 600);
  };

  const onOverlayClick = (event: MouseEvent) => {
    event.stopPropagation();
    const control = target;
    hide();
    if (!control) return;
    markTapTick();
    control.focus?.({ preventScroll: true });
    control.click();
  };

  document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
  document.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
  document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
  document.addEventListener("touchcancel", hide, { capture: true, passive: true });
  overlay.addEventListener("click", onOverlayClick);
  return () => {
    document.removeEventListener("touchstart", onTouchStart, { capture: true });
    document.removeEventListener("touchmove", onTouchMove, { capture: true });
    document.removeEventListener("touchend", onTouchEnd, { capture: true });
    document.removeEventListener("touchcancel", hide, { capture: true });
    overlay.remove();
  };
}
