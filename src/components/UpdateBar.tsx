import { usePwaUpdate } from "@/app/pwaUpdates";

/**
 * A flashing strip in the header that only appears when a newer build is
 * installed and waiting. Tapping it activates the new version and reloads.
 */
export function UpdateBar() {
  const needRefresh = usePwaUpdate((s) => s.needRefresh);
  const update = usePwaUpdate((s) => s.update);
  if (!needRefresh) return null;
  return (
    <button type="button" className="update-bar" onClick={update}>
      New version available — tap to update ↻
    </button>
  );
}
