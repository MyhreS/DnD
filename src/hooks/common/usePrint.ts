import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Triggers the browser print/"Save as PDF" dialog with a brief loading state,
 * so the (sometimes slow) dialog open gives immediate feedback.
 */
export function usePrint() {
  const [printing, setPrinting] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    return () => {
      window.removeEventListener("afterprint", done);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const print = useCallback(() => {
    setPrinting(true);
    // Let the overlay paint before the (blocking) print dialog opens.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // Fallback hide in case `afterprint` doesn't fire (some browsers).
        timer.current = window.setTimeout(() => setPrinting(false), 800);
      });
    });
  }, []);

  return { printing, print };
}
