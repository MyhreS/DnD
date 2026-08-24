import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";

/** Keep the document behind one or more overlays still, then restore its
 * original scroll state only after the final overlay closes. */
export function useBodyScrollLock(): void {
  useEffect(() => {
    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, []);
}
