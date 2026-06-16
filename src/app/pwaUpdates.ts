// Keep the installed PWA / Safari tab fresh.
//
// The service worker (registerType: "autoUpdate") reloads to the new version
// once it detects one — but detection only happens periodically. We nudge it to
// check whenever the app regains focus (e.g. reopening the home-screen app), so
// updates land promptly instead of showing a stale build.

function check(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((r) => r?.update())
    .catch(() => {
      /* offline / not registered yet — ignore */
    });
}

export function setupPwaUpdates(): void {
  if (!("serviceWorker" in navigator)) return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("focus", check);
  window.setInterval(check, 5 * 60 * 1000);
}

/** Manual "hard refresh": update the SW, drop all caches, reload fresh. */
export async function hardRefresh(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort */
  } finally {
    window.location.reload();
  }
}
