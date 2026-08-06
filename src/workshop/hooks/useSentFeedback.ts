import { useEffect, useState } from "react";

export function useSentFeedback(durationMs = 2_500) {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, sent]);

  return { sent, setSent };
}
