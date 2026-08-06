import { useCallback, useState } from "react";
import { AccessScreen } from "@/workshop/components/AccessScreen";
import { AgentPresence } from "@/workshop/components/AgentPresence";
import { TicketComposer } from "@/workshop/components/TicketComposer";
import { TicketDetail } from "@/workshop/components/TicketDetail";
import { TicketList } from "@/workshop/components/TicketList";
import { useWorkshopSession } from "@/workshop/hooks/useWorkshopSession";

export function WorkshopApp() {
  const session = useWorkshopSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeSelected = useCallback(() => setSelectedId(null), []);

  if (session.status === "loading") return <main className="loading-screen"><span>Opening Workshop…</span></main>;
  if (session.status === "signed_out" || session.status === "denied") {
    return <AccessScreen mode={session.status} onSignIn={session.signIn} onSignOut={session.signOut} />;
  }
  const selected = session.tickets.find((ticket) => ticket.id === selectedId) ?? null;
  return (
    <div className="workshop-app">
      <header className="workshop-header">
        <div className="workshop-wordmark"><span>W</span><div><strong>D&amp;D Workshop</strong><small>Feedback for the game</small></div></div>
        <div className="header-actions">
          <AgentPresence state={session.agentState} />
          <button className="account-button" type="button" onClick={() => void session.signOut()} title="Sign out">{session.user?.displayName?.slice(0, 1) || "S"}</button>
        </div>
      </header>
      {session.error && <div className="global-error" role="alert">{session.error}</div>}
      <main className="workshop-grid">
        <TicketComposer uid={session.user!.uid} agentState={session.agentState} onCreated={setSelectedId} />
        <TicketList tickets={session.tickets} uid={session.user!.uid} onSelect={setSelectedId} />
      </main>
      <footer className="workshop-footer">
        <span>Requests stay as a permanent thread. Reply when you want to add or correct something.</span>
      </footer>
      {selected && <TicketDetail key={selected.id} ticket={selected} uid={session.user!.uid} onClose={closeSelected} />}
    </div>
  );
}
