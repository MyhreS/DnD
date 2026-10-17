/** The real visible height of the app, kept in the CSS variable --app-height.
 *
 * iPhone home-screen apps measure "100vh", "100lvh" and even a fixed
 * `inset: 0` layer inconsistently: short on first open, too tall after
 * rotating, and only corrected by a later layout change. The window's inner
 * height (or the visual viewport's) is what is actually on screen, so read it
 * on load, resize, rotation and when returning to the app, and once more after
 * iOS finishes its rotation animation. */
export function installAppHeight(): () => void {
  if (typeof window === "undefined") return () => {};
  const root = document.documentElement;
  let frame = 0;
  const timers: number[] = [];
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
      if (height > 0) root.style.setProperty("--app-height", `${height}px`);
    });
  };
  const settle = () => {
    measure();
    // iOS reports the new size late after a rotation; check again once it settles.
    for (const delay of [150, 400, 800]) timers.push(window.setTimeout(measure, delay));
  };
  measure();
  window.addEventListener("resize", measure);
  window.addEventListener("orientationchange", settle);
  window.addEventListener("pageshow", settle);
  window.visualViewport?.addEventListener("resize", measure);
  const onVisible = () => { if (document.visibilityState === "visible") settle(); };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    cancelAnimationFrame(frame);
    timers.forEach((timer) => window.clearTimeout(timer));
    window.removeEventListener("resize", measure);
    window.removeEventListener("orientationchange", settle);
    window.removeEventListener("pageshow", settle);
    window.visualViewport?.removeEventListener("resize", measure);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
