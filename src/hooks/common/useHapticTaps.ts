import { useEffect } from "react";
import { installHapticTaps } from "@/lib/hapticTaps";

/** Turns on haptics for every control marked `data-haptic`, app-wide. */
export function useHapticTaps() {
  useEffect(() => installHapticTaps(), []);
}
