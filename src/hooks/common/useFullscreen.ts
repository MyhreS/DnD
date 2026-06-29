import { useCallback, useEffect, useState } from "react";

/** Track and toggle document fullscreen (for the big-screen status board).
 * `requestFullscreen` needs a user gesture, so wire `toggle` to a button. */
export function useFullscreen(): { isFullscreen: boolean; toggle: () => void; supported: boolean } {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }, []);

  const supported =
    typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";

  return { isFullscreen, toggle, supported };
}
