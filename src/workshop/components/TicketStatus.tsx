import { STATUS_LABELS, type WorkshopStatus } from "@/workshop/types";

export function TicketStatus({ status }: { status: WorkshopStatus }) {
  return <span className={`ticket-status status-${status}`}>{STATUS_LABELS[status]}</span>;
}
