import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";

const BOTTOM_THRESHOLD = 80;

export function useConversationScroll(latestSequence: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const initialLoad = useRef(true);
  const nearBottom = useRef(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const jumpToLatest = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    nearBottom.current = true;
    setHasNewMessage(false);
  }, []);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    nearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < BOTTOM_THRESHOLD;
    if (nearBottom.current) setHasNewMessage(false);
  }, []);

  useEffect(() => {
    if (latestSequence === 0) return;
    const frame = window.requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      if (initialLoad.current || nearBottom.current) {
        list.scrollTop = list.scrollHeight;
        initialLoad.current = false;
        setHasNewMessage(false);
      } else {
        setHasNewMessage(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestSequence]);

  return { listRef, onScroll, hasNewMessage, jumpToLatest };
}
