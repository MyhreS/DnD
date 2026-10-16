import { useEffect, useRef, useState } from "react";

interface HunterHpState {
  hp: number | null;
  notTonight: boolean;
}

/** A Hunter's battle HP as the DM last set it. Each Damage/Heal tap shows at
 * once and the next tap builds on it, however fast the DM taps; the writes go
 * out one after another so the last tap always wins. The Hunter's own sheet
 * takes over again once every write has landed and the sheet shows it. */
export function useOptimisticHunterHp(server: HunterHpState) {
  const [pending, setPending] = useState<HunterHpState | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    // Mid-queue the sheet passes through older values; only let go once idle.
    if (pending && inFlight === 0 && pending.hp === server.hp && pending.notTonight === server.notTonight) setPending(null);
  }, [pending, inFlight, server.hp, server.notTonight]);

  useEffect(() => {
    if (!pending || inFlight > 0) return;
    // Safety net: never hold a stale value long after every write has landed.
    const timer = window.setTimeout(() => setPending(null), 5000);
    return () => window.clearTimeout(timer);
  }, [pending, inFlight]);

  function enqueue(next: HunterHpState, write: () => Promise<boolean>) {
    setPending(next);
    setInFlight((count) => count + 1);
    chain.current = chain.current
      .then(write)
      .catch(() => false)
      .then((ok) => {
        if (!ok) setPending(null);
        setInFlight((count) => count - 1);
      });
  }

  return { current: pending ?? server, enqueue };
}
