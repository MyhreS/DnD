/** Wrap a live subscription so a single permission-denied error re-attaches
 * once after a short delay instead of failing outright. A listen that starts
 * moments after joining/creating a campaign can be denied while the membership
 * write reaches the rules engine — without a retry the store is stuck on
 * "error" until a full reload. Any second failure (or a non-permission error)
 * is passed to `onFatal`. Returns an unsubscribe that also cancels the retry. */
export function subscribeWithDeniedRetry(
  attach: (onError: (err: unknown) => void) => () => void,
  onFatal: (err: unknown) => void,
  delayMs = 1500,
): () => void {
  let unsub: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  const start = (retried: boolean) => {
    unsub = attach((err) => {
      const denied = (err as { code?: string } | null)?.code === "permission-denied";
      if (denied && !retried && !cancelled) {
        timer = setTimeout(() => {
          if (!cancelled) start(true);
        }, delayMs);
      } else {
        onFatal(err);
      }
    });
  };
  start(false);
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    unsub?.();
  };
}
