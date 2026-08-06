import { useEffect, useState } from "react";
import { subscribeWorkshopMessages } from "@/api/workshop";
import type { WorkshopMessage } from "@/workshop/types";

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<WorkshopMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    return subscribeWorkshopMessages(ticketId, (next) => {
      setMessages(next);
      setLoading(false);
      setError(null);
    }, (failure) => {
      setError(failure.message);
      setLoading(false);
    });
  }, [ticketId]);

  return { messages, error, loading };
}
