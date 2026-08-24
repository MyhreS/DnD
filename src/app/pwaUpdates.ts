// Keep the installed PWA / Safari tab fresh.
//
// When a newly-deployed build is detected, leave the current session untouched
// and reveal an update pill instead. Reloading automatically can interrupt
// someone mid-action and, on iOS, may return them to a different screen. We
// still nudge an update check whenever the app regains focus. The player can
// apply it immediately, or the app applies it after a genuinely idle period.
import { registerSW } from "virtual:pwa-register";
import { create } from "zustand";
import { shouldApplyIdleUpdate } from "./pwaUpdatePolicy";

const PWA_UPDATE_LOCATION_KEY = "pwa-update-location";
export const PWA_IDLE_REFRESH_MS = 5 * 60 * 1000;
export const PWA_BACKGROUND_REFRESH_MS = 60 * 1000;
const PWA_IDLE_CHECK_MS = 15 * 1000;

/**
 * iOS can reopen a standalone PWA at its manifest start URL while it applies
 * an update. Remember the current in-app URL so the reload still returns the
 * player to the page they chose.
 */
function rememberLocationForUpdate(): void {
  try {
    sessionStorage.setItem(
      PWA_UPDATE_LOCATION_KEY,
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  } catch {
    // Storage can be unavailable in private browsing. A normal reload still
    // retains its URL, so this is only a best-effort safeguard for iOS PWAs.
  }
}

function restoreLocationAfterUpdate(): void {
  try {
    const savedLocation = sessionStorage.getItem(PWA_UPDATE_LOCATION_KEY);
    sessionStorage.removeItem(PWA_UPDATE_LOCATION_KEY);
    if (!savedLocation) return;

    const savedUrl = new URL(savedLocation, window.location.origin);
    if (savedUrl.origin !== window.location.origin || !savedUrl.pathname.startsWith("/")) return;

    const target = `${savedUrl.pathname}${savedUrl.search}${savedUrl.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (target !== current) window.history.replaceState(window.history.state, "", target);
  } catch {
    // If a stale or invalid saved location cannot be restored, let normal app
    // routing decide where to send the player.
  }
}

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
  // Run before BrowserRouter is created so it sees the page from before the
  // update instead of an iOS PWA's manifest start URL.
  restoreLocationAfterUpdate();

  // One-off cleanup for an earlier build's retired 26MB PDF cache,
  // which can exhaust the small iOS PWA storage quota and white-screen the app
  // on relaunch. We no longer cache it; drop that orphaned cache to free space.
  // Clear the retired document cache once; current source PDFs are never cached.
  if ("caches" in window) caches.delete("handbook-pdf").catch(() => {});
  if (!("serviceWorker" in navigator)) return;

  let swRegistration: ServiceWorkerRegistration | undefined;
  let updateStarted = false;
  let lastActivityAt = Date.now();
  let hiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;

  const applyUpdate = () => {
    if (updateStarted) return;
    updateStarted = true;
    rememberLocationForUpdate();
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
    waiting.addEventListener("statechange", () => {
      if (waiting.state === "activated") reload();
    });
    void updateSW(true);
    window.setTimeout(reload, 3000);
  };

  const noteActivity = () => {
    lastActivityAt = Date.now();
  };
  for (const eventName of ["pointerdown", "keydown", "input", "touchstart", "scroll"] as const) {
    window.addEventListener(eventName, noteActivity, { passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    else {
      const now = Date.now();
      if (usePwaUpdate.getState().needRefresh
        && !updateStarted
        && hiddenAt != null
        && now - hiddenAt >= PWA_BACKGROUND_REFRESH_MS) applyUpdate();
      hiddenAt = null;
      noteActivity();
    }
  });

  window.setInterval(() => {
    if (!usePwaUpdate.getState().needRefresh || updateStarted) return;
    const now = Date.now();
    if (shouldApplyIdleUpdate({
      now,
      lastActivityAt,
      hiddenAt,
      isVisible: document.visibilityState === "visible",
    }, PWA_IDLE_REFRESH_MS, PWA_BACKGROUND_REFRESH_MS)) applyUpdate();
  }, PWA_IDLE_CHECK_MS);

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Active players stay in control. Once the app has been left alone long
      // enough, the idle watcher safely applies the update at the same URL.
      usePwaUpdate.setState({ needRefresh: true });
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

  // Applying the update must *guarantee* a reload. In "prompt" mode updateSW(true)
  // only posts SKIP_WAITING and leaves the reload to the service worker's
  // `controllerchange` event — which iOS standalone PWAs frequently never fire.
  // If the waiting worker has already activated, there's nothing left to
  // message and the call is a silent no-op (the old "tap does nothing" bug). If a
  // worker is still waiting, activate it and reload the moment it reports
  // `activated`; otherwise the new build is already the active worker and a plain
  // reload picks it up.
  usePwaUpdate.setState({
    update: applyUpdate,
  });
}
