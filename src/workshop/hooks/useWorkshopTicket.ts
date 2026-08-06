import { useEffect, useState } from "react";
import { subscribeWorkshopTicket } from "@/api/workshop";
import type { WorkshopTicket } from "@/workshop/types";

export function useWorkshopTicket(ticketId: string, initialTicket: WorkshopTicket | null) {
  const [ticket, setTicket] = useState<WorkshopTicket | null>(initialTicket);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeWorkshopTicket(ticketId, (nextTicket) => {
    setTicket(nextTicket);
    setError(null);
  }, (failure) => setError(failure.message)), [ticketId]);

  return { ticket, error };
}
