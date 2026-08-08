import { useState } from "react";
import { usePwaUpdate } from "@/app/pwaUpdates";

/** A passive, app-wide notice. It never interrupts the current screen; the
 * player chooses when to refresh, and receives immediate feedback after tap. */
export function UpdateBar() {
  const needRefresh = usePwaUpdate((s) => s.needRefresh);
  const update = usePwaUpdate((s) => s.update);
  const [updating, setUpdating] = useState(false);
  if (!needRefresh) return null;
  return (
    <button
      type="button"
      className={`update-bar${updating ? " update-bar-busy" : ""}`}
      data-testid="app-update-notice"
      onClick={() => {
        setUpdating(true);
        update();
      }}
      disabled={updating}
      aria-live="polite"
    >
      {updating ? (
        <>
          <span className="btn-spinner" aria-hidden />
          Refreshing…
        </>
      ) : (
        <>
          <span>New update available</span>
          <strong>Refresh</strong>
        </>
      )}
    </button>
  );
}
