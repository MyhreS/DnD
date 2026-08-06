import { MessageAttachment } from "@/workshop/components/MessageAttachment";
import { TicketReply } from "@/workshop/components/TicketReply";
import { TicketStatus } from "@/workshop/components/TicketStatus";
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

export function TicketDetail({ ticket, uid, onClose }: { ticket: WorkshopTicket; uid: string; onClose: () => void }) {
  const { messages, error } = useTicketMessages(ticket.id);
  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <article className="ticket-detail" role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title" data-testid="ticket-detail">
        <header>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close thread">×</button>
          <TicketStatus status={ticket.status} />
          <h2 id="ticket-detail-title">{ticket.title}</h2>
          <p>Updated after every reply · revision {ticket.revision}</p>
        </header>
        <div className="message-list">
          {messages.map((message) => (
            <section className={`thread-message kind-${message.kind}`} key={message.id}>
              <div className="message-heading"><strong>{messageLabel(message)}</strong><time>{messageTime(message)}</time></div>
              <p>{message.body}</p>
              {message.attachments?.length > 0 && <div className="message-images">{message.attachments.map((attachment) => <MessageAttachment key={attachment.path} attachment={attachment} />)}</div>}
              {message.productionUrl && <a className="production-link" href={message.productionUrl} target="_blank" rel="noreferrer">Open the updated app →</a>}
            </section>
          ))}
          {error && <p className="form-error">{error}</p>}
        </div>
        <TicketReply ticketId={ticket.id} uid={uid} />
      </article>
    </div>
  );
}
