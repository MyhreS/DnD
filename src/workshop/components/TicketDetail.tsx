import { MessageAttachment } from "@/workshop/components/MessageAttachment";
import { TicketReply } from "@/workshop/components/TicketReply";
import { TicketStatus } from "@/workshop/components/TicketStatus";
import { useConversationScroll } from "@/workshop/hooks/useConversationScroll";
import { useDialogBehavior } from "@/workshop/hooks/useDialogBehavior";
import { useMarkTicketRead } from "@/workshop/hooks/useMarkTicketRead";
import { useTicketMessages } from "@/workshop/hooks/useTicketMessages";
import type { WorkshopMessage, WorkshopTicket } from "@/workshop/types";

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

export function TicketDetail({ ticket, uid, onClose }: { ticket: WorkshopTicket; uid: string; onClose: () => void }) {
  const { messages, error, loading } = useTicketMessages(ticket.id);
  const dialogRef = useDialogBehavior(onClose);
  const { listRef, onScroll, hasNewMessage, jumpToLatest } = useConversationScroll(messages.length);
  useMarkTicketRead(ticket, uid);
  const pickedUp = messages.some((message) => message.kind === "agent");
  const visibleMessages = pickedUp
    ? messages.filter((message) => !(message.kind === "system" && message.sequence === 2))
    : messages;
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <article ref={dialogRef} className="ticket-detail" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title" data-testid="ticket-detail" tabIndex={-1}>
        <header>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close thread">×</button>
          <TicketStatus status={ticket.status} />
          <h2 id="ticket-detail-title">{ticket.title}</h2>
          <p>Every reply stays in this thread.</p>
          {ticket.status === "needs_simon" && <p className="ticket-gate-note">Only Simon’s reply in this thread can restart this task.</p>}
        </header>
        <div className="conversation-frame">
          <div className="message-list" ref={listRef} onScroll={onScroll} data-testid="message-list">
            {loading && <p className="conversation-loading">Opening conversation…</p>}
            {visibleMessages.map((message) => {
              const productionUrl = safeProductionUrl(message.productionUrl);
              return (
                <section className={`thread-message kind-${message.kind}`} key={message.id}>
                  <div className="message-heading"><strong>{messageLabel(message)}</strong><time>{messageTime(message)}</time></div>
                  {message.body && <p>{message.body}</p>}
                  {message.attachments?.length > 0 && <div className="message-images">{message.attachments.map((attachment) => <MessageAttachment key={attachment.path} attachment={attachment} />)}</div>}
                  {productionUrl && <a className="production-link" href={productionUrl} target="_blank" rel="noreferrer">Open the updated app →</a>}
                </section>
              );
            })}
            {error && <p className="form-error" role="alert">Could not load this conversation. Close it and try again.</p>}
          </div>
          {hasNewMessage && <button className="new-message-button" type="button" onClick={jumpToLatest}>New message ↓</button>}
        </div>
        <TicketReply ticketId={ticket.id} uid={uid} />
      </article>
    </div>
  );
}
