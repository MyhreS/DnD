import { useState } from "react";
import { TicketStatus } from "@/workshop/components/TicketStatus";
import { STATUS_LABELS, type WorkshopTicket } from "@/workshop/types";

function relativeTime(timestamp: WorkshopTicket["updatedAt"]): string {
  if (!timestamp) return "Just now";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp.toMillis()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isUnread(ticket: WorkshopTicket, uid: string): boolean {
  const updatedAt = ticket.updatedAt?.toMillis() ?? 0;
  const readAt = ticket.readAtBy?.[uid]?.toMillis() ?? 0;
  return updatedAt > readAt;
}

export function TicketList({ tickets, uid, onSelect }: { tickets: WorkshopTicket[]; uid: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filtered = query
    ? tickets.filter((ticket) => `${ticket.title} ${ticket.authorName} ${STATUS_LABELS[ticket.status]}`.toLocaleLowerCase().includes(query))
    : tickets;

  return (
    <section className="ticket-history" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">History</p>
          <h2 id="history-title">Requests</h2>
        </div>
        <span className="ticket-count" aria-label={`${filtered.length} requests shown`}>{query ? `${filtered.length}/${tickets.length}` : tickets.length}</span>
      </div>
      {tickets.length === 0 ? (
        <p className="empty-history">No requests yet. The first one will appear here.</p>
      ) : (
        <>
          <div className="ticket-search">
            <label className="sr-only" htmlFor="ticket-search">Search requests</label>
            <input id="ticket-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests…" data-testid="ticket-search" />
          </div>
          {filtered.length === 0 ? (
            <p className="empty-history" data-testid="empty-search">No requests match “{search.trim()}”.</p>
          ) : (
            <ol className="ticket-list" data-testid="ticket-list" tabIndex={0} aria-label="Request history">
              {filtered.map((ticket) => {
                const unread = isUnread(ticket, uid);
                return (
                  <li key={ticket.id} className={unread ? "is-unread" : undefined}>
                    <button type="button" onClick={() => onSelect(ticket.id)} data-testid={`ticket-${ticket.id}`} aria-label={`${ticket.title}${unread ? ", unread" : ""}`}>
                      <span className="ticket-row-top">
                        <TicketStatus status={ticket.status} />
                        <span className="ticket-recency">{unread && <span className="unread-dot" aria-hidden />}<time>{relativeTime(ticket.updatedAt)}</time></span>
                      </span>
                      <strong>{ticket.title}</strong>
                      <span className="ticket-meta">{ticket.authorName}{ticket.attachmentCount ? ` · ${ticket.attachmentCount} image${ticket.attachmentCount === 1 ? "" : "s"}` : ""}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
