import { useEffect } from "react";

/** On phone and tablet layouts the app header is a sticky bar of variable
 * height (safe area, wrapped tabs). Publish that height as
 * `--battle-sticky-top` so the battle command bar pins just beneath it rather
 * than sliding under it. In the desktop sidebar layout the offset is 0. */
export function useStickyTopbarOffset() {
  useEffect(() => {
    const root = document.documentElement;
    const topbar = document.querySelector<HTMLElement>(".app-topbar");
    if (!topbar) return;
    const update = () => {
      const rect = topbar.getBoundingClientRect();
      const isSidebar = rect.height >= window.innerHeight * 0.8;
      root.style.setProperty("--battle-sticky-top", `${isSidebar ? 0 : Math.round(rect.height)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(topbar);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--battle-sticky-top");
    };
  }, []);
}
