import { useCallback, useState } from "react";
import { AccessScreen } from "@/workshop/components/AccessScreen";
import { AgentPresence } from "@/workshop/components/AgentPresence";
import { CollaboratorPresence } from "@/workshop/components/CollaboratorPresence";
import { TicketComposer } from "@/workshop/components/TicketComposer";
import { TicketDetail } from "@/workshop/components/TicketDetail";
import { TicketList } from "@/workshop/components/TicketList";
import { useAgentOnline } from "@/workshop/hooks/useAgentOnline";
import { useWorkshopSession } from "@/workshop/hooks/useWorkshopSession";
import { useWorkshopPresence } from "@/workshop/hooks/useWorkshopPresence";
import { useWorkshopTickets } from "@/workshop/hooks/useWorkshopTickets";

export function WorkshopApp() {
  const session = useWorkshopSession();
  const agentOnline = useAgentOnline(session.agentState);
  const ticketBatch = useWorkshopTickets(session.status === "allowed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const presence = useWorkshopPresence(session.user, session.status === "allowed", selectedId);
  const closeSelected = useCallback(() => setSelectedId(null), []);

  if (session.status === "loading") return <main className="loading-screen"><span>Opening Workshop…</span></main>;
  if (session.status === "signed_out" || session.status === "denied") {
    return <AccessScreen mode={session.status} onSignIn={session.signIn} onSignOut={session.signOut} />;
  }
  const selected = ticketBatch.tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const reportedActiveTicketIds = session.agentState?.activeTicketIds ?? [];
  const activeTicketIds = reportedActiveTicketIds.length > 0
    ? reportedActiveTicketIds
    : session.agentState?.currentTicketId ? [session.agentState.currentTicketId] : [];
  const workStateFor = (ticketId: string) => session.agentState?.activeTickets?.[ticketId]
    ?? (session.agentState?.currentTicketId === ticketId ? session.agentState : null);
  return (
    <div className="workshop-app">
      <header className="workshop-header">
        <div className="workshop-wordmark"><span>W</span><div><strong>D&amp;D Workshop</strong><small>Feedback for the game</small></div></div>
        <div className="header-actions">
          <CollaboratorPresence
            people={presence.people}
            currentUid={session.user!.uid}
            currentName={session.user!.displayName || session.user!.email?.split("@")[0] || "You"}
          />
          <AgentPresence state={session.agentState} />
          <button className="account-button" type="button" onClick={() => void session.signOut()} title="Sign out">{session.user?.displayName?.slice(0, 1) || "S"}</button>
        </div>
      </header>
      {(session.error || ticketBatch.error || presence.error) && <div className="global-error" role="alert">{session.error || ticketBatch.error || presence.error}</div>}
      <main className="workshop-grid">
        <TicketComposer uid={session.user!.uid} onCreated={setSelectedId} />
        <TicketList
          tickets={ticketBatch.tickets}
          uid={session.user!.uid}
          hasMore={ticketBatch.hasMore}
          loadingMore={ticketBatch.loadingMore}
          activeTicketIds={activeTicketIds}
          agentState={session.agentState}
          agentOnline={agentOnline}
          onLoadMore={ticketBatch.loadMore}
          onSelect={setSelectedId}
        />
      </main>
      <footer className="workshop-footer">
        <span>Requests stay as a permanent thread. Reply when you want to add or correct something.</span>
      </footer>
      {selectedId && (
        <TicketDetail
          key={selectedId}
          ticketId={selectedId}
          initialTicket={selected}
          uid={session.user!.uid}
          isWorking={activeTicketIds.includes(selectedId)}
          agentState={workStateFor(selectedId)}
          agentOnline={agentOnline}
          people={presence.people}
          onClose={closeSelected}
        />
      )}
    </div>
  );
}
