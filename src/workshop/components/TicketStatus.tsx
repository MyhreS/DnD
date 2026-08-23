import { STATUS_LABELS, type WorkshopTicket, type WorkshopStatus } from "@/workshop/types";

export function TicketStatus({ status, outcome }: { status: WorkshopStatus; outcome?: WorkshopTicket["lastOutcome"] }) {
  const label = status === "finished" && outcome === "answered"
    ? "Answered"
    : status === "finished" && outcome === "finished" ? "Released" : STATUS_LABELS[status];
  return <span className={`ticket-status status-${status}`}>{label}</span>;
}
