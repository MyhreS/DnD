import { useCallback, useEffect, useState } from "react";
import { subscribeWorkshopTickets, WORKSHOP_TICKET_PAGE_SIZE } from "@/api/workshop";
import type { WorkshopTicket } from "@/workshop/types";

export function useWorkshopTickets(enabled: boolean) {
  const [visibleLimit, setVisibleLimit] = useState(WORKSHOP_TICKET_PAGE_SIZE);
  const [tickets, setTickets] = useState<WorkshopTicket[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    return subscribeWorkshopTickets(visibleLimit, ({ tickets: next, hasMore: more }) => {
      setTickets(next);
      setHasMore(more);
      setLoadingMore(false);
      setError(null);
    }, (failure) => {
      setError(failure.message);
      setLoadingMore(false);
    });
  }, [enabled, visibleLimit]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setVisibleLimit((current) => current + WORKSHOP_TICKET_PAGE_SIZE);
  }, [hasMore, loadingMore]);

  return { tickets, hasMore, loadingMore, error, loadMore };
}
