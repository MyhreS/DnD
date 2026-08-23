import { useAgentOnline } from "@/workshop/hooks/useAgentOnline";
import type { AgentState } from "@/workshop/types";

export function AgentPresence({ state }: { state: AgentState | null }) {
  const online = useAgentOnline(state);
  const activeCount = state?.activeTicketCount ?? state?.activeTicketIds?.length ?? (state?.currentTicketId ? 1 : 0);
  const label = online && activeCount > 0
    ? `${activeCount} agent${activeCount === 1 ? "" : "s"} working`
    : online ? "Agent online" : "Agent offline";
  return (
    <div className={`agent-presence ${online ? "is-online" : "is-offline"}`} data-testid="agent-presence" role="status" aria-live="polite" aria-label={label}>
      <span aria-hidden />
      <div>
        <strong>{label}</strong>
        {!online && <small>Requests stay queued and resume automatically.</small>}
      </div>
    </div>
  );
}
