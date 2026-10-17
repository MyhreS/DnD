import { useEffect, useState } from "react";

/** A notice that shows when the screen opens, then steps aside on its own
 * after `ms` (or straight away when dismissed). */
export function useTimedBanner(ms: number): [boolean, () => void] {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return [visible, () => setVisible(false)];
}
