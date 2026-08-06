import { TicketStatus } from "@/workshop/components/TicketStatus";
import type { WorkshopTicket } from "@/workshop/types";

function relativeTime(timestamp: WorkshopTicket["updatedAt"]): string {
  if (!timestamp) return "Just now";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp.toMillis()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TicketList({ tickets, onSelect }: { tickets: WorkshopTicket[]; onSelect: (id: string) => void }) {
  return (
    <section className="ticket-history" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">History</p>
          <h2 id="history-title">Requests</h2>
        </div>
        <span className="ticket-count">{tickets.length}</span>
      </div>
      {tickets.length === 0 ? (
        <p className="empty-history">No requests yet. The first one will appear here.</p>
      ) : (
        <ol className="ticket-list" data-testid="ticket-list">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button type="button" onClick={() => onSelect(ticket.id)} data-testid={`ticket-${ticket.id}`}>
                <span className="ticket-row-top">
                  <TicketStatus status={ticket.status} />
                  <time>{relativeTime(ticket.updatedAt)}</time>
                </span>
                <strong>{ticket.title}</strong>
                <span className="ticket-meta">{ticket.authorName}{ticket.attachmentCount ? ` · ${ticket.attachmentCount} image${ticket.attachmentCount === 1 ? "" : "s"}` : ""}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
