import { useState } from "react";
import { usePwaUpdate } from "@/app/pwaUpdates";

/**
 * A flashing strip in the header that only appears when a newer build is
 * installed and waiting. Tapping it activates the new version and reloads.
 * On tap it immediately switches to a steady "Updating…" spinner so the press
 * is obviously registered while the reload is being prepared (which can take a
 * moment on iOS standalone).
 */
export function UpdateBar() {
  const needRefresh = usePwaUpdate((s) => s.needRefresh);
  const update = usePwaUpdate((s) => s.update);
  const [updating, setUpdating] = useState(false);
  if (!needRefresh) return null;
  return (
    <button
      type="button"
      className={`update-bar${updating ? " update-bar-busy" : ""}`}
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
          Updating…
        </>
      ) : (
        "New version available — tap to update ↻"
      )}
    </button>
  );
}
