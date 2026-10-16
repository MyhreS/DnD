import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";

/** One selection tick when something becomes complete (not on first show). */
export function useHapticOnComplete(complete: boolean) {
  const previous = useRef(complete);
  useEffect(() => {
    if (complete && !previous.current) haptic("selection");
    previous.current = complete;
  }, [complete]);
}
