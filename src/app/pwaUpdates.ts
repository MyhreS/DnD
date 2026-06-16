// Keep the installed PWA / Safari tab fresh.
//
// When a newly-deployed build is detected we try to update *automatically*
// (activate the new service worker and reload). If that doesn't take within a
// few seconds — e.g. iOS didn't apply it — we reveal a flashing "update
// available" pill in the header so the user can apply it by hand. We also nudge
// an update check whenever the app regains focus, so updates land promptly.
import { registerSW } from "virtual:pwa-register";
import { create } from "zustand";

interface PwaUpdateState {
  /** A newer build is installed and waiting to take over. */
  needRefresh: boolean;
  /** Activate the waiting service worker and reload. */
  update: () => void;
}

export const usePwaUpdate = create<PwaUpdateState>(() => ({
  needRefresh: false,
  update: () => {},
}));

export function setupPwaUpdates(): void {
  // One-off cleanup: an earlier build runtime-cached the 26MB handbook PDF,
  // which can exhaust the small iOS PWA storage quota and white-screen the app
  // on relaunch. We no longer cache it; drop that orphaned cache to free space.
  if ("caches" in window) caches.delete("handbook-pdf").catch(() => {});
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Try to update automatically. updateSW(true) activates the waiting
      // worker and reloads; if we're still here after a few seconds it didn't
      // take, so fall back to the manual pill.
      window.setTimeout(() => usePwaUpdate.setState({ needRefresh: true }), 4000);
      updateSW(true).catch(() => usePwaUpdate.setState({ needRefresh: true }));
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
      window.setInterval(check, 5 * 60 * 1000);
    },
  });

  usePwaUpdate.setState({ update: () => void updateSW(true) });
}
