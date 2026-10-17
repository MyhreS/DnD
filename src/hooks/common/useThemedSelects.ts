import { useEffect } from "react";
import { installThemedSelects } from "@/lib/themedSelects";

/** Opens every dropdown's list in the app's own style on desktop. */
export function useThemedSelects() {
  useEffect(() => installThemedSelects(), []);
}
