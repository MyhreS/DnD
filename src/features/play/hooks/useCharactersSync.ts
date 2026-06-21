import { useEffect } from "react";
import { useCharactersStore } from "../store/charactersStore";

/** Subscribe to all characters + the archive (DM board) while mounted. */
export function useCharactersSync() {
  const sync = useCharactersStore((s) => s.sync);
  const stop = useCharactersStore((s) => s.stop);
  useEffect(() => {
    sync();
    return () => stop();
  }, [sync, stop]);
}
