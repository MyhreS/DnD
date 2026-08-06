import { useEffect, useRef } from "react";
import { markWorkshopTicketRead } from "@/api/workshop";
import type { WorkshopTicket } from "@/workshop/types";

export function useMarkTicketRead(ticket: WorkshopTicket, uid: string) {
  const updatedAt = ticket.updatedAt?.toMillis() ?? 0;
  const readAt = ticket.readAtBy?.[uid]?.toMillis() ?? 0;
  const requestedAt = useRef(0);

  useEffect(() => {
    if (!updatedAt || readAt >= updatedAt || requestedAt.current >= updatedAt) return;
    requestedAt.current = updatedAt;
    void markWorkshopTicketRead(ticket.id).catch(() => {
      // The unread marker can safely retry the next time this ticket updates or opens.
      requestedAt.current = 0;
    });
  }, [readAt, ticket.id, updatedAt]);
}
