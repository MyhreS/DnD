import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

type DragState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastAt: number;
  velocity: number;
};

const FLING_VELOCITY = 0.65;
const DISMISS_DURATION = 220;

export function useDrawerDrag(onClose: () => void) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  const setPosition = (offset: number) => {
    const drawer = drawerRef.current;
    const overlay = drawer?.parentElement;
    if (!drawer || !overlay) return;
    const progress = Math.min(1, offset / Math.max(1, drawer.offsetHeight));
    drawer.style.setProperty("--v4-drawer-drag-y", `${offset}px`);
    overlay.style.setProperty("--v4-scrim-opacity", String(Math.max(0, .58 * (1 - progress))));
  };

  const reset = () => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    dragRef.current = null;
    drawer.classList.remove("is-dragging");
    setPosition(0);
  };

  const dismiss = () => {
    const drawer = drawerRef.current;
    const overlay = drawer?.parentElement;
    if (!drawer || !overlay) return;
    dragRef.current = null;
    drawer.classList.remove("is-dragging");
    drawer.classList.add("is-dismissing");
    overlay.classList.add("is-dismissing");
    closeTimerRef.current = window.setTimeout(onClose, DISMISS_DURATION);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, lastY: event.clientY, lastAt: now, velocity: 0 };
    drawerRef.current?.classList.add("is-dragging");
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastAt);
    drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastAt = now;
    setPosition(Math.max(0, event.clientY - drag.startY));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const drawer = drawerRef.current;
    if (!drag || !drawer || drag.pointerId !== event.pointerId) return;
    const offset = Math.max(0, event.clientY - drag.startY);
    const threshold = Math.min(180, Math.max(96, drawer.offsetHeight * .22));
    const recentVelocity = performance.now() - drag.lastAt < 100 ? drag.velocity : 0;
    if (offset >= threshold || (offset > 24 && recentVelocity >= FLING_VELOCITY)) dismiss();
    else reset();
  };

  const onPointerCancel = () => reset();

  return { drawerRef, dismiss, dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
}
