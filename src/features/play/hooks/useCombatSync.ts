import { useEffect } from "react";
import { useCombatStore } from "../store/combatStore";

/** Subscribe to a game's combatants while mounted. */
export function useCombatSync(gameId: string | null, publicView = false) {
  const sync = useCombatStore((s) => s.sync);
  const stop = useCombatStore((s) => s.stop);
  useEffect(() => {
    sync(gameId, publicView);
    return () => stop();
  }, [gameId, publicView, sync, stop]);
}
