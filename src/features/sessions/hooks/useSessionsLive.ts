import { useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";

/** Starts the live sessions subscription. Read data via `useSessionStore`. */
export function useSessionsLive(): void {
  const start = useSessionStore((s) => s.start);
  useEffect(() => start(), [start]);
}
