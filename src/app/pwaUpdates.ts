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

  let swRegistration: ServiceWorkerRegistration | undefined;

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
      swRegistration = registration;
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", check);
      window.addEventListener("focus", check);
      window.setInterval(check, 5 * 60 * 1000);
    },
  });

  // Tapping the pill must *guarantee* a reload. In "prompt" mode updateSW(true)
  // only posts SKIP_WAITING and leaves the reload to the service worker's
  // `controllerchange` event — which iOS standalone PWAs frequently never fire.
  // Worse, the auto-attempt above has usually already activated the new worker
  // by the time the pill shows, so there's nothing left "waiting" to message and
  // the call is a silent no-op (this is the "tap does nothing" bug). So: if a
  // worker is still waiting, activate it and reload the moment it reports
  // `activated`; otherwise the new build is already the active worker and a plain
  // reload picks it up.
  usePwaUpdate.setState({
    update: () => {
      const waiting = swRegistration?.waiting;
      if (!waiting) {
        window.location.reload();
        return;
      }
      let reloaded = false;
      const reload = () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      };
      // Reload on the worker's real activation, not a blind timer, so we never
      // reload under the old controller and serve a stale page.
      waiting.addEventListener("statechange", () => {
        if (waiting.state === "activated") reload();
      });
      void updateSW(true); // posts SKIP_WAITING to the waiting worker
      window.setTimeout(reload, 3000); // last-resort backstop if statechange never fires
    },
  });
}
