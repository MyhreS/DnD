import { WorkActivity } from "@/workshop/components/WorkActivity";
import type { AgentWorkState, WorkshopTicket } from "@/workshop/types";

type TicketActivityProps = {
  placement: "list" | "detail";
  ticket: WorkshopTicket;
  isWorking: boolean;
  workState: AgentWorkState | null;
  agentOnline: boolean;
  now: number;
};

export function TicketActivity({ placement, ticket, isWorking, workState, agentOnline, now }: TicketActivityProps) {
  if (ticket.status === "doing_now" && isWorking) {
    const replySync = ticket.revision > 1 && ticket.claimedRevision
      ? ticket.claimedRevision >= ticket.revision ? "included" : "queued"
      : undefined;
    return <WorkActivity placement={placement} state={workState} online={agentOnline} replySync={replySync} />;
  }
  if (ticket.status !== "not_done" && ticket.status !== "doing_now") return null;

  let title = "Queued for the agent";
  let detail = agentOnline ? "It will start when a worker slot is free." : "It will start automatically when the agent reconnects.";
  if (ticket.status === "doing_now") {
    if (ticket.claimedRevision && ticket.claimedRevision < ticket.revision) {
      title = "Latest reply saved; safe restart pending";
      detail = "The current pass cannot publish without rereading it.";
    } else {
      title = "Work claimed; reconnecting to progress";
      detail = "The lease is protected. If this worker stopped, the request returns to the queue automatically.";
    }
  } else if ((ticket.lastCompletedRevision ?? 0) < ticket.revision) {
    title = "Queued with the latest message";
    detail = "The agent will reread the conversation before continuing.";
  }
  if (ticket.retryAfter && ticket.retryAfter.toMillis() > now) {
    const minutes = Math.max(1, Math.ceil((ticket.retryAfter.toMillis() - now) / 60_000));
    title = `Retry scheduled in ${minutes}m`;
    detail = "No reply is needed; recovery is automatic.";
  }
  return (
    <span className={`queue-activity queue-activity-${placement}`} data-testid={`queue-activity-${placement}`} role={placement === "detail" ? "status" : undefined}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </span>
  );
}
