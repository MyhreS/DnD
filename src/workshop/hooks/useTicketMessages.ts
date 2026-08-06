import { useEffect, useState } from "react";
import { subscribeWorkshopMessages } from "@/api/workshop";
import type { WorkshopMessage } from "@/workshop/types";

export function useTicketMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<WorkshopMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    return subscribeWorkshopMessages(ticketId, setMessages, (failure) => setError(failure.message));
  }, [ticketId]);

  return { messages, error };
}
