import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

/** Keep the live-game subscription running for the whole signed-in session, so
 * the "return to game" banner and Play screen always have fresh state. */
export function usePlaySync() {
  const init = useGameStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
}
