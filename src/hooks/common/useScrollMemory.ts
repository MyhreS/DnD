import { useLayoutEffect } from "react";

/** The slice a view store must expose for scroll memory. Zustand stores are
 * structurally compatible (their `setState` accepts any partial). */
interface ScrollMemoryStore {
  getState: () => { scrollY: number };
  setState: (partial: { scrollY: number }) => void;
}

/** Remembers the page's scroll position in its view store for the session.
 * On mount the window is scrolled back to where the reader left off — before
 * paint, since the content renders at full height synchronously from the same
 * store (accordion/search state is already known). While mounted, scrolling
 * writes through (rAF-throttled); unmount saves a final value. The page itself
 * scrolls the document (see global.css) — window is the scrolling container. */
export function useScrollMemory(store: ScrollMemoryStore) {
  useLayoutEffect(() => {
    const y = store.getState().scrollY;
    window.scrollTo(0, y);
    // Late layout (web fonts, images) can clamp the first attempt — re-assert
    // once after two frames, unless something already moved us on purpose.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (y > 0 && Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
      });
    });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        store.setState({ scrollY: window.scrollY });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("scroll", onScroll);
      store.setState({ scrollY: window.scrollY });
    };
  }, [store]);
}
