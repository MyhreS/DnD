import { useCallback, useEffect, useRef, useState } from "react";
import { loadOlderWorkshopMessages, subscribeWorkshopMessages } from "@/api/workshop";
import type { WorkshopMessage } from "@/workshop/types";

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<WorkshopMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const receivedInitialPage = useRef(false);

  useEffect(() => {
    if (!ticketId) return;
    return subscribeWorkshopMessages(ticketId, (page) => {
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        page.messages.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort((left, right) => left.sequence - right.sequence);
      });
      if (!receivedInitialPage.current) {
        setHasOlder(page.hasOlder);
        receivedInitialPage.current = true;
      }
      setLoading(false);
      setError(null);
    }, (failure) => {
      setError(failure.message);
      setLoading(false);
    });
  }, [ticketId]);

  const loadOlder = useCallback(async () => {
    if (!ticketId || !hasOlder || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    setError(null);
    try {
      const page = await loadOlderWorkshopMessages(ticketId, messages[0].sequence);
      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        page.messages.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort((left, right) => left.sequence - right.sequence);
      });
      setHasOlder(page.hasOlder);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not load earlier messages.");
    } finally {
      setLoadingOlder(false);
    }
  }, [hasOlder, loadingOlder, messages, ticketId]);

  return { messages, error, loading, hasOlder, loadingOlder, loadOlder };
}
