import { useEffect, useState } from "react";
import { remainingSeconds } from "../lib/combatRules";
import { useCombatStore } from "../store/combatStore";

export function useCombatClock(): number {
  const session = useCombatStore((s) => s.session);
  const expireTimer = useCombatStore((s) => s.expireTimer);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (session.timerPhase !== "running") return;
    const tick = () => {
      const nextNow = Date.now();
      setNow(nextNow);
      expireTimer(nextNow);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [expireTimer, session.timerPhase, session.timerEndsAt]);

  return remainingSeconds(session, now);
}

