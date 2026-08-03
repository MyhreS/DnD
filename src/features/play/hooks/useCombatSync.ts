import { useEffect } from "react";
import { useCombatStore } from "../store/combatStore";

/** Subscribe to a game's combatants while mounted. */
export function useCombatSync(gameId: string | null) {
  const sync = useCombatStore((s) => s.sync);
  const stop = useCombatStore((s) => s.stop);
  useEffect(() => {
    sync(gameId);
    return () => stop();
  }, [gameId, sync, stop]);
}
