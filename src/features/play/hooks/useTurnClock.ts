import { useEffect, useState } from "react";
import type { EncounterState } from "@/types";
import { effectiveTimerPhase, remainingTurnMs } from "../lib/turnTimer";

export function useTurnClock(encounter: EncounterState) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (encounter.timerPhase !== "running") return;
    const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, [encounter.timerEndsAt, encounter.timerPhase]);

  return {
    phase: effectiveTimerPhase(encounter, now),
    remainingMs: remainingTurnMs(encounter, now),
  };
}
