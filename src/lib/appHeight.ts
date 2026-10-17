/** The real visible height of the app, kept in the CSS variable --app-height.
 *
 * iPhone home-screen apps measure "100vh", "100lvh" and even a fixed
 * `inset: 0` layer inconsistently: short on first open, too tall after
 * rotating, and only corrected by a later layout change. The window's inner
 * height (or the visual viewport's) is what is actually on screen, so read it
 * on load, resize, rotation and when returning to the app, and once more after
 * iOS finishes its rotation animation. */
/** In the installed iPhone app the page fills the whole screen (it draws under
 * the status bar), but on some launches iOS reports a height without the
 * status bar until a later layout. The screen's own size is always right
 * there; iOS keeps screen.width/height in portrait terms, so pick by
 * orientation. Elsewhere this returns 0 and the measured height wins. */
function standaloneIphoneHeight(): number {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
  if (!standalone || !/iPhone|iPod/.test(navigator.userAgent)) return 0;
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  return landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
}

export function installAppHeight(): () => void {
  if (typeof window === "undefined") return () => {};
  const root = document.documentElement;
  let frame = 0;
  const timers: number[] = [];
  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const height = Math.round(Math.max(window.visualViewport?.height ?? 0, window.innerHeight, standaloneIphoneHeight()));
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
