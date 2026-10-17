import { useEffect } from "react";
import { installAppHeight } from "@/lib/appHeight";

/** Keeps --app-height equal to the real visible height (see appHeight.ts). */
export function useAppHeight() {
  useEffect(() => installAppHeight(), []);
}
