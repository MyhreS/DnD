import { MessageAttachment } from "@/workshop/components/MessageAttachment";
import { MessageBody } from "@/workshop/components/MessageBody";
import { ThreadPresence } from "@/workshop/components/CollaboratorPresence";
import { TicketReply } from "@/workshop/components/TicketReply";
import { TicketStatus } from "@/workshop/components/TicketStatus";
import { WorkActivity } from "@/workshop/components/WorkActivity";
import { useConversationScroll } from "@/workshop/hooks/useConversationScroll";
import { useDialogBehavior } from "@/workshop/hooks/useDialogBehavior";
import { useMarkTicketRead } from "@/workshop/hooks/useMarkTicketRead";
import { useTicketMessages } from "@/workshop/hooks/useTicketMessages";
import { useWorkshopTicket } from "@/workshop/hooks/useWorkshopTicket";
import type { AgentWorkState, WorkshopMessage, WorkshopPresence, WorkshopTicket } from "@/workshop/types";

function messageLabel(message: WorkshopMessage): string {
  if (message.kind === "agent") return "Workshop agent";
  if (message.kind === "system") return "Update";
  return message.authorName;
}

function messageTime(message: WorkshopMessage): string {
  if (!message.createdAt) return "Now";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(message.createdAt.toDate());
}

function safeProductionUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["dandd-ea955.web.app", "dandd-ea955-workshop.web.app"].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

type TicketDetailProps = {
  ticketId: string;
  initialTicket: WorkshopTicket | null;
  uid: string;
  isWorking: boolean;
  agentState: AgentWorkState | null;
  agentOnline: boolean;
  people: WorkshopPresence[];
  onClose: () => void;
};

function isRoutineActivityMessage(message: WorkshopMessage): boolean {
  if (message.kind !== "agent") return false;
  const body = message.body.trim().toLocaleLowerCase().replaceAll("’", "'");
  return body === "i'm working on this now." || body === "i'm working on this now";
}

export function TicketDetail({ ticketId, initialTicket, uid, isWorking, agentState, agentOnline, people, onClose }: TicketDetailProps) {
  const { ticket, error: ticketError } = useWorkshopTicket(ticketId, initialTicket);
  const { messages, error, loading, hasOlder, loadingOlder, loadOlder } = useTicketMessages(ticketId);
  const dialogRef = useDialogBehavior(onClose);
  const latestSequence = messages.at(-1)?.sequence ?? 0;
  const { listRef, onScroll, hasNewMessage, jumpToLatest } = useConversationScroll(latestSequence);
  useMarkTicketRead(ticket, uid);
  const pickedUp = messages.some((message) => message.kind === "agent");
  const visibleMessages = messages.filter((message) => {
    if (isRoutineActivityMessage(message)) return false;
    return !(pickedUp && message.kind === "system" && message.sequence === 2);
  });
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <article ref={dialogRef} className="ticket-detail" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title" data-testid="ticket-detail" tabIndex={-1}>
        <header>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close thread">×</button>
          {ticket && <TicketStatus status={ticket.status} />}
          <h2 id="ticket-detail-title">{ticket?.title ?? "Opening request…"}</h2>
          <p>Every reply stays in this thread.</p>
          <ThreadPresence people={people} currentUid={uid} ticketId={ticketId} />
          {ticket?.status === "needs_simon" && <p className="ticket-gate-note">A reply from any Workshop member can restart this task.</p>}
        </header>
        <div className="conversation-frame">
          <div className="message-list" ref={listRef} onScroll={onScroll} data-testid="message-list">
            {loading && <p className="conversation-loading">Opening conversation…</p>}
            {hasOlder && (
              <button className="page-more-button message-page-button" type="button" onClick={() => void loadOlder()} disabled={loadingOlder} data-testid="load-older-messages">
                {loadingOlder ? "Loading…" : "Show earlier messages"}
              </button>
            )}
            {visibleMessages.map((message) => {
              const productionUrl = safeProductionUrl(message.productionUrl);
              return (
                <section className={`thread-message kind-${message.kind}`} key={message.id}>
                  <div className="message-heading"><strong>{messageLabel(message)}</strong><time>{messageTime(message)}</time></div>
                  {message.body && <MessageBody body={message.body} />}
                  {message.attachments?.length > 0 && <div className="message-images">{message.attachments.map((attachment) => <MessageAttachment key={attachment.path} attachment={attachment} />)}</div>}
                  {productionUrl && <a className="production-link" href={productionUrl} target="_blank" rel="noreferrer">Open the updated app →</a>}
                </section>
              );
            })}
            {(error || ticketError) && <p className="form-error" role="alert">Could not load this conversation. Close it and try again.</p>}
          </div>
          {hasNewMessage && <button className="new-message-button" type="button" onClick={jumpToLatest}>New message ↓</button>}
        </div>
        {isWorking && ticket?.status === "doing_now" && <WorkActivity placement="detail" state={agentState} online={agentOnline} />}
        <TicketReply ticketId={ticketId} uid={uid} />
      </article>
    </div>
  );
}
